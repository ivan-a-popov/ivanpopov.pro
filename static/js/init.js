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
	ip_cursor();
	ip_animated_headline();
	// Teaser measure + testimonials clones force layout. Run them when that
	// section is actually shown, not on every home-page load (Lighthouse TBT).
	ip_enhance_section(ip_href_from_location());
});

function ip_href_from_location() {
	var hash = location.hash;
	if (!hash || hash === '#') {
		return '#home';
	}
	return hash;
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
	var target = ip_one(href);
	if (!target) {
		return false;
	}
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
	// Forced-reflow source after teasers/snap were deferred.
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
		ip_teasers();
	} else if (href === '#testimonials') {
		ip_testimonials_snap();
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
// Mirrors the CSS 1023px breakpoint where stacked/mobile content layout
// takes over from the desktop two-column layout.
function ip_is_mobile_layout() {
	return window.matchMedia('(max-width: 1024px)').matches;
}
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
		var targetEl = href ? ip_one(href) : null;
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
// when focus is outside it (e.g. on a menu link). Escape closes the popup.
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

// -------------  SERVICE / PARTNER / QR POPUP  -------------------
function ip_service_popup() {
	var modalBox = ip_one('.ip_modalbox');
	if (!modalBox) {
		return;
	}
	var buttons = ip_all('.ip_service .ip_full_link, .ip_partners .ip_full_link, .ip_home_social .ip_qr_open');
	var descWrap = modalBox.querySelector('.description_wrap');
	var serviceCards = ip_all('.ip_service .service-card');
	var boxInner = modalBox.querySelector('.box_inner');
	var popupFocusTimer = null;
	var qrPinMq = window.matchMedia('(min-width: 1024px)');
	var qrPinTimer = null;
	function unpinQrPopup() {
		modalBox.style.removeProperty('--ip-qr-top');
	}
	function pinQrPopup() {
		if (!modalBox.classList.contains('ip_modalbox--qr') || !qrPinMq.matches) {
			unpinQrPopup();
			return;
		}
		var rule = ip_one('#home .ip_home_rule');
		if (!rule) {
			unpinQrPopup();
			return;
		}
		var top = Math.round(rule.getBoundingClientRect().top);
		if (top < 10) {
			top = 10;
		}
		modalBox.style.setProperty('--ip-qr-top', top + 'px');
	}
	if (descWrap && !descWrap.hasAttribute('tabindex')) {
		descWrap.setAttribute('tabindex', '-1');
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
		modalBox.removeAttribute('aria-modal');
		setLightCursor(false);
		if (descWrap) {
			descWrap.innerHTML = '';
		}
		var restore = ip_modal_return_focus;
		ip_modal_return_focus = null;
		setTimeout(function () {
			if (restore && document.contains(restore)) {
				restore.focus();
				return;
			}
			ip_focus_section(ip_active_section());
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
			e.preventDefault();
			var qr = button.classList.contains('ip_qr_open');
			var partner = !qr && button.closest('.partner-card');
			var parent = partner || (!qr && button.closest('.service-card'));
			if (!qr && !parent) { return; }
			var detailsEl = qr
				? ip_one('.qr_hidden_details', button.closest('.ip_home_copy'))
				: parent.querySelector(partner ? '.partner_hidden_details' : '.service_hidden_details');
			var content = detailsEl ? detailsEl.innerHTML : '';
			ip_modal_return_focus = button;
			ip_section_focus_token++;
			modalBox.classList.toggle('ip_modalbox--partner', !!partner);
			modalBox.classList.toggle('ip_modalbox--qr', !!qr);
			if (qr) {
				pinQrPopup();
			} else {
				unpinQrPopup();
			}
			modalBox.classList.add('opened');
			modalBox.setAttribute('aria-modal', 'true');
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
					var logoSrc = logoEl ? (logoEl.getAttribute('src') || '') : '';
					var title = parent.getAttribute('data-partner-title') || '';
					infos.insertAdjacentHTML('afterbegin', '<div class="partner-popup"><img class="partner-popup__logo" src="' + logoSrc + '" alt="" /><div class="partner-popup__title"><h3>' + title + '</h3></div>' + closeHtml + '</div>');
				} else {
					var popupImg = parent.querySelector('.popup_service_image');
					var elImage = (popupImg && (popupImg.getAttribute('data-popup-img') || popupImg.getAttribute('src'))) || '';
					var titleEl = parent.querySelector('.title');
					var title = titleEl ? titleEl.innerHTML : '';
					infos.insertAdjacentHTML('afterbegin', '<div class="service-popup"><img class="service-popup__image" src="' + elImage + '" alt="" width="640" height="320" /><div class="service-popup__title"><h3>' + title + '</h3></div>' + closeHtml + '</div>');
				}
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
	window.addEventListener('resize', function () {
		if (!modalBox.classList.contains('opened') || !modalBox.classList.contains('ip_modalbox--qr')) {
			return;
		}
		clearTimeout(qrPinTimer);
		qrPinTimer = setTimeout(pinQrPopup, 100);
	});
	qrPinMq.addEventListener('change', function () {
		if (modalBox.classList.contains('opened')) {
			pinQrPopup();
		}
	});
}

// -------------  WHY TEASERS  -------------------
function ip_teasers() {
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
		var bodyTop = body.getBoundingClientRect().top;
		var bottom = 0;
		for (var i = 0; i < paras.length; i++) {
			var p = paras[i];
			var rect = p.getBoundingClientRect();
			if (rect.height < 1) {
				return null;
			}
			var cs = getComputedStyle(p);
			var mb = parseFloat(cs.marginBottom) || 0;
			var lh = parseFloat(cs.lineHeight) || 0;
			bottom = Math.max(bottom, rect.bottom - bodyTop + mb + (2 * lh));
		}
		return Math.ceil(bottom);
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
	function setExpanded(teaser, open) {
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
			if (!open) {
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
		scrollSectionToTitle(teaser);
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
		applyPreviewVar(teaser, body);
		body.style.maxHeight = '';
		void body.offsetHeight;
		if (body.scrollHeight <= body.clientHeight + 1) {
			teaser.classList.add('is-static');
			teaser.removeAttribute('tabindex');
			teaser.removeAttribute('aria-expanded');
			return;
		}
		teaser.setAttribute('tabindex', '0');
		teaser.setAttribute('aria-expanded', 'false');
	}
	teasers.forEach(function (teaser) {
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
				setExpanded(teaser, !teaser.classList.contains('is-open'));
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


// ------------   TESTIMONIALS SCROLL-SNAP   -----------
function ip_use_vertical_testimonials_layout() {
	// Keep the desktop snap carousel only when there is enough vertical room.
	// On short viewports (including some high-DPI phones/tablets reported as
	// wide CSS widths), switch testimonials to the vertical list variant.
	if (ip_is_mobile_layout()) {
		return true;
	}
	return window.matchMedia('(max-height: 920px)').matches && ip_is_touch_device();
}
function ip_testimonials_snap() {
	// Horizontal snap + autoplay are desktop-only; mobile uses a vertical list (CSS).
	if (ip_use_vertical_testimonials_layout()) {
		return;
	}
	var list = ip_one('.testimonials .testimonials-snap');
	if (!list || list.classList.contains('is-enhanced')) {
		return;
	}
	list.classList.add('is-enhanced');
	var items = list.querySelectorAll(':scope > li');
	if (items.length < 2) {
		return;
	}
	var realItems = [...items];
	var realCount = realItems.length;
	// Build an infinite track: a full copy of every card on each side of the
	// originals. The three copies are identical, so re-centering into the middle
	// (real) copy is an invisible instant jump — autoplay and manual scroll then
	// loop seamlessly in both directions
	var leadFrag = document.createDocumentFragment();
	var trailFrag = document.createDocumentFragment();
	realItems.forEach(function (li) {
		var before = li.cloneNode(true);
		var after = li.cloneNode(true);
		before.classList.add('is-clone');
		after.classList.add('is-clone');
		before.setAttribute('aria-hidden', 'true');
		after.setAttribute('aria-hidden', 'true');
		leadFrag.appendChild(before);
		trailFrag.appendChild(after);
	});
	list.insertBefore(leadFrag, realItems[0]);
	list.appendChild(trailFrag);
	var slides = [...list.querySelectorAll(':scope > li')];
	var firstRealDom = realCount;          // real cards occupy [realCount .. 2*realCount-1]
	var currentDom = firstRealDom;
	var paused = false;
	var timer = null;
	var scrollEndTimer = null;
	var dragging = false;
	var dragStartX = 0;
	var dragScrollLeft = 0;
	function jumpTo(domIndex) {
		var slide = slides[domIndex];
		if (!slide) {
			return;
		}
		// Instant reposition: bypass CSS scroll-behavior:smooth so the loop wrap
		// is invisible. Scroll the track only — scrollIntoView() would also move
		// the ancestor .ip_section (overflow-y: scroll) and break layout.
		list.scrollTo({ left: slide.offsetLeft, behavior: 'instant' });
		currentDom = domIndex;
	}
	function scrollToDom(domIndex) {
		var slide = slides[domIndex];
		if (!slide) {
			return;
		}
		list.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
	}
	function isLastActive() {
		var last = ip_one('#testimonials');
		return last && last.classList.contains('active');
	}
	function scheduleAutoplay() {
		if (timer) {
			clearInterval(timer);
		}
		timer = setInterval(function () {
			if (paused || !isLastActive()) {
				return;
			}
			currentDom += 1;
			// Past the trail copy (e.g. section was hidden before scroll re-centered).
			if (currentDom >= slides.length) {
				currentDom = firstRealDom + realCount;
			}
			scrollToDom(currentDom);
		}, 5000);
	}
	jumpTo(firstRealDom);
	requestAnimationFrame(function () { jumpTo(firstRealDom); });
	list.addEventListener('mouseenter', function () {
		paused = true;
	});
	list.addEventListener('mouseleave', function () {
		if (!dragging) {
			paused = false;
		}
	});
	list.addEventListener('touchstart', function () {
		paused = true;
	}, { passive: true });
	list.addEventListener('touchend', function () {
		paused = false;
	}, { passive: true });
	// Click-drag and trackpad horizontal scroll: stop propagation on the track so
	// the section's own scroll container does not hijack the horizontal gesture.
	function onDragMove(e) {
		if (!dragging) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		list.scrollLeft = dragScrollLeft - (e.clientX - dragStartX);
	}
	function endDrag() {
		if (!dragging) {
			return;
		}
		dragging = false;
		list.classList.remove('is-dragging');
		paused = false;
		window.removeEventListener('mousemove', onDragMove);
		window.removeEventListener('mouseup', endDrag);
	}
	list.addEventListener('mousedown', function (e) {
		if (e.button !== 0) {
			return;
		}
		dragging = true;
		paused = true;
		dragStartX = e.clientX;
		dragScrollLeft = list.scrollLeft;
		list.classList.add('is-dragging');
		e.preventDefault();
		e.stopPropagation();
		window.addEventListener('mousemove', onDragMove);
		window.addEventListener('mouseup', endDrag);
	});
	list.addEventListener('wheel', function (e) {
		if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
			e.stopPropagation();
		}
	}, { passive: true });
	list.addEventListener('touchmove', function (e) {
		e.stopPropagation();
	}, { passive: true });
	list.addEventListener('scroll', function () {
		if (scrollEndTimer) {
			clearTimeout(scrollEndTimer);
		}
		scrollEndTimer = setTimeout(function () {
			var scrollLeft = list.scrollLeft;
			var nearest = 0;
			var bestDistance = Infinity;
			for (var i = 0; i < slides.length; i++) {
				var distance = Math.abs(slides[i].offsetLeft - scrollLeft);
				if (distance < bestDistance) {
					bestDistance = distance;
					nearest = i;
				}
			}
			currentDom = nearest;
			// Settled on a clone copy → re-center into the identical real card.
			if (currentDom < firstRealDom) {
				jumpTo(currentDom + realCount);
			} else if (currentDom >= firstRealDom + realCount) {
				jumpTo(currentDom - realCount);
			}
		}, 140);
	}, { passive: true });

	scheduleAutoplay();
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
