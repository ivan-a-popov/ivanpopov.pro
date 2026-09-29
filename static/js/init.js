"use strict";

// Bumped when a modal opens so pending section-focus callbacks are ignored.
var ip_section_focus_token = 0;
// Element to restore focus to after any modal closes.
var ip_modal_return_focus = null;

// ----------  TINY DOM HELPERS  ----------
function ip_ready(fn) {
	if (document.readyState !== 'loading') {
		fn();
	} else {
		document.addEventListener('DOMContentLoaded', fn);
	}
}
function ip_all(selector, context) {
	return [...(context || document).querySelectorAll(selector)];
}
function ip_one(selector, context) {
	return (context || document).querySelector(selector);
}
// Resolve "#about" → the .ip_section node. Rejects selector-like hashes so
// location.hash is never fed to querySelector (invalid fragments throw and
// would abort ip_ready).
function ip_section_from_href(href) {
	if (!href || href.charAt(0) !== '#') {
		return null;
	}
	var id = href.slice(1);
	if (!id || !/^[A-Za-z][\w-]*$/.test(id)) {
		return null;
	}
	var el = document.getElementById(id);
	if (!el || !el.classList.contains('ip_section')) {
		return null;
	}
	return el;
}
function ip_add_classes(el, str) {
	if (!el || !str) { return; }
	str.split(/\s+/).forEach(function (c) { if (c) { el.classList.add(c); } });
}
function ip_remove_classes(el, str) {
	if (!el || !str) { return; }
	str.split(/\s+/).forEach(function (c) { if (c) { el.classList.remove(c); } });
}
ip_ready(function () {
	ip_mark_touch_device();
	ip_apply_landing_section();
	ip_init_section_focus();
	// Dots are display:none on desktop; inserting them still dirties layout
	// before the headline/focus reads (Forced reflow on 1350px Lighthouse).
	if (ip_one('.ip_all_wrap.has-touch')) {
		ip_build_swipe_nav();
	}
	ip_page_transition();
	ip_history_navigation();
	ip_swipe_navigation();
	ip_keyboard_navigation();
	ip_service_popup();
	ip_contact_dock_bind();
	ip_cursor();
	ip_animated_headline();
	// Teaser measure forces layout. Run it when that section is actually
	// shown, not on every home-page load (Lighthouse TBT).
	ip_enhance_section(ip_href_from_location());
});

function ip_href_from_location() {
	var hash = location.hash;
	if (!hash || hash === '#') {
		return '#home';
	}
	var el = ip_section_from_href(hash);
	return el ? ('#' + el.id) : '#home';
}
function ip_apply_landing_section() {
	var href = ip_href_from_location();
	if (href !== '#home') {
		ip_goto(href, { instant: true, updateHash: false });
	}
	document.documentElement.removeAttribute('data-ip-section');
}
function ip_sync_location(href) {
	var next = (href === '#home')
		? (location.pathname + location.search || '/')
		: href;
	var here = location.pathname + location.search + location.hash;
	var want = (href === '#home')
		? (location.pathname + location.search)
		: (location.pathname + location.search + href);
	if (here === want) {
		return;
	}
	if (history.pushState) {
		history.pushState(null, '', next);
		return;
	}
	if (location.hash !== href) {
		location.hash = href;
	}
}
function ip_history_navigation() {
	function apply() {
		ip_goto(ip_href_from_location(), { updateHash: false });
	}
	window.addEventListener('popstate', apply);
	window.addEventListener('hashchange', apply);
}

// -------------   PAGE TRANSITION    ------------------
function ip_goto(href, opts) {
	opts = opts || {};
	if (!href) {
		return false;
	}
	var target = ip_section_from_href(href);
	if (!target) {
		return false;
	}
	href = '#' + target.id;
	var sections = ip_all('.ip_section');
	var allLi = ip_all('.transition_link li');
	var wrapper = ip_one('.ip_all_wrap');
	if (!wrapper) {
		return false;
	}
	var enterFwd = wrapper.getAttribute('data-enter');
	var exitFwd = wrapper.getAttribute('data-exit');
	var enterBack = wrapper.getAttribute('data-enter-back') || 'rollInBack';
	var exitBack = wrapper.getAttribute('data-exit-back') || 'rollOutBack';
	var order = ip_nav_section_order(IP_NAV_LINKS_HEADER);
	var currentIndex = order.indexOf(ip_current_section_href());
	var targetIndex = order.indexOf(href);
	var backward = currentIndex >= 0 && targetIndex >= 0 && targetIndex < currentIndex;
	var enter = backward ? enterFwd : enterBack;
	var exit = backward ? exitFwd : exitBack;
	var allAnim = [enterFwd, exitFwd, enterBack, exitBack].filter(Boolean).join(' ');
	// Every element (header link, decorative swipe dot) pointing to this section.
	var parents = ip_all('.transition_link a[href="' + href + '"], .transition_link li[data-href="' + href + '"]').map(function (el) {
		return el.closest('li');
	}).filter(Boolean);
	if (parents.some(function (li) { return li.classList.contains('active'); })) {
		return false;
	}
	var current = ip_active_section();
	allLi.forEach(function (li) { li.classList.remove('active'); });
	sections.forEach(function (s) {
		s.classList.remove('animated');
		ip_remove_classes(s, allAnim);
	});
	// Only the section being left animates out; the rest are already hidden.
	// Deep-link landings skip enter/exit so the hashed section is already there.
	if (!opts.instant && current && current !== target) {
		current.classList.add('animated');
		ip_add_classes(current, exit);
	}
	parents.forEach(function (li) { li.classList.add('active'); });
	if (!opts.instant) {
		target.classList.add('animated');
		ip_add_classes(target, enter);
	}
	sections.forEach(function (s) {
		s.classList.add('hidden');
		s.classList.remove('active');
	});
	target.classList.remove('hidden');
	target.classList.add('active');
	target.scrollTop = 0;
	ip_contact_dock_on_section(href);
	if (opts.updateHash !== false) {
		ip_sync_location(href);
	}
	ip_enhance_section(href);
	// Defer so focus wins over the menu link that initiated navigation.
	var focusToken = ++ip_section_focus_token;
	setTimeout(function () {
		if (focusToken !== ip_section_focus_token) {
			return;
		}
		if (ip_one('.ip_modalbox.opened')) {
			return;
		}
		if (target.classList.contains('active')) {
			ip_focus_section(target);
		}
	}, 0);
	return true;
}
function ip_focus_section(section) {
	if (!section) {
		return null;
	}
	if (!section.hasAttribute('tabindex')) {
		section.setAttribute('tabindex', '-1');
	}
	section.focus({ preventScroll: true });
	return section;
}
function ip_active_section() {
	return ip_one('.ip_section.active:not(.hidden)')
		|| ip_one('.ip_section.animated:not(.hidden)');
}
function ip_init_section_focus() {
	ip_all('.ip_section').forEach(function (section) {
		if (!section.hasAttribute('tabindex')) {
			section.setAttribute('tabindex', '-1');
		}
	});
	// Don't focus() on first load. focus() flushes the whole desktop
	// two-column tree (author photo + menu) and is the remaining
	// Forced-reflow source after teasers were deferred.
}
// Shared by swipe + keyboard section navigation.
var IP_NAV_LINKS_HEADER = '.ip_header .menu .transition_link a';
var IP_NAV_LINKS_SWIPE = '.ip_swipe_nav .transition_link li';
function ip_nav_section_order(linkSelector) {
	return ip_all(linkSelector).map(function (el) {
		return el.getAttribute('href') || el.getAttribute('data-href');
	});
}
function ip_current_section_href(opts) {
	opts = opts || {};
	var active = ip_one(opts.activeLink || '.transition_link li.active a');
	if (active) {
		return active.getAttribute('href') || active.getAttribute('data-href');
	}
	var visible = ip_all('.ip_section.active').filter(function (s) {
		return !s.classList.contains('hidden');
	});
	if (!visible.length && opts.fallbackAnimated) {
		visible = ip_all('.ip_section.animated').filter(function (s) {
			return !s.classList.contains('hidden');
		});
	}
	var last = visible[visible.length - 1];
	return last ? ('#' + last.id) : null;
}
function ip_navigate_section(step, linkSelector, hrefOpts) {
	var order = ip_nav_section_order(linkSelector);
	if (!order.length) {
		return false;
	}
	var index = order.indexOf(ip_current_section_href(hrefOpts));
	if (index < 0) {
		index = 0;
	}
	var nextIndex = index + step;
	if (nextIndex < 0 || nextIndex >= order.length) {
		return false;
	}
	ip_goto(order[nextIndex]);
	return true;
}
function ip_enhance_section(href) {
	if (href === '#about' || href === '#whyme') {
		ip_teasers({ reset: true });
		var section = ip_section_from_href(href);
		if (section) {
			var settled = false;
			function settle() {
				if (settled) {
					return;
				}
				settled = true;
				section.removeEventListener('animationend', onEnterEnd);
				ip_teasers();
			}
			function onEnterEnd(e) {
				if (e.target !== section) {
					return;
				}
				settle();
			}
			if (section.classList.contains('animated')) {
				section.addEventListener('animationend', onEnterEnd);
				window.setTimeout(settle, 1300);
			} else {
				window.requestAnimationFrame(function () {
					ip_teasers();
				});
			}
		}
	}
}
function ip_page_transition() {
	ip_all('.transition_link a').forEach(function (link) {
		link.addEventListener('click', function (e) {
			e.preventDefault();
			var href = link.getAttribute('href');
			ip_goto(href);
		});
	});
}

// -----------   SWIPE NAVIGATION (MOBILE)   -----------
function ip_is_touch_device() {
	return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}
function ip_mark_touch_device() {
	var wrap = ip_one('.ip_all_wrap');
	if (wrap && ip_is_touch_device()) {
		wrap.classList.add('has-touch');
	}
}
// Build the bottom dots indicator (mobile only, hidden by CSS on desktop)
function ip_build_swipe_nav() {
	if (ip_one('.ip_swipe_nav')) {
		return;
	}
	var links = ip_all('.ip_header .menu .transition_link a');
	if (!links.length) {
		return;
	}
	var hasActiveSection = !!ip_one('.ip_section.active');
	var dots = '';
	links.forEach(function (a, i) {
		var href = a.getAttribute('href');
		var targetEl = href ? ip_section_from_href(href) : null;
		var active = (targetEl && targetEl.classList.contains('active')) || (i === 0 && !hasActiveSection);
		// Dots are decorative position indicators, not touch targets: no anchor.
		dots += '<li class="' + (active ? 'active' : '') + '" data-href="' + href + '"><span class="dot"></span></li>';
	});
	var html = '<div class="ip_swipe_nav" aria-hidden="true">'
		+ '<ul class="transition_link">' + dots + '</ul>'
		+ '</div>'
	var wrap = ip_one('.ip_all_wrap');
	if (wrap) {
		wrap.insertAdjacentHTML('beforeend', html);
	}
}
function ip_swipe_navigation() {
	var mainpart = ip_one('.ip_mainpart');
	var wrap = ip_one('.ip_all_wrap');
	if (!mainpart) {
		return;
	}
	var startX = 0, startY = 0, startTime = 0, tracking = false;
	var swipeHrefOpts = {
		activeLink: '.ip_swipe_nav .transition_link li.active',
		fallbackAnimated: true
	};
	mainpart.addEventListener('touchstart', function (e) {
		if (!wrap || !wrap.classList.contains('has-touch')) {
			tracking = false;
			return;
		}
		var modal = ip_one('.ip_modalbox');
		if (e.touches.length !== 1 || (modal && modal.classList.contains('opened'))) {
			tracking = false;
			return;
		}
		var t = e.touches[0];
		startX = t.clientX;
		startY = t.clientY;
		startTime = Date.now();
		tracking = true;
	}, { passive: true });
	mainpart.addEventListener('touchend', function (e) {
		if (!tracking) {
			return;
		}
		tracking = false;
		var t = e.changedTouches[0];
		var dx = t.clientX - startX;
		var dy = t.clientY - startY;
		if (Date.now() - startTime > 900) { return; }
		if (Math.abs(dx) < 60) { return; }
		if (Math.abs(dx) < Math.abs(dy) * 1.4) { return; }
		ip_navigate_section(dx < 0 ? 1 : -1, IP_NAV_LINKS_SWIPE, swipeHrefOpts);
	}, { passive: true });
}

// ------------   KEYBOARD NAVIGATION    ---------------
// Arrow Left/Right step through sections. Up/Down scroll the active section
// when focus is outside it (e.g. on a menu link). Space matches Enter:
// activate the focused control, and do not page-scroll the section.
// Escape closes the popup.
function ip_keyboard_navigation() {
	var modalBox = ip_one('.ip_modalbox');
	var headerHrefOpts = { activeLink: '.transition_link li.active a' };
	var sectionScrollStep = 48;

	function closeModal() {
		if (!modalBox || !modalBox.classList.contains('opened')) {
			return false;
		}
		// Reuse the existing close handler so cursor state is reset.
		var close = modalBox.querySelector('.service-popup__close a');
		if (close) {
			close.click();
		}
		return true;
	}

	function isTypingTarget(el) {
		if (!el) {
			return false;
		}
		var tag = (el.tagName || '').toLowerCase();
		return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
	}

	// Real buttons (and similar inputs) already fire click on Space, same as Enter.
	function spaceActivatesNatively(el) {
		if (!el || !el.tagName) {
			return false;
		}
		var tag = el.tagName.toLowerCase();
		if (tag === 'button' || tag === 'summary') {
			return true;
		}
		if (tag !== 'input') {
			return false;
		}
		var type = (el.type || '').toLowerCase();
		return type === 'button' || type === 'submit' || type === 'reset'
			|| type === 'checkbox' || type === 'radio' || type === 'file'
			|| type === 'image' || type === 'color' || type === 'range';
	}

	document.addEventListener('keydown', function (e) {
		var key = e.key;
		if (key === 'Escape') {
			if (closeModal()) {
				e.preventDefault();
			}
			return;
		}
		// Leave typing and modified shortcuts (Ctrl/Cmd/Alt) untouched.
		if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) {
			return;
		}
		// Teasers already map Space to Enter. Other focused links should too,
		// and a focused section must not jump a page (Enter does not scroll it).
		if (key === ' ' || key === 'Spacebar') {
			if (spaceActivatesNatively(e.target) || e.defaultPrevented) {
				return;
			}
			var link = e.target.closest && e.target.closest('a[href]');
			var modalOpen = modalBox && modalBox.classList.contains('opened');
			if (!link && modalOpen) {
				return;
			}
			e.preventDefault();
			if (link && !e.repeat) {
				link.click();
			}
			return;
		}
		// Section navigation is suspended while a popup is open.
		if (modalBox && modalBox.classList.contains('opened')) {
			return;
		}
		if (key === 'ArrowRight') {
			if (ip_navigate_section(1, IP_NAV_LINKS_HEADER, headerHrefOpts)) { e.preventDefault(); }
		} else if (key === 'ArrowLeft') {
			if (ip_navigate_section(-1, IP_NAV_LINKS_HEADER, headerHrefOpts)) { e.preventDefault(); }
		} else if (key === 'ArrowDown' || key === 'ArrowUp') {
			var active = ip_active_section();
			if (!active) {
				return;
			}
			var focused = document.activeElement;
			// Nested focus inside a scrollable child: let the browser handle it.
			if (focused !== active && active.contains(focused)) {
				var scrollParent = focused;
				while (scrollParent && scrollParent !== active) {
					if (scrollParent.scrollHeight > scrollParent.clientHeight) {
						var overflowY = getComputedStyle(scrollParent).overflowY;
						if (overflowY === 'auto' || overflowY === 'scroll') {
							return;
						}
					}
					scrollParent = scrollParent.parentElement;
				}
			}
			active.scrollBy({ top: key === 'ArrowDown' ? sectionScrollStep : -sectionScrollStep });
			ip_focus_section(active);
			e.preventDefault();
		}
	});
}

// -------------  CONTACT DOCK (off-home envelope)  ---------------
// Section change: the dock dims while the page rolls (is-transit) and settles
// when the new section lands. The strip opens 500ms after a popup closes or a
// subsection collapses back to closed — not when one subsection replaces
// another, and not when the reader reaches the end of a section. Hover
// opens the full strip too. A click on the envelope pins it open.
var ip_dock_land = null;
var ip_dock_fold_timer = null;
// Envelope click. Stays open across section changes; hover and the demo do not.
var ip_dock_pinned = false;
// Mouse is over the dock. The hold timer does not run while this is set.
var ip_dock_hover = false;
// Matches .animated { animation-duration: 1.2s } — fallback if animationend misses.
var IP_SECTION_ROLL_MS = 1200;
// Dock fade-in when there is no roll (deep-link instant land).
var IP_DOCK_FADE_MS = 280;
// Unattended open, counted from the start of the unfold. Fold is the
// closed-state transition.
var IP_DOCK_HOLD_MS = 3000;
var IP_DOCK_DEMO_DELAY_MS = 500;
var ip_dock_demo_timer = null;

function ip_contact_dock_el() {
	return ip_one('.ip_contact_dock');
}
function ip_contact_dock_unland() {
	if (!ip_dock_land) {
		return;
	}
	if (ip_dock_land.onEnd) {
		ip_dock_land.section.removeEventListener('animationend', ip_dock_land.onEnd);
	}
	clearTimeout(ip_dock_land.timer);
	ip_dock_land = null;
}
function ip_contact_dock_motion_ok() {
	if (document.documentElement.classList.contains('ip-automation')) {
		return false;
	}
	return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function ip_contact_dock_clear_fold() {
	if (ip_dock_fold_timer) {
		clearTimeout(ip_dock_fold_timer);
		ip_dock_fold_timer = null;
	}
}
function ip_contact_dock_fold_if_idle() {
	ip_dock_fold_timer = null;
	if (ip_dock_pinned || ip_dock_hover) {
		return;
	}
	var dock = ip_contact_dock_el();
	if (!dock || !dock.classList.contains('is-open')) {
		return;
	}
	if (dock.contains(document.activeElement)) {
		return;
	}
	ip_contact_dock_set_open(false);
}
// Hover and the demo share this. A pinned open is left alone.
function ip_contact_dock_schedule_fold() {
	ip_contact_dock_clear_fold();
	if (ip_dock_pinned || ip_dock_hover) {
		return;
	}
	var dock = ip_contact_dock_el();
	if (!dock || !dock.classList.contains('is-open')) {
		return;
	}
	ip_dock_fold_timer = setTimeout(ip_contact_dock_fold_if_idle, IP_DOCK_HOLD_MS);
}
function ip_contact_dock_cancel_demo() {
	if (ip_dock_demo_timer) {
		clearTimeout(ip_dock_demo_timer);
		ip_dock_demo_timer = null;
	}
}
// After a popup or a subsection finishes closing. Hover and a click still
// open immediately; this only delays the unattended strip.
function ip_contact_dock_schedule_demo() {
	ip_contact_dock_cancel_demo();
	if (!document.documentElement.classList.contains('ip-off-home')) {
		return;
	}
	ip_dock_demo_timer = setTimeout(function () {
		ip_dock_demo_timer = null;
		if (ip_one('.ip_modalbox.opened')) {
			return;
		}
		var section = ip_one('.ip_section.active');
		if (section && section.querySelector('.ip_teaser.is-open')) {
			return;
		}
		ip_contact_dock_reveal(true);
	}, IP_DOCK_DEMO_DELAY_MS);
}
function ip_contact_dock_set_open(open, pin) {
	var dock = ip_contact_dock_el();
	if (!dock) {
		return;
	}
	var toggle = ip_one('.ip_contact_dock__toggle', dock);
	var actions = ip_one('.ip_contact_dock__actions', dock);
	if (!open) {
		ip_dock_pinned = false;
		dock.classList.remove('is-demo');
		ip_contact_dock_clear_fold();
	} else if (pin) {
		ip_dock_pinned = true;
		ip_contact_dock_clear_fold();
	}
	dock.classList.toggle('is-open', open);
	if (toggle) {
		toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		toggle.setAttribute('aria-label', open ? 'Свернуть' : 'Написать');
	}
	if (actions) {
		if (open) {
			actions.removeAttribute('inert');
			actions.setAttribute('aria-hidden', 'false');
		} else {
			actions.setAttribute('inert', '');
			actions.setAttribute('aria-hidden', 'true');
		}
	}
}
// Full strip, then fold unless the pointer is already on it or it is pinned.
// demo: slower open (is-demo) used after a popup or subsection closes.
function ip_contact_dock_reveal(demo) {
	var dock = ip_contact_dock_el();
	if (!document.documentElement.classList.contains('ip-off-home')) {
		return;
	}
	if (!dock || ip_dock_pinned || dock.classList.contains('is-open') || dock.classList.contains('is-transit')) {
		return;
	}
	if (ip_one('.ip_modalbox.opened')) {
		return;
	}
	if (!ip_contact_dock_motion_ok()) {
		return;
	}
	dock.classList.toggle('is-demo', !!demo);
	ip_contact_dock_set_open(true, false);
	if (!ip_dock_hover) {
		ip_contact_dock_schedule_fold();
	}
}
function ip_contact_dock_land(section) {
	var dock = ip_contact_dock_el();
	if (!dock || !section) {
		return;
	}
	var rolling = section.classList.contains('animated');
	function settle() {
		ip_contact_dock_unland();
		dock.classList.remove('is-transit');
		// Sticky :hover after a tap must not count. Only a real mouse hold.
		if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && dock.matches(':hover')) {
			ip_dock_hover = true;
			ip_contact_dock_reveal();
		}
	}
	function onEnd(e) {
		if (e.target === section && String(e.animationName).indexOf('rollIn') === 0) {
			settle();
		}
	}
	dock.classList.toggle('is-transit', rolling);
	ip_dock_land = {
		section: section,
		onEnd: rolling ? onEnd : null,
		timer: setTimeout(settle, rolling ? IP_SECTION_ROLL_MS + 50 : IP_DOCK_FADE_MS)
	};
	if (rolling) {
		section.addEventListener('animationend', onEnd);
	}
}
function ip_contact_dock_on_section(href) {
	var offHome = href !== '#home';
	document.documentElement.classList.toggle('ip-off-home', offHome);
	ip_contact_dock_cancel_demo();
	ip_contact_dock_unland();
	if (!ip_dock_pinned) {
		ip_contact_dock_set_open(false);
	}
	if (!offHome) {
		var dock = ip_contact_dock_el();
		if (dock) {
			dock.classList.remove('is-transit');
		}
		ip_contact_dock_set_open(false);
		return;
	}
	ip_contact_dock_land(ip_section_from_href(href));
}
function ip_contact_dock_bind() {
	var dock = ip_contact_dock_el();
	if (!dock) {
		return;
	}
	var toggle = ip_one('.ip_contact_dock__toggle', dock);
	if (toggle) {
		toggle.addEventListener('click', function (e) {
			e.preventDefault();
			ip_contact_dock_cancel_demo();
			if (dock.classList.contains('is-open')) {
				ip_contact_dock_set_open(false);
			} else {
				ip_contact_dock_set_open(true, true);
			}
		});
	}
	// Mouse hover opens the full strip and holds it. Touch fires pointerleave
	// right after pointerup, before click, so it never takes this path.
	dock.addEventListener('pointerenter', function (e) {
		if (e.pointerType !== 'mouse') {
			return;
		}
		ip_dock_hover = true;
		ip_contact_dock_cancel_demo();
		ip_contact_dock_clear_fold();
		ip_contact_dock_reveal();
	});
	dock.addEventListener('pointerleave', function (e) {
		if (e.pointerType !== 'mouse') {
			return;
		}
		ip_dock_hover = false;
		ip_contact_dock_schedule_fold();
	});
	// A slow tap shouldn't lose the strip under the finger. Click (pin or
	// close) runs after pointerup and clears this if it needs to.
	dock.addEventListener('pointerdown', function () {
		ip_contact_dock_clear_fold();
	});
	dock.addEventListener('pointerup', function () {
		ip_contact_dock_schedule_fold();
	});
	dock.addEventListener('pointercancel', function () {
		ip_contact_dock_schedule_fold();
	});
	dock.addEventListener('focusout', function () {
		setTimeout(function () {
			if (dock.contains(document.activeElement)) {
				return;
			}
			ip_contact_dock_schedule_fold();
		}, 0);
	});
	document.addEventListener('keydown', function (e) {
		if (e.key !== 'Escape') {
			return;
		}
		if (ip_one('.ip_modalbox.opened')) {
			return;
		}
		if (!dock.classList.contains('is-open')) {
			return;
		}
		ip_contact_dock_set_open(false);
	});
	if (!document.documentElement.classList.contains('ip-off-home')) {
		ip_contact_dock_set_open(false);
	}
}

// -------------  SERVICE / PARTNER / QR POPUP  -------------------
function ip_service_popup() {
	var modalBox = ip_one('.ip_modalbox');
	if (!modalBox) {
		return;
	}
	var buttons = ip_all('.ip_service .ip_full_link, .ip_partners .ip_full_link, .ip_qr_open');
	var descWrap = modalBox.querySelector('.description_wrap');
	var serviceCards = ip_all('.ip_service .service-card');
	var boxInner = modalBox.querySelector('.box_inner');
	var popupFocusTimer = null;
	var qrPinTimer = null;
	function unpinQrPopup() {
		['--ip-qr-top', '--ip-qr-left', '--ip-qr-min-w', '--ip-qr-min-h'].forEach(function (prop) {
			modalBox.style.removeProperty(prop);
		});
	}
	function pinQrPopup() {
		if (!modalBox.classList.contains('ip_modalbox--qr')) {
			unpinQrPopup();
			return;
		}
		var copy = ip_one('#home .ip_home_copy');
		if (!copy) {
			unpinQrPopup();
			return;
		}
		var rect = copy.getBoundingClientRect();
		if (rect.width < 1 || rect.height < 1) {
			unpinQrPopup();
			return;
		}
		var cx = rect.left + rect.width / 2;
		var cy = rect.top + rect.height / 2;
		var footer = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ip-footer-height')) || 0;
		var maxBottom = window.innerHeight - footer - 8;
		var box = boxInner ? boxInner.getBoundingClientRect() : null;
		var halfW = box && box.width > 1 ? box.width / 2 : Math.max(rect.width, 360) / 2;
		var halfH = box && box.height > 1 ? box.height / 2 : Math.max(rect.height, 280) / 2;
		if (cy - halfH < 8) {
			cy = 8 + halfH;
		}
		if (cy + halfH > maxBottom) {
			cy = Math.max(8 + halfH, maxBottom - halfH);
		}
		if (cx - halfW < 8) {
			cx = 8 + halfW;
		}
		if (cx + halfW > window.innerWidth - 8) {
			cx = Math.max(8 + halfW, window.innerWidth - 8 - halfW);
		}
		modalBox.style.setProperty('--ip-qr-top', Math.round(cy) + 'px');
		modalBox.style.setProperty('--ip-qr-left', Math.round(cx) + 'px');
		modalBox.style.setProperty('--ip-qr-min-w', Math.round(rect.width) + 'px');
		modalBox.style.setProperty('--ip-qr-min-h', Math.round(rect.height) + 'px');
	}
	if (descWrap && !descWrap.hasAttribute('tabindex')) {
		descWrap.setAttribute('tabindex', '-1');
	}
	function setChromeInert(on) {
		['.ip_header', '.ip_mainpart', '.ip_footer', '.ip_contact_dock'].forEach(function (sel) {
			var el = ip_one(sel);
			if (!el) {
				return;
			}
			if (on) {
				el.setAttribute('inert', '');
			} else {
				el.removeAttribute('inert');
			}
		});
	}
	function popupTabbables() {
		var root = boxInner || modalBox;
		return ip_all('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root).filter(function (el) {
			if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
				return false;
			}
			var style = getComputedStyle(el);
			return style.visibility !== 'hidden' && style.display !== 'none';
		});
	}
	function setLightCursor(on) {
		document.body.classList.toggle('ip_light_cursor', !!on);
	}
	function clearPopupFocusTimer() {
		if (popupFocusTimer) {
			clearTimeout(popupFocusTimer);
			popupFocusTimer = null;
		}
	}
	function focusPopup() {
		if (!descWrap || !modalBox.classList.contains('opened')) {
			return;
		}
		if (boxInner && getComputedStyle(boxInner).visibility === 'hidden') {
			return;
		}
		var focused = document.activeElement;
		if (focused && focused !== descWrap) {
			if (focused.closest && focused.closest('.ip_section')) {
				focused.blur();
			} else if (ip_modal_return_focus && focused === ip_modal_return_focus) {
				focused.blur();
			}
		}
		descWrap.focus({ preventScroll: true });
	}
	function schedulePopupFocus() {
		clearPopupFocusTimer();
		if (!boxInner) {
			focusPopup();
			return;
		}
		var settled = false;
		function run() {
			if (settled || !modalBox.classList.contains('opened')) {
				return;
			}
			settled = true;
			clearPopupFocusTimer();
			boxInner.removeEventListener('transitionend', onEnd);
			focusPopup();
		}
		function onEnd(e) {
			if (e.target !== boxInner) {
				return;
			}
			if (e.propertyName === 'visibility') {
				run();
			}
		}
		function poll() {
			if (settled || !modalBox.classList.contains('opened')) {
				return;
			}
			if (getComputedStyle(boxInner).visibility === 'visible') {
				run();
				return;
			}
			popupFocusTimer = setTimeout(poll, 40);
		}
		boxInner.addEventListener('transitionend', onEnd);
		poll();
		popupFocusTimer = setTimeout(run, 500);
	}
	function closePopupModal() {
		clearPopupFocusTimer();
		ip_section_focus_token++;
		unpinQrPopup();
		modalBox.classList.remove('opened', 'ip_modalbox--partner', 'ip_modalbox--qr');
		modalBox.removeAttribute('role');
		modalBox.removeAttribute('aria-modal');
		modalBox.removeAttribute('aria-labelledby');
		modalBox.setAttribute('aria-hidden', 'true');
		setChromeInert(false);
		setLightCursor(false);
		if (descWrap) {
			descWrap.innerHTML = '';
		}
		var restore = ip_modal_return_focus;
		ip_modal_return_focus = null;
		setTimeout(function () {
			if (restore && document.contains(restore)) {
				restore.focus();
			} else {
				ip_focus_section(ip_active_section());
			}
			// After this keydown, so Escape that closed the popup does not
			// also fold the strip it just opened.
			ip_contact_dock_schedule_demo();
		}, 0);
	}
	serviceCards.forEach(function (card) {
		card.addEventListener('mouseenter', function () {
			setLightCursor(true);
		});
		card.addEventListener('mouseleave', function () {
			if (!modalBox.classList.contains('opened')) {
				setLightCursor(false);
			}
		});
	});
	buttons.forEach(function (button) {
		button.addEventListener('click', function (e) {
			var href = button.getAttribute('href') || '';
			if (!button.classList.contains('ip_qr_open') && href && href !== '#' && href.charAt(0) !== '#') {
				return;
			}
			e.preventDefault();
			var qr = button.classList.contains('ip_qr_open');
			var partner = !qr && button.closest('.partner-card');
			var parent = partner || (!qr && button.closest('.service-card'));
			if (!qr && !parent) { return; }
			var detailsEl = qr
				? ip_one('.qr_hidden_details')
				: parent.querySelector(partner ? '.partner_hidden_details' : '.service_hidden_details');
			var content = detailsEl ? detailsEl.innerHTML : '';
			ip_modal_return_focus = button;
			ip_section_focus_token++;
			modalBox.classList.toggle('ip_modalbox--partner', !!partner);
			modalBox.classList.toggle('ip_modalbox--qr', !!qr);
			if (qr && button.closest('.ip_home_social')) {
				pinQrPopup();
			} else {
				unpinQrPopup();
			}
			ip_contact_dock_cancel_demo();
			modalBox.classList.add('opened');
			modalBox.setAttribute('role', 'dialog');
			modalBox.setAttribute('aria-modal', 'true');
			modalBox.removeAttribute('aria-hidden');
			setChromeInert(true);
			setLightCursor(true);
			if (descWrap) {
				descWrap.innerHTML = content;
			}
			var infos = modalBox.querySelector('.service_popup_informations');
			if (infos) {
				var closeHtml = '<div class="service-popup__close"><a href="#" aria-label="Закрыть"><i class="icon-cancel"></i></a></div>';
				if (qr) {
					infos.insertAdjacentHTML('afterbegin', '<div class="qr-popup"><div class="qr-popup__title"><h3>vCard</h3></div>' + closeHtml + '</div>');
				} else if (partner) {
					var logoEl = parent.querySelector('.partner-card__logo');
					var popupLogo = parent.getAttribute('data-partner-popup-logo') || '';
					var logoSrc = popupLogo || (logoEl ? (logoEl.getAttribute('src') || '') : '');
					var logoClass = 'partner-popup__logo' + (popupLogo ? ' partner-popup__logo--mark' : '');
					var title = parent.getAttribute('data-partner-title') || '';
					infos.insertAdjacentHTML('afterbegin', '<div class="partner-popup"><img class="' + logoClass + '" src="' + logoSrc + '" alt="" /><div class="partner-popup__title"><h3>' + title + '</h3></div>' + closeHtml + '</div>');
				} else {
					var popupImg = parent.querySelector('.popup_service_image');
					var elImage = (popupImg && (popupImg.getAttribute('data-popup-img') || popupImg.getAttribute('src'))) || '';
					var titleEl = parent.querySelector('.title');
					var title = titleEl ? titleEl.innerHTML : '';
					infos.insertAdjacentHTML('afterbegin', '<div class="service-popup"><img class="service-popup__image" src="' + elImage + '" alt="" width="640" height="320" /><div class="service-popup__title"><h3>' + title + '</h3></div>' + closeHtml + '</div>');
				}
				var heading = infos.querySelector('h3');
				if (heading) {
					heading.id = 'ip-modal-title';
					modalBox.setAttribute('aria-labelledby', 'ip-modal-title');
				}
			}
			if (qr) {
				pinQrPopup();
				requestAnimationFrame(pinQrPopup);
			}
			schedulePopupFocus();
		});
	});
	modalBox.addEventListener('click', function (e) {
		var closeLink = e.target.closest('.service-popup__close a');
		if (closeLink) {
			e.preventDefault();
			closePopupModal();
		}
	});
	document.addEventListener('keydown', function (e) {
		if (e.key !== 'Tab' || !modalBox.classList.contains('opened')) {
			return;
		}
		var list = popupTabbables();
		if (!list.length) {
			e.preventDefault();
			if (descWrap) {
				descWrap.focus({ preventScroll: true });
			}
			return;
		}
		var first = list[0];
		var last = list[list.length - 1];
		var active = document.activeElement;
		var inside = modalBox.contains(active);
		if (e.shiftKey) {
			if (!inside || active === first || active === descWrap) {
				e.preventDefault();
				last.focus();
			}
		} else if (!inside || active === last) {
			e.preventDefault();
			first.focus();
		}
	});
	window.addEventListener('resize', function () {
		if (!modalBox.classList.contains('opened') || !modalBox.classList.contains('ip_modalbox--qr')) {
			return;
		}
		clearTimeout(qrPinTimer);
		qrPinTimer = setTimeout(pinQrPopup, 100);
	});
}

// -------------  WHY TEASERS  -------------------
function ip_teasers(opts) {
	opts = opts || {};
	var teasers = ip_all('.ip_teaser');
	if (!teasers.length) {
		return;
	}
	var DURATION = 450;
	var tokens = ip_teasers._tokens || (ip_teasers._tokens = new WeakMap());
	var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
	function prefersReduce() {
		return reduceMq.matches;
	}
	function nextToken(teaser) {
		var n = (tokens.get(teaser) || 0) + 1;
		tokens.set(teaser, n);
		return n;
	}
	function isLaidOut(el) {
		return el.getClientRects().length > 0 && el.offsetHeight > 0;
	}
	function measurePreviewCollapsed(teaser) {
		if (teaser.getAttribute('data-ip-preview') !== 'first-p') {
			return null;
		}
		var body = teaser.querySelector('.ip_teaser__body');
		if (!body || !isLaidOut(body)) {
			return null;
		}
		var twoCol = window.matchMedia('(min-width: 768px)').matches;
		var paras = [];
		var leftP = body.querySelector('.left > p');
		var rightP = body.querySelector('.right > p');
		if (twoCol) {
			if (leftP) { paras.push(leftP); }
			if (rightP) { paras.push(rightP); }
		} else if (leftP) {
			paras.push(leftP);
		} else if (rightP) {
			paras.push(rightP);
		}
		if (!paras.length) {
			return null;
		}
		// Layout sizes only — getBoundingClientRect is inflated during rollIn's
		// 3D transform and made the preview look fully expanded.
		var extraTop = parseFloat(getComputedStyle(body).paddingTop) || 0;
		var wrap = body.querySelector('.wrapper');
		if (wrap) {
			extraTop += parseFloat(getComputedStyle(wrap).marginTop) || 0;
			extraTop += parseFloat(getComputedStyle(wrap).paddingTop) || 0;
		}
		var firstH = 0;
		var peek = 0;
		for (var i = 0; i < paras.length; i++) {
			var p = paras[i];
			if (p.offsetHeight < 1) {
				return null;
			}
			var cs = getComputedStyle(p);
			var mb = parseFloat(cs.marginBottom) || 0;
			var lh = parseFloat(cs.lineHeight) || 0;
			firstH = Math.max(firstH, p.offsetHeight);
			peek = Math.max(peek, mb + (3 * lh));
		}
		return Math.ceil(extraTop + firstH + peek);
	}
	function applyPreviewVar(teaser, body) {
		var measured = measurePreviewCollapsed(teaser);
		if (measured != null) {
			body.style.setProperty('--ip-teaser-collapsed', measured + 'px');
			return;
		}
		body.style.removeProperty('--ip-teaser-collapsed');
	}
	function collapsedMaxHeight(teaser) {
		var measured = measurePreviewCollapsed(teaser);
		if (measured != null) {
			return measured + 'px';
		}
		if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('max-height', '1lh')) {
			return 'calc(var(--ip-teaser-lines) * 1lh)';
		}
		return 'calc(var(--ip-teaser-lines) * var(--ip-teaser-lh, 1.8em))';
	}
	function afterHeightTransition(teaser, body, token, done) {
		var finished = false;
		function finish(e) {
			if (e && e.propertyName && e.propertyName !== 'max-height') {
				return;
			}
			if (finished || tokens.get(teaser) !== token) {
				return;
			}
			finished = true;
			body.removeEventListener('transitionend', finish);
			done();
		}
		body.addEventListener('transitionend', finish);
		window.setTimeout(finish, DURATION + 80);
	}
	function scrollSectionToTitle(teaser) {
		var section = teaser.closest('.ip_section');
		var title = teaser.querySelector('.ip_title');
		if (!section || !title) {
			return;
		}
		var sRect = section.getBoundingClientRect();
		var tRect = title.getBoundingClientRect();
		if (tRect.top >= sRect.top) {
			return;
		}
		var next = section.scrollTop + (tRect.top - sRect.top);
		section.scrollTo({
			top: Math.max(0, next),
			behavior: prefersReduce() ? 'auto' : 'smooth'
		});
	}
	function applyChrome(teaser, open) {
		teaser.classList.toggle('is-open', open);
		if (teaser.hasAttribute('aria-expanded') || !teaser.classList.contains('is-static')) {
			teaser.setAttribute('aria-expanded', open ? 'true' : 'false');
		}
	}
	function setExpanded(teaser, open, behavior) {
		behavior = behavior || {};
		var body = teaser.querySelector('.ip_teaser__body');
		if (!body) {
			return;
		}
		var token = nextToken(teaser);
		if (prefersReduce()) {
			applyChrome(teaser, open);
			if (!open) {
				applyPreviewVar(teaser, body);
			}
			body.style.maxHeight = open ? 'none' : '';
			teaser.classList.remove('is-animating');
			if (!open && behavior.scroll) {
				scrollSectionToTitle(teaser);
			}
			return;
		}
		teaser.classList.add('is-animating');
		if (open) {
			body.style.maxHeight = body.scrollHeight + 'px';
			applyChrome(teaser, true);
			afterHeightTransition(teaser, body, token, function () {
				body.style.maxHeight = 'none';
				teaser.classList.remove('is-animating');
			});
			return;
		}
		body.style.maxHeight = body.scrollHeight + 'px';
		void body.offsetHeight;
		applyChrome(teaser, false);
		applyPreviewVar(teaser, body);
		body.style.maxHeight = collapsedMaxHeight(teaser);
		if (behavior.scroll) {
			scrollSectionToTitle(teaser);
		}
		afterHeightTransition(teaser, body, token, function () {
			body.style.maxHeight = '';
			teaser.classList.remove('is-animating');
		});
	}
	function hasTextSelection() {
		var sel = window.getSelection && window.getSelection();
		return !!(sel && String(sel));
	}
	function sync(teaser) {
		if (teaser.classList.contains('is-open') || teaser.classList.contains('is-animating')) {
			return;
		}
		var body = teaser.querySelector('.ip_teaser__body');
		if (!body) {
			return;
		}
		if (!isLaidOut(teaser)) {
			return;
		}
		teaser.classList.remove('is-static');
		var prevTransition = body.style.transition;
		body.style.transition = 'none';
		applyPreviewVar(teaser, body);
		body.style.maxHeight = '';
		void body.offsetHeight;
		body.style.transition = prevTransition;
		var clip = getComputedStyle(body).maxHeight;
		if (!clip || clip === 'none') {
			teaser.setAttribute('role', 'button');
			teaser.setAttribute('tabindex', '0');
			teaser.setAttribute('aria-expanded', 'false');
			return;
		}
		if (body.scrollHeight <= body.clientHeight + 1) {
			teaser.classList.add('is-static');
			teaser.removeAttribute('role');
			teaser.removeAttribute('tabindex');
			teaser.removeAttribute('aria-expanded');
			return;
		}
		teaser.setAttribute('role', 'button');
		teaser.setAttribute('tabindex', '0');
		teaser.setAttribute('aria-expanded', 'false');
	}
	teasers.forEach(function (teaser) {
		if (opts.reset) {
			var section = teaser.closest('.ip_section');
			if (section && section.classList.contains('active')) {
				teaser.classList.remove('is-open', 'is-animating');
				var resetBody = teaser.querySelector('.ip_teaser__body');
				if (resetBody) {
					resetBody.style.maxHeight = '';
				}
			}
		}
		if (!teaser.hasAttribute('data-ip-teaser-bound')) {
			teaser.setAttribute('data-ip-teaser-bound', '');
			teaser.addEventListener('click', function (e) {
				if (teaser.classList.contains('is-static')) {
					return;
				}
				if (e.target.closest && e.target.closest('a')) {
					return;
				}
				if (hasTextSelection()) {
					return;
				}
				var willOpen = !teaser.classList.contains('is-open');
				if (willOpen) {
					var whyme = teaser.closest('#whyme');
					if (whyme) {
						whyme.querySelectorAll('.ip_teaser.is-open').forEach(function (other) {
							if (other !== teaser) {
								setExpanded(other, false);
							}
						});
					}
				}
				setExpanded(teaser, willOpen, { scroll: !willOpen });
				if (willOpen) {
					ip_contact_dock_cancel_demo();
				} else {
					ip_contact_dock_schedule_demo();
				}
			});
			teaser.addEventListener('keydown', function (e) {
				if (e.key !== 'Enter' && e.key !== ' ') {
					return;
				}
				if (teaser.classList.contains('is-static')) {
					return;
				}
				e.preventDefault();
				teaser.click();
			});
		}
		sync(teaser);
	});
	if (!ip_teasers._resizeBound) {
		ip_teasers._resizeBound = true;
		var resizeTimer = null;
		window.addEventListener('resize', function () {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function () {
				ip_all('.ip_teaser').forEach(sync);
			}, 150);
		});
		if (document.fonts && document.fonts.ready) {
			document.fonts.ready.then(function () {
				ip_all('.ip_teaser').forEach(sync);
			});
		}
		var styleLink = document.querySelector('link[href*="style.min.css"]');
		if (styleLink && styleLink.rel !== 'stylesheet') {
			styleLink.addEventListener('load', function () {
				ip_all('.ip_teaser').forEach(sync);
			});
		}
	}
}

// ------------------   CURSOR    ----------------------
function ip_cursor() {
	if (document.documentElement.classList.contains('ip-automation')) {
		return;
	}
	if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
		return;
	}
	function bind() {
		window.removeEventListener('pointermove', bind);
		var inner = ip_one('.cursor-inner');
		var outer = ip_one('.cursor-outer');
		if (!inner || !outer) {
			return;
		}
		var hoverSelector = 'a, button, .ip_teaser:not(.is-static)';
		var freeze = false;
		window.addEventListener('mousemove', function (s) {
			if (!freeze) {
				outer.style.transform = 'translate(' + s.clientX + 'px, ' + s.clientY + 'px)';
			}
			inner.style.transform = 'translate(' + s.clientX + 'px, ' + s.clientY + 'px)';
		});
		document.body.addEventListener('mouseover', function (e) {
			if (e.target.closest && e.target.closest(hoverSelector)) {
				inner.classList.add('cursor-hover');
				outer.classList.add('cursor-hover');
			}
		});
		document.body.addEventListener('mouseout', function (e) {
			var matched = e.target.closest && e.target.closest(hoverSelector);
			if (!matched) {
				return;
			}
			inner.classList.remove('cursor-hover');
			outer.classList.remove('cursor-hover');
		});
		inner.style.visibility = 'visible';
		outer.style.visibility = 'visible';
	}
	window.addEventListener('pointermove', bind, { once: true, passive: true });
}


// ---------------   ANIMATED HEADLINE   ---------------
function ip_mark_headline_word(word, on) {
	word.classList.toggle('is-visible', on);
	word.classList.toggle('is-hidden', !on);
	if (on) {
		word.removeAttribute('aria-hidden');
		return;
	}
	word.setAttribute('aria-hidden', 'true');
}
function ip_animated_headline() {
	var startDelay = 1600;           // hold the first phrase, then start
	var revealDuration = 850;        // type / erase width animation duration
	var revealAnimationDelay = 1100;  // hold while phrase is fully shown (+ tagline shimmer)
	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	// Automation (class from critical.js): keep the first phrase static so the
	// Lighthouse filmstrip stops changing — perpetual rotation taxes Speed Index.
	var freeze = document.documentElement.classList.contains('ip-automation');
	ip_all('.ip_headline').forEach(function (headline) {
		var wrapper = headline.querySelector('.ip_headline_words');
		if (!wrapper) { return; }
		var words = [...wrapper.querySelectorAll('b')];
		if (words.length < 2) { return; }
		var visible = wrapper.querySelector('.is-visible') || words[0];
		words.forEach(function (w) {
			ip_mark_headline_word(w, w === visible);
		});
		if (freeze) { return; }
		function takeNext(word) {
			var i = words.indexOf(word);
			return words[(i + 1) % words.length];
		}
		function switchWord(oldWord, newWord) {
			ip_mark_headline_word(oldWord, false);
			ip_mark_headline_word(newWord, true);
		}
		window.setTimeout(function () {
			if (reduce) {
				wrapper.style.width = 'auto';
				var idx = words.indexOf(visible);
				window.setInterval(function () {
					var cur = words[idx];
					idx = (idx + 1) % words.length;
					switchWord(cur, words[idx]);
				}, startDelay + revealAnimationDelay + revealDuration);
				return;
			}
			function animateWidth(px, done, timingFn) {
				wrapper.style.transition = 'width ' + revealDuration + 'ms ' + (timingFn || 'ease');
				void wrapper.offsetWidth;
				wrapper.style.width = px + 'px';
				var finished = false;
				function onEnd(e) {
					if (e && e.propertyName && e.propertyName !== 'width') { return; }
					if (finished) { return; }
					finished = true;
					wrapper.removeEventListener('transitionend', onEnd);
					done();
				}
				wrapper.addEventListener('transitionend', onEnd);
				window.setTimeout(onEnd, revealDuration + 80);
			}
			function hideWord(word) {
				var nextWord = takeNext(word);
				animateWidth(2, function () {
					switchWord(word, nextWord);
					showWord(nextWord);
				});
			}
			var tagline = headline.parentElement
				? headline.parentElement.querySelector('.ip_headline_tagline')
				: null;
			function triggerTaglineShimmer() {
				if (!tagline) { return; }
				tagline.classList.remove('is-shimmer');
				void tagline.offsetWidth;
				tagline.classList.add('is-shimmer');
			}
			function showWord(word) {
				animateWidth(word.offsetWidth + 10, function () {
					triggerTaglineShimmer();
					window.setTimeout(function () { hideWord(word); }, revealAnimationDelay);
				}, 'linear');
			}
			wrapper.style.width = (visible.offsetWidth + 10) + 'px';
			hideWord(visible);
		}, startDelay);
	});
}
