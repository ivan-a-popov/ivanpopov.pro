// Register jQuery touch listeners as non-passive so plugins like TESTIMONIALS SCROLL-SNAP
// can call preventDefault() during horizontal swipes without Chrome firing the
// "Unable to preventDefault inside passive event listener" intervention.
(function(jq){
	"use strict";
	if (!jq || !jq.event || !jq.event.special) {
		return;
	}
	// Feature-detect the passive option; bail out on legacy browsers.
	var supportsPassive = false;
	try {
		var opts = Object.defineProperty({}, 'passive', {
			get: function(){ supportsPassive = true; }
		});
		window.addEventListener('test-passive', null, opts);
		window.removeEventListener('test-passive', null, opts);
	} catch (e) {}
	if (!supportsPassive) {
		return;
	}
	jq.each(['touchstart', 'touchmove'], function(_, type){
		jq.event.special[type] = {
			setup: function(_data, _ns, handle){
				this.addEventListener(type, handle, { passive: false });
			}
		};
	});
})(window.jQuery);

jQuery(document).ready(function(){

	"use strict";
	
	// here all ready functions
	
	ivan_popov_modalbox();
	ivan_popov_nicescroll();
	ivan_popov_build_swipe_nav();
	ivan_popov_page_transition();
	ivan_popov_trigger_menu();
	ivan_popov_swipe_navigation();
	ivan_popov_keyboard_navigation();
	ivan_popov_service_popup();
	ivan_popov_cursor();
	ivan_popov_imgtosvg();
	ivan_popov_data_images();
	ivan_popov_testimonials_snap();
	hashtag();
	ivan_popov_bind_nav_mode();
	ivan_popov_preloader();
	
});

// -----------------------------------------------------
// --------------------   MODALBOX    ------------------
// -----------------------------------------------------

function ivan_popov_modalbox(){
	"use strict";
}

// -----------------------------------------------------
// -----------------   NICESCROLL   --------------------
// -----------------------------------------------------

var ivan_popov_nicescroll_section = null;
var ivan_popov_nicescroll_section_el = null;
var ivan_popov_nicescroll_modal = null;
var ivan_popov_nicescroll_modal_el = null;

function ivan_popov_nicescroll_options(){
	return {
		cursorcolor: '#999',
		cursorwidth: '5px',
		cursorborder: '0',
		cursorborderradius: '4px',
		scrollspeed: 60,
		mousescrollstep: 40,
		autohidemode: true,
		horizrailenabled: false,
		hwacceleration: false,
		preservenativescrolling: false,
		nativeparentscrolling: false
	};
}

function ivan_popov_nicescroll_is_mobile(){
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
}

function ivan_popov_nicescroll_visible_section(){
	var $active = jQuery('.ivan_popov_section.active');
	if ($active.length) {
		return $active;
	}
	return jQuery('.ivan_popov_section.animated').not('.hidden').first();
}

function ivan_popov_nicescroll_get_instance($element){
	var ns = $element.data('__nicescroll');
	if (!ns) {
		return null;
	}
	if (ns.name === 'nicescrollarray' && ns.length) {
		return ns[0];
	}
	return ns.rail ? ns : null;
}

function ivan_popov_nicescroll_sync_rail($element){
	var ns = ivan_popov_nicescroll_get_instance($element);
	if (!ns || !ns.rail) {
		return;
	}

	ns.resize();

	if (ns.rail.parent()[0] !== document.body) {
		jQuery(document.body).append(ns.rail);
	}

	var offset = $element.offset();
	ns.rail.css({
		top: offset.top,
		left: offset.left + $element.outerWidth() - ns.rail.outerWidth(),
		height: $element.innerHeight()
	});

	if (ns.noticeCursor) {
		ns.noticeCursor();
	}
}

function ivan_popov_nicescroll_bind_scroll($element){
	$element.off('scroll.nicescroll').on('scroll.nicescroll', function(){
		var ns = ivan_popov_nicescroll_get_instance($element);
		if (ns && ns.onscroll) {
			ns.onscroll();
		}
	});
}

function ivan_popov_nicescroll_remove_instance(instance, $element){
	if ($element) {
		$element.off('scroll.nicescroll');
	}
	if (instance && instance.remove) {
		instance.remove();
	}
}

function ivan_popov_nicescroll_bind_section($section){
	if (!$section || !$section.length || !jQuery.fn.niceScroll || ivan_popov_nicescroll_is_mobile()) {
		return;
	}

	if ($section.is('#contact')) {
		ivan_popov_nicescroll_remove_instance(ivan_popov_nicescroll_section, ivan_popov_nicescroll_section_el);
		ivan_popov_nicescroll_section = null;
		ivan_popov_nicescroll_section_el = null;
		return;
	}

	ivan_popov_nicescroll_remove_instance(ivan_popov_nicescroll_section, ivan_popov_nicescroll_section_el);
	ivan_popov_nicescroll_section = null;
	ivan_popov_nicescroll_section_el = null;

	ivan_popov_nicescroll_section = $section.niceScroll(ivan_popov_nicescroll_options());
	ivan_popov_nicescroll_section_el = $section;
	ivan_popov_nicescroll_bind_scroll($section);
	ivan_popov_nicescroll_sync_rail($section);
}

function ivan_popov_nicescroll_bind_modal($wrap){
	if (!$wrap || !$wrap.length || !jQuery.fn.niceScroll || ivan_popov_nicescroll_is_mobile()) {
		return;
	}

	ivan_popov_nicescroll_remove_instance(ivan_popov_nicescroll_modal, ivan_popov_nicescroll_modal_el);
	ivan_popov_nicescroll_modal = null;
	ivan_popov_nicescroll_modal_el = null;

	ivan_popov_nicescroll_modal = $wrap.niceScroll(ivan_popov_nicescroll_options());
	ivan_popov_nicescroll_modal_el = $wrap;
	ivan_popov_nicescroll_bind_scroll($wrap);
	ivan_popov_nicescroll_sync_rail($wrap);
}

function ivan_popov_nicescroll(){
	
	"use strict";

	if (!jQuery.fn.niceScroll || ivan_popov_nicescroll_is_mobile()) {
		return;
	}

	ivan_popov_nicescroll_bind_section(ivan_popov_nicescroll_visible_section());

	jQuery(window).off('resize.nicescroll').on('resize.nicescroll', function(){
		var $section = ivan_popov_nicescroll_visible_section();
		if ($section.length) {
			ivan_popov_nicescroll_sync_rail($section);
		}
	});
}

function ivan_popov_nicescroll_resize($elements){
	
	"use strict";

	if (!jQuery.fn.getNiceScroll) {
		return;
	}

	$elements.each(function(){
		var $element = jQuery(this);
		if ($element.hasClass('ivan_popov_section')) {
			ivan_popov_nicescroll_bind_section($element);
			return;
		}
		if ($element.hasClass('description_wrap')) {
			ivan_popov_nicescroll_bind_modal($element);
		}
	});
}

// -----------------------------------------------------
// -------------   PAGE TRANSITION    ------------------
// -----------------------------------------------------

// Shared navigation: switch to a section by its href (e.g. "#about").
// Used by the header/mobile menus, the swipe dots and the touch swipe handler,
// so every entry point keeps the section state and all menus in sync.
function ivan_popov_goto(href){

	"use strict";

	if(!href){
		return false;
	}

	var $target		= jQuery(href);
	if(!$target.length){
		return false;
	}

	var section		= jQuery('.ivan_popov_section');
	var allLi		= jQuery('.transition_link li');
	var wrapper		= jQuery('.ivan_popov_all_wrap');
	var enter		= wrapper.data('enter');
	var exit		= wrapper.data('exit');
	// Every link (header, mobile menu, swipe dots) that points to this section.
	var parents		= jQuery('.transition_link a[href="'+href+'"]').closest('li');

	if(parents.filter('.active').length){
		return false;
	}

	allLi.removeClass('active');
	wrapper.find(section).removeClass('animated '+enter);
	if(wrapper.hasClass('opened')){
		wrapper.find(section).addClass('animated '+exit);
	}
	parents.addClass('active');
	wrapper.addClass('opened');
	wrapper.find($target).removeClass('animated '+exit).addClass('animated '+enter);
	section.addClass('hidden');
	$target.removeClass('hidden').addClass('active');
	setTimeout(function(){
		ivan_popov_nicescroll_bind_section($target);
	}, 1050);

	// Testimonials become a vertical list on mobile: hint that it scrolls.
	if(href === '#how'){
		ivan_popov_flash_hint('.ivan_popov_scroll_hint', 'ivan_popov_scroll_hint');
	}

	return true;
}

function ivan_popov_page_transition(){
	
	"use strict";
	
	var button			= jQuery('.transition_link a');
	
	button.on('click',function(){
		var element 	= jQuery(this);
		var href		= element.attr('href');
		ivan_popov_goto(href);
		if(element.parent().hasClass('ivan_popov_button')){
			hashtag();
		}
		return false;
	});
}

// -----------------------------------------------------
// ---------------   TRIGGER MENU    -------------------
// -----------------------------------------------------

function ivan_popov_trigger_menu(){
	
	"use strict";

	var hamburger 		= jQuery('.ivan_popov_topbar .trigger .hamburger');
	var mobileMenu		= jQuery('.ivan_popov_mobile_menu');
	var mobileMenuList	= jQuery('.ivan_popov_mobile_menu .menu_list ul li a');

	hamburger.on('click',function(){
		var element 	= jQuery(this);

		if(element.hasClass('is-active')){
			element.removeClass('is-active');
			mobileMenu.removeClass('opened');
		}else{
			element.addClass('is-active');
			mobileMenu.addClass('opened');
		}
		return false;
	});
	
	mobileMenuList.on('click',function(){
		jQuery('.ivan_popov_topbar .trigger .hamburger').removeClass('is-active');
		mobileMenu.removeClass('opened');
		return false;
	});
}

// -----------------------------------------------------
// -----------   NAV MODE (HEADER VS COMPACT)   --------
// -----------------------------------------------------

var ivan_popov_nav_mode_timer = null;

// True when the header menu no longer fits and the hamburger layout is active.
function ivan_popov_is_nav_compact(){

	"use strict";

	return jQuery('.ivan_popov_all_wrap').hasClass('nav-compact');
}

// Measure whether every header item fits beside the logo; toggle .nav-compact.
function ivan_popov_update_nav_mode(){

	"use strict";

	var wrap = document.querySelector('.ivan_popov_all_wrap');
	var header = document.querySelector('.ivan_popov_header');
	if(!wrap || !header){
		return;
	}

	var menu = header.querySelector('.menu');
	var logo = header.querySelector('.logo');
	var menuList = menu ? menu.querySelector('ul') : null;
	if(!menu || !logo || !menuList){
		return;
	}

	var wasCompact = wrap.classList.contains('nav-compact');

	wrap.classList.add('nav-measuring');
	wrap.classList.remove('nav-compact');

	var requiredWidth = menuList.scrollWidth;
	var available = menu.clientWidth;
	var fits = requiredWidth <= available;

	wrap.classList.remove('nav-measuring');
	wrap.classList.toggle('nav-compact', !fits);

	if(wasCompact && fits){
		jQuery('.ivan_popov_topbar .trigger .hamburger').removeClass('is-active');
		jQuery('.ivan_popov_mobile_menu').removeClass('opened');
	}

	if(fits){
		var ccc = jQuery(header).find('.menu .ccc');
		var el = jQuery(header).find('.menu .active a');
		if(ccc.length && el.length && typeof currentLink === 'function'){
			currentLink(ccc, el);
		}
	}
}

function ivan_popov_schedule_nav_mode(){

	"use strict";

	window.clearTimeout(ivan_popov_nav_mode_timer);
	ivan_popov_nav_mode_timer = window.setTimeout(ivan_popov_update_nav_mode, 0);
}

function ivan_popov_bind_nav_mode(){

	"use strict";

	jQuery(window).on('resize', function(){
		window.clearTimeout(ivan_popov_nav_mode_timer);
		ivan_popov_nav_mode_timer = window.setTimeout(ivan_popov_update_nav_mode, 120);
	});

	jQuery(window).on('load', ivan_popov_schedule_nav_mode);

	if(document.readyState === 'complete'){
		ivan_popov_schedule_nav_mode();
	}

	if(document.fonts && document.fonts.ready){
		document.fonts.ready.then(ivan_popov_schedule_nav_mode);
	}

	var header = document.querySelector('.ivan_popov_header');
	if(header && window.ResizeObserver){
		var observer = new ResizeObserver(function(){
			ivan_popov_schedule_nav_mode();
		});
		observer.observe(header);
	}

	ivan_popov_schedule_nav_mode();
}

// -----------------------------------------------------
// -----------   SWIPE NAVIGATION (MOBILE)   -----------
// -----------------------------------------------------

// Mirrors the CSS 1040px breakpoint where stacked/mobile content layout
// takes over from the desktop two-column layout.
function ivan_popov_is_mobile_layout(){

	"use strict";

	if(window.matchMedia){
		return window.matchMedia('(max-width: 1040px)').matches;
	}
	return jQuery(window).width() <= 1040;
}

// Briefly reveal a one-time-per-session hint element, then fade it out.
function ivan_popov_flash_hint(selector, storageKey){

	"use strict";

	try {
		var hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
		if(!hasTouch || !ivan_popov_is_nav_compact()){
			return;
		}
		if(window.sessionStorage.getItem(storageKey)){
			return;
		}
		var hint = document.querySelector(selector);
		if(!hint){
			return;
		}
		window.sessionStorage.setItem(storageKey, '1');
		window.setTimeout(function(){ hint.classList.add('show'); }, 700);
		window.setTimeout(function(){ hint.classList.remove('show'); }, 3200);
	} catch(err) {}
}

// Build the bottom dots indicator (mobile only, hidden by CSS on desktop).
// The dots mirror the mobile menu order and reuse the .transition_link class
// so the standard click handler navigates and ivan_popov_goto keeps them active.
function ivan_popov_build_swipe_nav(){

	"use strict";

	if(jQuery('.ivan_popov_swipe_nav').length){
		return;
	}

	var links = jQuery('.ivan_popov_mobile_menu .menu_list .transition_link a');
	if(!links.length){
		return;
	}

	var dots = '';
	links.each(function(i){
		var $a		= jQuery(this);
		var href	= $a.attr('href');
		var label	= jQuery.trim($a.text());
		var active	= jQuery(href).hasClass('active') || (i === 0 && !jQuery('.ivan_popov_section.active').length);
		dots += '<li class="'+(active ? 'active' : '')+'">'
			+ '<a href="'+href+'" aria-label="'+label+'"><span class="dot"></span></a>'
			+ '</li>';
	});

	var html = '<div class="ivan_popov_swipe_nav" aria-label="Навигация по разделам">'
		+ '<ul class="transition_link">'+dots+'</ul>'
		+ '</div>'
		+ '<div class="ivan_popov_swipe_hint" aria-hidden="true">'
		+ '<span class="ar left">&#8249;</span>'
		+ '<span class="ar right">&#8250;</span>'
		+ '</div>'
		+ '<div class="ivan_popov_scroll_hint" aria-hidden="true">'
		+ '<span class="ar up">&#8249;</span>'
		+ '<span class="ar down">&#8250;</span>'
		+ '</div>';

	jQuery('.ivan_popov_all_wrap').append(html);
}

function ivan_popov_swipe_navigation(){

	"use strict";

	var mainpart = document.querySelector('.ivan_popov_mainpart');
	if(!mainpart){
		return;
	}

	var startX = 0, startY = 0, startTime = 0, tracking = false;

	function sectionOrder(){
		return jQuery('.ivan_popov_swipe_nav .transition_link a').map(function(){
			return jQuery(this).attr('href');
		}).get();
	}

	function currentHref(){
		// The active dot is the reliable source of truth: ivan_popov_goto keeps
		// exactly one .transition_link item active. Sections cannot be used here
		// because the legacy transition only adds .hidden to the previous section
		// without clearing its .active class, so several stay "active" at once.
		var $dot = jQuery('.ivan_popov_swipe_nav li.active a');
		if($dot.length){
			return $dot.attr('href');
		}
		var $visible = jQuery('.ivan_popov_section.active').not('.hidden').last();
		if(!$visible.length){
			$visible = jQuery('.ivan_popov_section.animated').not('.hidden').last();
		}
		return $visible.length ? ('#' + $visible.attr('id')) : null;
	}

	function navigationBlocked(){
		return jQuery('.ivan_popov_modalbox').hasClass('opened')
			|| jQuery('.ivan_popov_mobile_menu').hasClass('opened');
	}

	mainpart.addEventListener('touchstart', function(e){
		if(!ivan_popov_is_nav_compact()){
			tracking = false;
			return;
		}
		if(e.touches.length !== 1 || navigationBlocked()){
			tracking = false;
			return;
		}
		var t = e.touches[0];
		startX = t.clientX;
		startY = t.clientY;
		startTime = Date.now();
		tracking = true;
	}, { passive: true });

	mainpart.addEventListener('touchend', function(e){
		if(!tracking){
			return;
		}
		tracking = false;

		var t	= e.changedTouches[0];
		var dx	= t.clientX - startX;
		var dy	= t.clientY - startY;

		// Only treat quick, mostly-horizontal gestures as section swipes so
		// vertical scrolling inside a section stays untouched.
		if(Date.now() - startTime > 900){ return; }
		if(Math.abs(dx) < 60){ return; }
		if(Math.abs(dx) < Math.abs(dy) * 1.4){ return; }

		var order = sectionOrder();
		if(!order.length){ return; }

		var index = order.indexOf(currentHref());
		if(index < 0){ index = 0; }

		var nextIndex = dx < 0 ? index + 1 : index - 1;
		if(nextIndex < 0 || nextIndex >= order.length){ return; }

		ivan_popov_goto(order[nextIndex]);
	}, { passive: true });

	// One-time per-session hint so users discover the horizontal swipe.
	ivan_popov_flash_hint('.ivan_popov_swipe_hint', 'ivan_popov_swipe_hint');
}

// -----------------------------------------------------
// ------------   KEYBOARD NAVIGATION    ---------------
// -----------------------------------------------------

// Arrow Left/Right step through the menu sections (Up/Down stay free for
// scrolling section content). Escape closes the service popup or mobile menu.
function ivan_popov_keyboard_navigation(){

	"use strict";

	var modalBox	= jQuery('.ivan_popov_modalbox');
	var mobileMenu	= jQuery('.ivan_popov_mobile_menu');

	// Section order follows the menu order; the header is the source of truth,
	// with the mobile menu as a fallback when the header is not rendered.
	function sectionOrder(){
		var order = jQuery('.ivan_popov_header .menu .transition_link a').map(function(){
			return jQuery(this).attr('href');
		}).get();
		if(!order.length){
			order = jQuery('.ivan_popov_mobile_menu .menu_list .transition_link a').map(function(){
				return jQuery(this).attr('href');
			}).get();
		}
		return order;
	}

	function currentHref(){
		var $active = jQuery('.transition_link li.active a').first();
		if($active.length){
			return $active.attr('href');
		}
		var $visible = jQuery('.ivan_popov_section.active').not('.hidden').last();
		return $visible.length ? ('#' + $visible.attr('id')) : null;
	}

	// Keep the sliding header highlight aligned with the new active item, since
	// keyboard navigation fires no mouse events to reposition it.
	function refreshHeaderHighlight(){
		if(typeof currentLink !== 'function'){
			return;
		}
		var header = jQuery('.ivan_popov_header');
		if(!header.is(':visible')){
			return;
		}
		var ccc = header.find('.menu .ccc');
		var el	= header.find('.menu .active a');
		if(ccc.length && el.length){
			currentLink(ccc, el);
		}
	}

	function navigateBy(step){
		var order = sectionOrder();
		if(!order.length){
			return false;
		}
		var index = order.indexOf(currentHref());
		if(index < 0){
			index = 0;
		}
		var nextIndex = index + step;
		if(nextIndex < 0 || nextIndex >= order.length){
			return false;
		}
		ivan_popov_goto(order[nextIndex]);
		refreshHeaderHighlight();
		return true;
	}

	function closeModal(){
		if(!modalBox.hasClass('opened')){
			return false;
		}
		// Reuse the existing close handler so nicescroll/cursor state is reset.
		modalBox.find('.close').first().trigger('click');
		return true;
	}

	function closeMobileMenu(){
		if(!mobileMenu.hasClass('opened')){
			return false;
		}
		jQuery('.ivan_popov_topbar .trigger .hamburger').removeClass('is-active');
		mobileMenu.removeClass('opened');
		return true;
	}

	function isTypingTarget(el){
		if(!el){
			return false;
		}
		var tag = (el.tagName || '').toLowerCase();
		return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
	}

	jQuery(document).on('keydown.ivan_popov_kbd', function(e){
		var key = e.key;

		if(key === 'Escape' || key === 'Esc'){
			if(closeModal() || closeMobileMenu()){
				e.preventDefault();
			}
			return;
		}

		// Leave typing and modified shortcuts (Ctrl/Cmd/Alt) untouched.
		if(isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey){
			return;
		}

		// Section navigation is suspended while a popup or the mobile menu is open.
		if(modalBox.hasClass('opened') || mobileMenu.hasClass('opened')){
			return;
		}

		if(key === 'ArrowRight'){
			if(navigateBy(1)){ e.preventDefault(); }
		}else if(key === 'ArrowLeft'){
			if(navigateBy(-1)){ e.preventDefault(); }
		}
	});
}

// -------------------------------------------------
// -------------  SERVICE POPUP  -------------------
// -------------------------------------------------

function ivan_popov_service_popup(){
	
	"use strict";
	
	var modalBox		= jQuery('.ivan_popov_modalbox');
	var button			= jQuery('.ivan_popov_service .service_list ul li .ivan_popov_full_link');
	var closePopup		= modalBox.find('.close');
	var serviceCards	= jQuery('.ivan_popov_service .service_list ul li .list_inner');

	function setLightCursor(on){
		jQuery('body').toggleClass('ivan_popov_light_cursor', !!on);
	}

	serviceCards.on('mouseenter', function(){
		setLightCursor(true);
	}).on('mouseleave', function(){
		if (!modalBox.hasClass('opened')) {
			setLightCursor(false);
		}
	});

	button.on('click',function(){
		var element = jQuery(this);
		var parent	= element.closest('.list_inner');
		var popupImg = parent.find('.popup_service_image');
		var elImage	= popupImg.data('popup-jpg') || popupImg.attr('src');
		var elWebp	= popupImg.data('popup-webp');
		var title	= parent.find('.title').html();
		var content = parent.find('.service_hidden_details').html();
		var webpAttr = elWebp ? ' data-img-url-webp="'+elWebp+'"' : '';
		modalBox.addClass('opened');
		setLightCursor(true);
		modalBox.find('.description_wrap').html(content);
		modalBox.find('.service_popup_informations').prepend('<div class="image"><img src="static/img/thumbs/4-2.jpg" alt="" /><div class="main" data-img-url="'+elImage+'"'+webpAttr+'></div></div>');
		ivan_popov_data_images();
		modalBox.find('.service_popup_informations .image').after('<div class="main_title"><h3>'+title+'</h3></div>');
		ivan_popov_nicescroll_resize(modalBox.find('.description_wrap'));
		return false;
	});
	closePopup.on('click',function(){
		modalBox.removeClass('opened');
		setLightCursor(false);
		modalBox.find('.description_wrap').html('');
		ivan_popov_nicescroll_remove_instance(ivan_popov_nicescroll_modal, ivan_popov_nicescroll_modal_el);
		ivan_popov_nicescroll_modal = null;
		ivan_popov_nicescroll_modal_el = null;
		return false;
	});
}

// -----------------------------------------------------
// ---------------   PRELOADER   -----------------------
// -----------------------------------------------------

function ivan_popov_preloader(){
	
	"use strict";
	
	var preloader = jQuery('#preloader');
	
	if (!preloader.length) {
		return;
	}

	var run = function(){
		setTimeout(function() {
			preloader.addClass('preloaded');
		}, 180);
		setTimeout(function() {
			preloader.remove();
		}, 850);
	};

	if (document.readyState === 'complete') {
		run();
	} else {
		jQuery(window).on('load.ivan_popov_preloader', function(){
			jQuery(window).off('load.ivan_popov_preloader');
			run();
		});
	}
}

// -----------------------------------------------------
// ------------------   CURSOR    ----------------------
// -----------------------------------------------------

function ivan_popov_cursor(){
	
    "use strict";
	
	var myCursor	= jQuery('.mouse-cursor');
	
	if(myCursor.length){
		if ($("body")) {
        const e = document.querySelector(".cursor-inner"),
            t = document.querySelector(".cursor-outer");
        let n, i = 0,
            o = !1;
        window.onmousemove = function (s) {
            o || (t.style.transform = "translate(" + s.clientX + "px, " + s.clientY + "px)"), e.style.transform = "translate(" + s.clientX + "px, " + s.clientY + "px)", n = s.clientY, i = s.clientX
        }, $("body").on("mouseenter", "a,.ivan_popov_topbar .trigger, .cursor-pointer", function () {
            e.classList.add("cursor-hover"), t.classList.add("cursor-hover")
        }), $("body").on("mouseleave", "a,.ivan_popov_topbar .trigger, .cursor-pointer", function () {
            $(this).is("a") && $(this).closest(".cursor-pointer").length || (e.classList.remove("cursor-hover"), t.classList.remove("cursor-hover"))
        }), e.style.visibility = "visible", t.style.visibility = "visible"
    }
	}
};

// -----------------------------------------------------
// ---------------    IMAGE TO SVG    ------------------
// -----------------------------------------------------

function ivan_popov_imgtosvg(){
	
	"use strict";
	
	jQuery('img.svg').each(function(){
		
		var jQueryimg 		= jQuery(this);
		var imgClass		= jQueryimg.attr('class');
		var imgURL			= jQueryimg.attr('src');
		var imgWidth		= jQueryimg.attr('width');
		var imgHeight		= jQueryimg.attr('height');

		jQuery.get(imgURL, function(data) {
			// Get the SVG tag, ignore the rest
			var jQuerysvg = jQuery(data).find('svg');

			// Add replaced image's classes to the new SVG
			if(typeof imgClass !== 'undefined') {
				jQuerysvg = jQuerysvg.attr('class', imgClass+' replaced-svg');
			}
			if (imgWidth) {
				jQuerysvg = jQuerysvg.attr('width', imgWidth);
			}
			if (imgHeight) {
				jQuerysvg = jQuerysvg.attr('height', imgHeight);
			}

			// Remove any invalid XML tags as per http://validator.w3.org
			jQuerysvg = jQuerysvg.removeAttr('xmlns:a');

			// Replace image with new SVG
			jQueryimg.replaceWith(jQuerysvg);

		}, 'xml');

	});
}

// -----------------------------------------------------
// ---------------   DATA IMAGES    --------------------
// -----------------------------------------------------

function ivan_popov_data_images(){
	
	"use strict";
	
	var data			= jQuery('*[data-img-url]');
	
	data.each(function(){
		var element			= jQuery(this);
		var url				= element.data('img-url');
		var webp			= element.data('img-url-webp');
		if (webp) {
			element.css({
				backgroundImage:
					'image-set(url("' + webp + '") type("image/webp"), url("' + url + '") type("image/jpeg"))'
			});
		} else {
			element.css({backgroundImage: 'url('+url+')'});
		}
	});
}

// -----------------------------------------------------
// ------------   TESTIMONIALS SCROLL-SNAP   -----------
// -----------------------------------------------------

function ivan_popov_testimonials_snap(){

	"use strict";

	// Horizontal snap + autoplay are desktop-only; mobile uses a vertical list (CSS).
	if(ivan_popov_is_mobile_layout()){
		return;
	}

	var list = document.querySelector('.ivan_popov_about .testimonials .testimonials-snap');
	if(!list){
		return;
	}

	var items = list.querySelectorAll(':scope > li');
	if(items.length < 2){
		return;
	}

	var index = 0;
	var paused = false;
	var timer = null;
	var scrollEndTimer = null;
	var dragging = false;
	var dragStartX = 0;
	var dragScrollLeft = 0;

	function scrollToIndex(i){
		// Scroll the horizontal track only — scrollIntoView() also moves ancestor
		// .ivan_popov_section (overflow-y: scroll) and breaks every section layout.
		var item = items[i];
		var left = item.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft;
		list.scrollTo({ left: left, behavior: 'smooth' });
	}

	function isHowActive(){
		var how = document.getElementById('how');
		return how && how.classList.contains('active');
	}

	function scheduleAutoplay(){
		if(timer){
			clearInterval(timer);
		}
		timer = setInterval(function(){
			if(paused || !isHowActive()){
				return;
			}
			index = (index + 1) % items.length;
			scrollToIndex(index);
		}, 5000);
	}

	list.addEventListener('mouseenter', function(){
		paused = true;
	});
	list.addEventListener('mouseleave', function(){
		if(!dragging){
			paused = false;
		}
	});
	list.addEventListener('touchstart', function(){
		paused = true;
	}, { passive: true });
	list.addEventListener('touchend', function(){
		paused = false;
	}, { passive: true });

	// Click-drag and trackpad horizontal scroll: NiceScroll on the section
	// captures pointer/wheel events unless we stop propagation on the track.
	function onDragMove(e){
		if(!dragging){
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		list.scrollLeft = dragScrollLeft - (e.clientX - dragStartX);
	}

	function endDrag(){
		if(!dragging){
			return;
		}
		dragging = false;
		list.classList.remove('is-dragging');
		paused = false;
		window.removeEventListener('mousemove', onDragMove);
		window.removeEventListener('mouseup', endDrag);
	}

	list.addEventListener('mousedown', function(e){
		if(e.button !== 0){
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

	list.addEventListener('wheel', function(e){
		if(Math.abs(e.deltaX) > Math.abs(e.deltaY)){
			e.stopPropagation();
		}
	}, { passive: true });

	list.addEventListener('touchmove', function(e){
		e.stopPropagation();
	}, { passive: true });

	list.addEventListener('scroll', function(){
		if(scrollEndTimer){
			clearTimeout(scrollEndTimer);
		}
		scrollEndTimer = setTimeout(function(){
			var scrollLeft = list.scrollLeft;
			var bestIndex = 0;
			var bestDistance = Infinity;
			for(var i = 0; i < items.length; i++){
				var itemLeft = items[i].offsetLeft;
				var distance = Math.abs(itemLeft - scrollLeft);
				if(distance < bestDistance){
					bestDistance = distance;
					bestIndex = i;
				}
			}
			index = bestIndex;
		}, 120);
	}, { passive: true });

	scheduleAutoplay();
}

// -----------------------------------------------------
// -------------------    HASHTAG    -------------------
// -----------------------------------------------------

function hashtag(){
	"use strict";
	var ccc 			= $('.ivan_popov_header .menu .ccc');
	var element 		= $('.ivan_popov_header .menu .active a');
	$('.ivan_popov_header .menu a').on('mouseenter',function(){
		var e 			= $(this);
		currentLink(ccc,e);
	});
	$('.ivan_popov_header .menu').on('mouseleave',function(){
		element 		= $('.ivan_popov_header .menu .active a');
		currentLink(ccc,element);
		element.parent().siblings().removeClass('mleave');
	});
	currentLink(ccc,element);

	function repositionActive(){
		var active = $('.ivan_popov_header .menu .active a');
		if(active.length){
			currentLink(ccc, active);
		}
	}
	if(document.fonts && document.fonts.ready && document.fonts.ready.then){
		document.fonts.ready.then(repositionActive);
	}
	$(window).on('load.ivan_popov_ccc', repositionActive);
	$(window).on('resize.ivan_popov_ccc', repositionActive);

	// style.css (with self-hosted Onest @font-face) loads asynchronously via
	// preload/onload, so at this point the menu is often still unstyled.
	// document.fonts.ready and window "load" can both fire BEFORE that async CSS actually
	// applies. ResizeObserver on the menu re-measures whenever the real layout
	// finally lands (font swap, async CSS apply, breakpoint change), which is the only 
	// reliable trigger here.
	if(window.ResizeObserver){
		var menuList = document.querySelector('.ivan_popov_header .menu ul');
		if(menuList){
			new ResizeObserver(function(){
				repositionActive();
			}).observe(menuList);
		}
	}

}

function currentLink(ccc,e){
	"use strict";
	if(!e.length){return false;}
	var left 		= e.offset().left;
	var width		= e.outerWidth();
	var menuleft 	= $('.ivan_popov_header .menu').offset().left;
	e.parent().removeClass('mleave');
	e.parent().siblings().addClass('mleave');
	ccc.css({left: (left-menuleft) + 'px',width: width + 'px'});
	
}
