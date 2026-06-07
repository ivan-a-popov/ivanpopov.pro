// Register jQuery touch listeners as non-passive so plugins (e.g. Owl Carousel)
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
	ivan_popov_my_progress();
	ivan_popov_circular_progress();
	ivan_popov_service_popup();
	ivan_popov_cursor();
	ivan_popov_imgtosvg();
	ivan_popov_data_images();
	ivan_popov_mycarousel();
	hashtag();
	ivan_popov_preloader();
	
});

// -----------------------------------------------------
// ---------------   FUNCTIONS    ----------------------
// -----------------------------------------------------

// -----------------------------------------------------
// --------------------   MODALBOX    ------------------
// -----------------------------------------------------

function ivan_popov_modalbox(){
	
	"use strict";
	
	jQuery('.ivan_popov_all_wrap').prepend('<div class="ivan_popov_modalbox"><div class="box_inner"><div class="close"><a href="#"><i class="icon-cancel"></i></a></div><div class="description_wrap"></div></div></div>');
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
// -----------   SWIPE NAVIGATION (MOBILE)   -----------
// -----------------------------------------------------

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
		if(e.touches.length !== 1 || navigationBlocked()){
			tracking = false;
			return;
		}
		// Let the testimonials carousel handle its own horizontal swipes.
		if(e.target.closest && e.target.closest('.owl-carousel')){
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

	// One-time per-session hint so users discover the gesture.
	try {
		if(('ontouchstart' in window) && !window.sessionStorage.getItem('ivan_popov_swipe_hint')){
			var hint = document.querySelector('.ivan_popov_swipe_hint');
			if(hint){
				window.setTimeout(function(){ hint.classList.add('show'); }, 900);
				window.setTimeout(function(){ hint.classList.remove('show'); }, 4200);
			}
			window.sessionStorage.setItem('ivan_popov_swipe_hint', '1');
		}
	} catch(err) {}
}

// -------------------------------------------------
// -------------  PROGRESS BAR  --------------------
// -------------------------------------------------

function ivan_popov_my_progress(){
	
	"use strict";
	
	jQuery('.progress_inner').each(function() {
		var progress 		= jQuery(this);
		var pValue 			= parseInt(progress.data('value'), 10);
		var pColor			= progress.data('color');
		var pBarWrap 		= progress.find('.bar');
		var pBar 			= progress.find('.bar_in');
		pBar.css({width:pValue+'%', backgroundColor:pColor});
		setTimeout(function(){pBarWrap.addClass('open');});
	});
}

// -----------------------------------------------------
// ---------------   CIRCULAR PROGRESS   ---------------
// -----------------------------------------------------

function ivan_popov_circular_progress(){
	
	"use strict";
	
	var ww		= jQuery(window).width();
	var circVal;
	
	if(ww > 1400){
		circVal = 120;
	}
	else if(ww >= 768){
		circVal = 100;
	}
	else{
		circVal = 80;
	}
	
	jQuery('.circular_progress_bar .myCircle').each(function(){
		var element	= jQuery(this);
		element.append('<span class="number"></span>');
		var value	= element.data('value');
		element.circleProgress({
			size: circVal,
			value: 0,
			animation: {duration: 1400},
			thickness: 3,
			fill: "#7d7789",
			emptyFill: 'rgba(0,0,0,0)',
			startAngle: -Math.PI/2
		  }).on('circle-animation-progress', function(event, progress, stepValue) {
				element.find('.number').text(parseInt(stepValue.toFixed(2)*100) + '%');
		  });
		  element.circleProgress('value', 1.0);
		  setTimeout(function() { element.circleProgress('value', value); }, 1400);
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
	
	button.on('click',function(){
		var element = jQuery(this);
		var parent	= element.closest('.list_inner');
		var elImage	= parent.find('.popup_service_image').attr('src');
		var title	= parent.find('.title').html();
		var content = parent.find('.service_hidden_details').html();
		modalBox.addClass('opened');
		modalBox.find('.description_wrap').html(content);
		modalBox.find('.service_popup_informations').prepend('<div class="image"><img src="static/img/thumbs/4-2.jpg" alt="" /><div class="main" data-img-url="'+elImage+'"></div></div>');
		ivan_popov_data_images();
		modalBox.find('.service_popup_informations .image').after('<div class="main_title"><h3>'+title+'</h3></div>');
		ivan_popov_nicescroll_resize(modalBox.find('.description_wrap'));
		return false;
	});
	closePopup.on('click',function(){
		modalBox.removeClass('opened');
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

		jQuery.get(imgURL, function(data) {
			// Get the SVG tag, ignore the rest
			var jQuerysvg = jQuery(data).find('svg');

			// Add replaced image's classes to the new SVG
			if(typeof imgClass !== 'undefined') {
				jQuerysvg = jQuerysvg.attr('class', imgClass+' replaced-svg');
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
		element.css({backgroundImage: 'url('+url+')'});
	});
}

// -----------------------------------------------------
// --------------    OWL CAROUSEL    -------------------
// -----------------------------------------------------

 function ivan_popov_mycarousel(){
	 
	 "use strict";
	 
	var carousel			= jQuery('.ivan_popov_about .testimonials .owl-carousel');
	
	carousel.owlCarousel({
		loop: true,
		items: 2,
		lazyLoad: false,
		margin: 30,
		autoplay: true,
		autoplayTimeout: 7000,
		dots: false,
		nav: false,
		navSpeed: false,
		responsive : {
			0 : {
				items: 1
			},
			768 : {
				items: 2
			}
		}
	});
	 
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
