#!/usr/bin/env python3
"""Minify CSS/JS, inject critical assets into index.html, and cache-bust.

CSS: drop comments, collapse whitespace, strip spaces around { } ; : , >
while leaving calc()/clamp() +/- spaces and quoted urls intact.

JS: tokenize (comments, strings, regex vs division), drop comments, emit
tokens with spaces only when needed, and insert a semicolon where a
newline in the source would have triggered ASI. No renaming.

Run with no arguments from the site root (or any cwd — the script cds to
its own directory). Edit the sources (critical.*, style.css, init.js),
not the generated index.html blocks or *.min.* files.
"""
from __future__ import annotations

import hashlib
import os
import re
import sys
from pathlib import Path

OPS = (
    "...", ">>>=", "===", "!==", ">>>", "<<=", ">>=", "**=", "&&=", "||=", "??=",
    "**", "&&", "||", "??", "==", "!=", "<=", ">=", "++", "--", "<<", ">>",
    "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "=>", "?.",
)
OPS = tuple(sorted(OPS, key=len, reverse=True))

PREFIX_KW = {
    "return", "throw", "delete", "void", "typeof", "new", "yield", "await",
    "case", "else", "do", "var", "let", "const", "function", "class",
    "in", "instanceof", "of", "extends",
}
RESTRICT_KW = {"return", "throw", "break", "continue"}
REGEX_KW = PREFIX_KW | {"else", "do"}
CONTROL_KW = {"if", "for", "while", "with", "catch", "switch", "function"}
AFTER_BRACE = {"else", "catch", "finally", "while"}
BINARY = {
    "+", "-", "*", "/", "%", "&", "|", "^", "?", ":", ",", ".",
    "=", "<", ">", "**", "&&", "||", "??", "==", "!=", "<=", ">=",
    "<<", ">>", ">>>", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=",
    "**=", "&&=", "||=", "??=", "=>", "?.", "...",
}


class Tok:
    __slots__ = ("kind", "value", "nl_before", "paren")

    def __init__(self, kind: str, value: str, nl_before: bool = False, paren: str = ""):
        self.kind = kind
        self.value = value
        self.nl_before = nl_before
        self.paren = paren


def _read_string(src: str, i: int) -> tuple[str, int]:
    q = src[i]
    n = len(src)
    j = i + 1
    while j < n:
        c = src[j]
        if c == "\\":
            j += 2
            continue
        if c == q:
            return src[i : j + 1], j + 1
        if c == "\n" and q != "`":
            return src[i:j], j
        j += 1
    return src[i:], n


def _read_regex(src: str, i: int) -> tuple[str, int]:
    n = len(src)
    j = i + 1
    in_class = False
    while j < n:
        c = src[j]
        if c == "\\":
            j += 2
            continue
        if c == "[" and not in_class:
            in_class = True
            j += 1
            continue
        if c == "]" and in_class:
            in_class = False
            j += 1
            continue
        if c == "/" and not in_class:
            j += 1
            while j < n and src[j] in "gimsuyvd":
                j += 1
            return src[i:j], j
        if c == "\n":
            break
        j += 1
    return "/", i + 1


def _read_number(src: str, i: int) -> tuple[str, int]:
    n = len(src)
    j = i
    if src.startswith(("0x", "0X"), j):
        j += 2
        while j < n and src[j] in "0123456789abcdefABCDEF":
            j += 1
        return src[i:j], j
    if src[j] == ".":
        j += 1
        while j < n and src[j].isdigit():
            j += 1
    else:
        while j < n and src[j].isdigit():
            j += 1
        if j < n and src[j] == ".":
            j += 1
            while j < n and src[j].isdigit():
                j += 1
    if j < n and src[j] in "eE":
        j += 1
        if j < n and src[j] in "+-":
            j += 1
        while j < n and src[j].isdigit():
            j += 1
    return src[i:j], j


def _slash_is_regex(prev: Tok | None) -> bool:
    if prev is None:
        return True
    if prev.kind == "punct":
        if prev.value in (")", "]", "++", "--"):
            return False
        return True
    if prev.kind == "ident":
        return prev.value in REGEX_KW
    return False


def tokenize_js(src: str) -> list[Tok]:
    tokens: list[Tok] = []
    i, n = 0, len(src)
    pending_nl = False
    paren_stack: list[str] = []

    def emit(kind: str, value: str, paren: str = "") -> Tok:
        nonlocal pending_nl
        tok = Tok(kind, value, pending_nl, paren)
        pending_nl = False
        tokens.append(tok)
        return tok

    while i < n:
        c = src[i]
        if c in " \t\r\n":
            if c == "\n" or c == "\r":
                pending_nl = True
            i += 1
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            j = src.find("\n", i + 2)
            if j < 0:
                break
            pending_nl = True
            i = j + 1
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            j = src.find("*/", i + 2)
            if j < 0:
                break
            if "\n" in src[i:j]:
                pending_nl = True
            i = j + 2
            continue
        if c in "'\"" or c == "`":
            s, i = _read_string(src, i)
            emit("string", s)
            continue
        if c == "/" and _slash_is_regex(tokens[-1] if tokens else None):
            s, i = _read_regex(src, i)
            emit("regex", s)
            continue
        if c.isdigit() or (c == "." and i + 1 < n and src[i + 1].isdigit()):
            s, i = _read_number(src, i)
            emit("number", s)
            continue
        if c.isalpha() or c in "_$":
            j = i + 1
            while j < n and (src[j].isalnum() or src[j] in "_$"):
                j += 1
            emit("ident", src[i:j])
            i = j
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "=":
            emit("punct", "/=")
            i += 2
            continue
        matched = None
        for op in OPS:
            if src.startswith(op, i):
                matched = op
                break
        if matched:
            emit("punct", matched)
            i += len(matched)
            continue
        if c == "(":
            prev = tokens[-1] if tokens else None
            kind = "group"
            if prev and prev.kind == "ident" and prev.value in CONTROL_KW:
                kind = "control" if prev.value != "function" else "function"
            paren_stack.append(kind)
            emit("punct", "(")
            i += 1
            continue
        if c == ")":
            kind = paren_stack.pop() if paren_stack else "group"
            emit("punct", ")", kind)
            i += 1
            continue
        emit("punct", c)
        i += 1
    return tokens


def _is_word(tok: Tok) -> bool:
    return tok.kind in ("ident", "number")


def _needs_space(a: Tok, b: Tok) -> bool:
    if _is_word(a) and _is_word(b):
        return True
    if a.kind == "punct" and b.kind == "punct":
        if a.value == "+" and b.value.startswith("+"):
            return True
        if a.value == "-" and b.value.startswith("-"):
            return True
        if a.value == "/" and b.value.startswith("/"):
            return True
    if a.kind == "punct" and a.value == "/" and b.kind == "regex":
        return True
    return False


def _can_continue(a: Tok, b: Tok) -> bool:
    if a.kind == "punct":
        if a.value in "{;,":
            return True
        if a.value in ("(", "[", *BINARY):
            return True
        if a.value == ")":
            if b.kind == "punct" and (
                b.value in ("{", "=>", ".", "[", "(", ",", ";", ")", "]", "}", "++", "--")
                or b.value in BINARY
            ):
                return True
            if a.paren in ("control", "function") and (
                b.kind == "ident" or (b.kind == "punct" and b.value in ("{", "=>"))
            ):
                return True
            return False
        if a.value == "}":
            return True
        if a.value == "]":
            return b.kind == "punct" and (
                b.value in ("(", "[", ".", "?.", "++", "--", ",", ";", ")", "]", "}")
                or b.value in BINARY
            )
        if a.value in ("++", "--"):
            return b.kind == "punct" and (
                b.value in (")", "]", "}", ",", ";") or b.value in BINARY
            )
        return False
    if a.kind == "ident" and a.value in PREFIX_KW:
        return True
    if a.kind in ("ident", "number", "string", "regex"):
        if b.kind != "punct":
            return False
        return b.value in (
            "(", "[", ".", "?.", "++", "--", ",", ";", ")", "]", "}", "=>", "?", ":"
        ) or b.value in BINARY
    return False


def minify_js(src: str) -> str:
    tokens = tokenize_js(src)
    out: list[str] = []
    prev: Tok | None = None
    for tok in tokens:
        if prev is not None:
            if tok.nl_before:
                if prev.kind == "ident" and prev.value in RESTRICT_KW:
                    if not (tok.kind == "punct" and tok.value in ";}"):
                        out.append(";")
                        prev = Tok("punct", ";")
                elif tok.kind == "punct" and tok.value in ("++", "--"):
                    if prev.kind in ("ident", "number", "string", "regex") or (
                        prev.kind == "punct" and prev.value in (")", "]")
                    ):
                        out.append(";")
                        prev = Tok("punct", ";")
                if prev.kind == "punct" and prev.value == ";" and tok.kind == "punct" and tok.value == ";":
                    pass
                elif not _can_continue(prev, tok):
                    if not (prev.kind == "punct" and prev.value in "{};"):
                        out.append(";")
                        prev = Tok("punct", ";")
                    if _needs_space(prev, tok):
                        out.append(" ")
                elif _needs_space(prev, tok):
                    out.append(" ")
            elif _needs_space(prev, tok):
                out.append(" ")
        out.append(tok.value)
        prev = tok
    return "".join(out)


def minify_css(src: str) -> str:
    parts: list[str] = []
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
            if not parts or parts[-1] != " ":
                parts.append(" ")
            continue
        if c in "'\"":
            s, i = _read_string(src, i)
            parts.append(s)
            continue
        if c.isspace():
            if not parts or parts[-1] != " ":
                parts.append(" ")
            i += 1
            while i < n and src[i].isspace():
                i += 1
            continue
        parts.append(c)
        i += 1

    s = "".join(parts)
    out: list[str] = []
    i, n = 0, len(s)
    eat = set("{};:,>")
    while i < n:
        c = s[i]
        if c in "'\"":
            q, i = _read_string(s, i)
            out.append(q)
            continue
        if c == " " and i + 1 < n and s[i + 1] in eat:
            i += 1
            continue
        if c in eat:
            out.append(c)
            i += 1
            while i < n and s[i] == " ":
                i += 1
            continue
        out.append(c)
        i += 1

    result: list[str] = []
    i = 0
    body = "".join(out)
    n = len(body)
    in_str = ""
    while i < n:
        c = body[i]
        if in_str:
            result.append(c)
            if c == "\\" and i + 1 < n:
                result.append(body[i + 1])
                i += 2
                continue
            if c == in_str:
                in_str = ""
            i += 1
            continue
        if c in "'\"":
            in_str = c
            result.append(c)
            i += 1
            continue
        if c == ";" and i + 1 < n and body[i + 1] == "}":
            i += 1
            continue
        result.append(c)
        i += 1
    return "".join(result).strip()


def _core(tokens: list[Tok]) -> list[tuple[str, str]]:
    return [(t.kind, t.value) for t in tokens if not (t.kind == "punct" and t.value == ";")]


def minify_js_checked(path: Path) -> str:
    src = path.read_text(encoding="utf-8")
    mini = minify_js(src)
    orig = _core(tokenize_js(src))
    got = _core(tokenize_js(mini))
    if orig != got:
        for i, (a, b) in enumerate(zip(orig, got)):
            if a != b:
                raise SystemExit(f"{path}: token {i} {a!r} -> {b!r}")
        raise SystemExit(f"{path}: token count {len(orig)} -> {len(got)}")
    if not mini.strip():
        raise SystemExit(f"{path}: empty minify")
    return mini


def _require(path: Path) -> Path:
    if not path.is_file():
        raise SystemExit(f"error: {path} not found")
    return path


def _inject(html: str, start: str, end: str, open_tag: str, close_tag: str, body: str) -> str:
    i = html.find(start)
    j = html.find(end)
    if i < 0 or j < 0 or j < i:
        raise SystemExit(f"error: {start} / {end} markers not found in index.html")
    return f"{html[: i + len(start)]}\n{open_tag}\n{body}\n{close_tag}\n\t{html[j:]}"


_ASSET_RE = re.compile(r'(?:href|src)="(static/[^"?]+\.(?:css|js))')


def _stamp(html: str) -> str:
    assets = sorted(set(_ASSET_RE.findall(html)))
    for asset in assets:
        path = Path(asset)
        if not path.is_file():
            print(f"skip (missing): {asset}", file=sys.stderr)
            continue
        digest = hashlib.md5(path.read_bytes()).hexdigest()[:8]
        html = re.sub(re.escape(asset) + r"(?:\?v=[0-9a-f]+)?", f"{asset}?v={digest}", html)
        print(f"stamped {asset} -> ?v={digest}")
    return html


def build() -> None:
    html_path = _require(Path("index.html"))
    critical_css = _require(Path("static/css/critical.css"))
    critical_js = _require(Path("static/js/critical.js"))
    style = _require(Path("static/css/style.css"))
    init = _require(Path("static/js/init.js"))
    style_min = Path("static/css/style.min.css")
    init_min = Path("static/js/init.min.js")

    min_css = minify_css(critical_css.read_text(encoding="utf-8"))
    min_js = minify_js_checked(critical_js)
    min_init = minify_js_checked(init)

    html = html_path.read_text(encoding="utf-8")
    html = _inject(html, "<!-- CRITICAL CSS -->", "<!-- /CRITICAL CSS -->", "<style>", "</style>", min_css)
    print(f"injected {critical_css} into {html_path} ({len(min_css.encode())} bytes minified)")
    html = _inject(html, "<!-- CRITICAL JS -->", "<!-- /CRITICAL JS -->", "<script>", "</script>", min_js)
    print(f"injected {critical_js} into {html_path} ({len(min_js.encode())} bytes minified)")

    style_min.write_text(minify_css(style.read_text(encoding="utf-8")) + "\n", encoding="utf-8")
    init_min.write_text(min_init + "\n", encoding="utf-8")
    print(f"wrote {style_min} ({style_min.stat().st_size} bytes)")
    print(f"wrote {init_min} ({init_min.stat().st_size} bytes)")

    html = html.replace('href="static/css/style.css', 'href="static/css/style.min.css')
    html = html.replace('src="static/js/init.js', 'src="static/js/init.min.js')
    html_path.write_text(_stamp(html), encoding="utf-8")


def main() -> None:
    if len(sys.argv) > 1:
        sys.exit("usage: minify.py")
    os.chdir(Path(__file__).resolve().parent)
    build()


if __name__ == "__main__":
    main()
