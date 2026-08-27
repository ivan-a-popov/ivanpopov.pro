# Fade-out teasers for `#why`

Goal: keep only the first few lines of each advantage article visible, fade the rest, and expand **in place** on click. That leaves room for one or two more similar blocks without turning the section into a wall of prose.

Decided: expand inline, not the service popup. `#why` articles are sequential arguments, not parallel offers. The popup’s scan-as-index win is already delivered by the teaser itself. Reusing `.ip_modalbox` would also mean generalizing `ip_service_popup()` (it still injects a hero image) and adding an imageless header variant. The markup below is shaped so a popup can be added later if `#why` grows past four articles.

## Markup

Keep the title **outside** the clamped box so `overflow: hidden` does not clip the hairline rule, and so the heading stays readable.

```html
<article class="ip_teaser">
  <div class="ip_title">
    <h2>Опыт</h2>
  </div>
  <div class="ip_teaser__body" id="why-experience-body">
    <div class="wrapper">
      <div class="left">…</div>
      <div class="right">…</div>
    </div>
  </div>
  <button type="button" class="ip_teaser__more"
          aria-expanded="false" aria-controls="why-experience-body">
    <span class="ip_teaser__more-label">Читать дальше</span>
  </button>
</article>
```

Same pattern for **Суперсила**, with `ip_title--right` kept on that heading.

Two constraints:

- Clamp with `max-height`, never `display: none`. Crawlers and screen readers still get the full copy.
- Use a real `<button>`, not the service-card `<a class="ip_full_link" href="#">`. This toggles; it does not navigate.

Hook the open/close label swap off the button text (or `data-label-open="Свернуть"`), not a second hidden node.

Current `#why` markup lives in `index.html` around the `<!-- WHY ME -->` block (`#why`, titles `Опыт` / `Суперсила`).

## CSS

Append to the `ABOUT / WHY` block in `static/css/style.css` (after the `.ip_title` / `.ip_info` rules).

```css
.ip_teaser__body{
	--ip-teaser-lines: 5;
	position: relative;
	overflow: hidden;
	max-height: calc(var(--ip-teaser-lines) * 1.7em);
	transition: max-height .45s ease;
}
@supports (max-height: 1lh){
	.ip_teaser__body{ max-height: calc(var(--ip-teaser-lines) * 1lh); }
}
.ip_teaser__body::after{
	content: "";
	position: absolute;
	inset: auto 0 0;
	height: 3em;
	background: linear-gradient(to bottom, transparent, var(--bg-color));
	pointer-events: none;
	transition: opacity .3s ease;
}
.ip_teaser.is-open .ip_teaser__body{ max-height: none; }
.ip_teaser.is-open .ip_teaser__body::after{ opacity: 0; }
.ip_teaser.is-static .ip_teaser__body{ max-height: none; }
.ip_teaser.is-static .ip_teaser__body::after,
.ip_teaser.is-static .ip_teaser__more{ display: none; }
@media (prefers-reduced-motion: reduce){
	.ip_teaser__body, .ip_teaser__body::after{ transition: none; }
}
```

Notes:

- Fade to `var(--bg-color)` (`body` in `critical.css`). One rule covers light and dark schemes.
- `1.7em` matches body `line-height: 1.7`. It approximates line count: `.ip_info .left p` also has `margin-bottom: 15px`, so five *lines of height* is closer to four lines of type plus a gap.
- Desktop `.ip_info .wrapper` is two columns from `768px`, so a 5-line clamp shows ~5 lines **per column** (~10 lines of prose) vs ~5 on mobile. Prefer `--ip-teaser-lines: 6` below `768px` and `4` above it.
- Style `.ip_teaser__more` as a quiet text control under the fade, not a second card. Match existing link colour (`var(--text-main)` / underline / `--accent`).

## JS

New `ip_teasers()` in `static/js/init.js`, registered in the `ip_ready` list after `ip_service_popup()`.

`max-height` cannot animate to `none`. Open path:

1. Set `max-height` to the measured `scrollHeight` in px.
2. On `transitionend` (with a `setTimeout` fallback, same pattern as `ip_animated_headline`), release to `none`.

Close path:

1. Re-apply the measured pixel height.
2. Force a reflow (`void el.offsetHeight`).
3. Then set the collapsed `calc(...)` so the collapse has a start value.

Releasing to `none` after open matters: a later font swap or resize must not cap an open article at a stale px height.

Also:

- `sync()`: if `scrollHeight <= clientHeight`, add `.is-static` and drop the button. Re-run on debounced `resize` and on `document.fonts.ready` (layout reflows at `768px`; Onest swaps over the metric-matched fallback).
- On collapse, scroll the **section** (`#why`) so the article’s title is back in view. Do not use `scrollIntoView()` on the article — that can also move ancestor scrollers.
- Toggle `aria-expanded` on the button. Swap the visible label between «Читать дальше» and «Свернуть».
- Keyboard: Enter / Space come for free on `<button>`.

### Interactions already safe

- `ip_keyboard_navigation()` walks ancestors looking for `overflowY: auto|scroll`. `.ip_teaser__body` is `overflow: hidden`, so Arrow Up/Down keep scrolling the section.
- `ip_swipe_navigation()` needs 60px horizontal travel exceeding vertical by 1.4×. Reading inside an expanded article will not swipe sections.

### Gaps to close in the same pass

- `ip_cursor()` hardcodes `hoverSelector = 'a'`. Widen to `'a, button'` so the magic cursor reacts to `.ip_teaser__more` (and `.ip_qr_panel__close`, which has the same miss today).
- Extend the `<noscript>` CSS in `index.html` with `.ip_teaser__body{max-height:none!important}` plus hiding the fade and the button. With JS off, the clamp would otherwise trap the copy behind an inert control.
- `ip_goto()` sets `target.scrollTop = 0` but should **not** reset teaser open state. Leave articles open across section hops.

## Order of work

1. Markup wrap for the existing two `#why` articles (keep current copy; do not invent extra advantage blocks yet).
2. CSS clamp / fade / open / static / reduced-motion.
3. `ip_teasers()` + cursor selector + `<noscript>`.
4. `./stamp-cache.sh && rsync …` (workspace rule).
5. Verify at ~375 / 768 / 1440 px, plus `prefers-reduced-motion`, keyboard-only, and JS-disabled (or the noscript CSS by inspection).

## Later (out of scope here)

- One or two extra advantage articles once the teaser is in.
- Promoting the same pattern to a popup if `#why` grows past four articles.
- `#about` / empty «В частном» — out of scope.
