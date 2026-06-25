// Vanilla (no-jQuery) site behavior. Custom scrollbars are now pure CSS.

// ----------  SMALL DOM HELPERS  ----------

function ip_ready(fn){
	"use strict";
	if(document.readyState !== 'loading'){
		fn();
	}else{
		document.addEventListener('DOMContentLoaded', fn);
	}
}

function ip_all(selector, context){
	"use strict";
	return Array.prototype.slice.call((context || document).querySelectorAll(selector));
}

function ip_one(selector, context){
	"use strict";
	return (context || document).querySelector(selector);
}

function ip_add_classes(el, str){
	"use strict";
	if(!el || !str){ return; }
	str.split(/\s+/).forEach(function(c){ if(c){ el.classList.add(c); } });
}

function ip_remove_classes(el, str){
	"use strict";
	if(!el || !str){ return; }
	str.split(/\s+/).forEach(function(c){ if(c){ el.classList.remove(c); } });
}

ip_ready(function(){

	"use strict";

	// all ready functions here

	ip_mark_touch_device();
	ip_build_swipe_nav();
	ip_page_transition();
	ip_swipe_navigation();
	ip_keyboard_navigation();
	ip_service_popup();
	ip_cursor();
	ip_data_images();
	ip_testimonials_snap();
	ip_animated_headline();
	ip_preloader();

});

// -----------------------------------------------------
// -------------   PAGE TRANSITION    ------------------
// -----------------------------------------------------

// Shared navigation: switch to a section by its href (e.g. "#about").
// Used by the header menu, the swipe dots and the touch swipe handler,
// so every entry point keeps the section state and all menus in sync.
function ip_goto(href){

	"use strict";

	if(!href){
		return false;
	}

	var target = ip_one(href);
	if(!target){
		return false;
	}

	var sections	= ip_all('.ip_section');
	var allLi		= ip_all('.transition_link li');
	var wrapper		= ip_one('.ip_all_wrap');
	if(!wrapper){
		return false;
	}
	var enter		= wrapper.getAttribute('data-enter');
	var exit		= wrapper.getAttribute('data-exit');
	// Every link (header, swipe dots) that points to this section.
	var parents		= ip_all('.transition_link a[href="'+href+'"]').map(function(a){
		return a.closest('li');
	}).filter(Boolean);

	if(parents.some(function(li){ return li.classList.contains('active'); })){
		return false;
	}

	allLi.forEach(function(li){ li.classList.remove('active'); });
	sections.forEach(function(s){
		s.classList.remove('animated');
		ip_remove_classes(s, enter);
	});
	if(wrapper.classList.contains('opened')){
		sections.forEach(function(s){
			s.classList.add('animated');
			ip_add_classes(s, exit);
		});
	}
	parents.forEach(function(li){ li.classList.add('active'); });
	wrapper.classList.add('opened');
	target.classList.remove('animated');
	ip_remove_classes(target, exit);
	target.classList.add('animated');
	ip_add_classes(target, enter);
	sections.forEach(function(s){ s.classList.add('hidden'); });
	target.classList.remove('hidden');
	target.classList.add('active');
	target.scrollTop = 0;

	return true;
}

function ip_page_transition(){

	"use strict";

	ip_all('.transition_link a').forEach(function(link){
		link.addEventListener('click', function(e){
			e.preventDefault();
			var href = link.getAttribute('href');
			ip_goto(href);
		});
	});
}

// -----------------------------------------------------
// -----------   SWIPE NAVIGATION (MOBILE)   -----------
// -----------------------------------------------------

// Mirrors the CSS 1023px breakpoint where stacked/mobile content layout
// takes over from the desktop two-column layout.
function ip_is_mobile_layout(){

	"use strict";

	if(window.matchMedia){
		return window.matchMedia('(max-width: 1023px)').matches;
	}
	return window.innerWidth <= 1023;
}

function ip_is_touch_device(){

	"use strict";

	if(window.matchMedia){
		return window.matchMedia('(hover: none), (pointer: coarse)').matches;
	}
	return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

function ip_mark_touch_device(){

	"use strict";

	var wrap = ip_one('.ip_all_wrap');
	if(wrap && ip_is_touch_device()){
		wrap.classList.add('has-touch');
	}
}

// Build the bottom dots indicator (mobile only, hidden by CSS on desktop).
// The dots mirror the header menu order and reuse the .transition_link class
// so the standard click handler navigates and ip_goto keeps them active.
function ip_build_swipe_nav(){

	"use strict";

	if(ip_one('.ip_swipe_nav')){
		return;
	}

	var links = ip_all('.ip_header .menu .transition_link a');
	if(!links.length){
		return;
	}

	var hasActiveSection = !!ip_one('.ip_section.active');

	var dots = '';
	links.forEach(function(a, i){
		var href	= a.getAttribute('href');
		var label	= (a.textContent || '').replace(/^\s+|\s+$/g, '');
		var targetEl = href ? ip_one(href) : null;
		var active	= (targetEl && targetEl.classList.contains('active')) || (i === 0 && !hasActiveSection);
		dots += '<li class="'+(active ? 'active' : '')+'">'
			+ '<a href="'+href+'" aria-label="'+label+'"><span class="dot"></span></a>'
			+ '</li>';
	});

	var html = '<div class="ip_swipe_nav" aria-label="Навигация по разделам">'
		+ '<ul class="transition_link">'+dots+'</ul>'
		+ '</div>'
	
	var wrap = ip_one('.ip_all_wrap');
	if(wrap){
		wrap.insertAdjacentHTML('beforeend', html);
	}
}

function ip_swipe_navigation(){

	"use strict";

	var mainpart = document.querySelector('.ip_mainpart');
	if(!mainpart){
		return;
	}

	var startX = 0, startY = 0, startTime = 0, tracking = false;

	function sectionOrder(){
		return ip_all('.ip_swipe_nav .transition_link a').map(function(a){
			return a.getAttribute('href');
		});
	}

	function currentHref(){
		// The active dot is the reliable source of truth: ip_goto keeps
		// exactly one .transition_link item active. Sections cannot be used here
		// because the legacy transition only adds .hidden to the previous section
		// without clearing its .active class, so several stay "active" at once.
		var dot = ip_one('.ip_swipe_nav li.active a');
		if(dot){
			return dot.getAttribute('href');
		}
		var visible = ip_all('.ip_section.active').filter(function(s){
			return !s.classList.contains('hidden');
		});
		if(!visible.length){
			visible = ip_all('.ip_section.animated').filter(function(s){
				return !s.classList.contains('hidden');
			});
		}
		var last = visible[visible.length - 1];
		return last ? ('#' + last.id) : null;
	}

	function navigationBlocked(){
		var modal = ip_one('.ip_modalbox');
		return modal && modal.classList.contains('opened');
	}

	mainpart.addEventListener('touchstart', function(e){
		if(!ip_is_touch_device()){
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

		ip_goto(order[nextIndex]);
	}, { passive: true });
}

// -----------------------------------------------------
// ------------   KEYBOARD NAVIGATION    ---------------
// -----------------------------------------------------

// Arrow Left/Right step through the menu sections (Up/Down stay free for
// scrolling section content). Escape closes the service popup.
function ip_keyboard_navigation(){

	"use strict";

	var modalBox	= ip_one('.ip_modalbox');

	function sectionOrder(){
		return ip_all('.ip_header .menu .transition_link a').map(function(a){
			return a.getAttribute('href');
		});
	}

	function currentHref(){
		var active = ip_one('.transition_link li.active a');
		if(active){
			return active.getAttribute('href');
		}
		var visible = ip_all('.ip_section.active').filter(function(s){
			return !s.classList.contains('hidden');
		});
		var last = visible[visible.length - 1];
		return last ? ('#' + last.id) : null;
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
		ip_goto(order[nextIndex]);
		return true;
	}

	function closeModal(){
		if(!modalBox || !modalBox.classList.contains('opened')){
			return false;
		}
		// Reuse the existing close handler so cursor state is reset.
		var close = modalBox.querySelector('.close');
		if(close){
			close.click();
		}
		return true;
	}

	function isTypingTarget(el){
		if(!el){
			return false;
		}
		var tag = (el.tagName || '').toLowerCase();
		return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
	}

	document.addEventListener('keydown', function(e){
		var key = e.key;

		if(key === 'Escape' || key === 'Esc'){
			if(closeModal()){
				e.preventDefault();
			}
			return;
		}

		// Leave typing and modified shortcuts (Ctrl/Cmd/Alt) untouched.
		if(isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey){
			return;
		}

		// Section navigation is suspended while a popup is open.
		if(modalBox && modalBox.classList.contains('opened')){
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

function ip_service_popup(){

	"use strict";

	var modalBox		= ip_one('.ip_modalbox');
	if(!modalBox){
		return;
	}
	var buttons			= ip_all('.ip_service .service_list ul li .ip_full_link');
	var closePopup		= modalBox.querySelector('.close');
	var serviceCards	= ip_all('.ip_service .service_list ul li .list_inner');

	function setLightCursor(on){
		document.body.classList.toggle('ip_light_cursor', !!on);
	}

	serviceCards.forEach(function(card){
		card.addEventListener('mouseenter', function(){
			setLightCursor(true);
		});
		card.addEventListener('mouseleave', function(){
			if(!modalBox.classList.contains('opened')){
				setLightCursor(false);
			}
		});
	});

	buttons.forEach(function(button){
		button.addEventListener('click', function(e){
			e.preventDefault();
			var parent	= button.closest('.list_inner');
			if(!parent){ return; }
			var popupImg = parent.querySelector('.popup_service_image');
			var elImage	= (popupImg && (popupImg.getAttribute('data-popup-img') || popupImg.getAttribute('src'))) || '';
			var titleEl	= parent.querySelector('.title');
			var title	= titleEl ? titleEl.innerHTML : '';
			var detailsEl = parent.querySelector('.service_hidden_details');
			var content = detailsEl ? detailsEl.innerHTML : '';

			modalBox.classList.add('opened');
			setLightCursor(true);

			var descWrap = modalBox.querySelector('.description_wrap');
			if(descWrap){
				descWrap.innerHTML = content;
			}
			var infos = modalBox.querySelector('.service_popup_informations');
			if(infos){
				infos.insertAdjacentHTML('afterbegin', '<div class="image"><img src="static/img/thumbs/4-2.jpg" alt="" /><div class="main" data-img-url="'+elImage+'"></div></div>');
				ip_data_images();
				var image = infos.querySelector('.image');
				if(image){
					image.insertAdjacentHTML('afterend', '<div class="main_title"><h3>'+title+'</h3></div>');
				}
			}
		});
	});

	if(closePopup){
		closePopup.addEventListener('click', function(e){
			e.preventDefault();
			modalBox.classList.remove('opened');
			setLightCursor(false);
			var descWrap = modalBox.querySelector('.description_wrap');
			if(descWrap){
				descWrap.innerHTML = '';
			}
		});
	}
}

// -----------------------------------------------------
// ---------------   PRELOADER   -----------------------
// -----------------------------------------------------

function ip_preloader(){

	"use strict";

	var preloader = document.getElementById('preloader');

	if(!preloader){
		return;
	}

	var run = function(){
		setTimeout(function() {
			preloader.classList.add('preloaded');
		}, 180);
		setTimeout(function() {
			if(preloader.parentNode){
				preloader.parentNode.removeChild(preloader);
			}
		}, 850);
	};

	if(document.readyState === 'complete'){
		run();
	}else{
		window.addEventListener('load', run, { once: true });
	}
}

// -----------------------------------------------------
// ------------------   CURSOR    ----------------------
// -----------------------------------------------------

function ip_cursor(){

	"use strict";

	var myCursor = ip_one('.mouse-cursor');
	if(!myCursor){
		return;
	}

	var inner = document.querySelector('.cursor-inner');
	var outer = document.querySelector('.cursor-outer');
	if(!inner || !outer){
		return;
	}

	var hoverSelector = 'a, .cursor-pointer';
	var freeze = false;

	window.addEventListener('mousemove', function(s){
		if(!freeze){
			outer.style.transform = 'translate(' + s.clientX + 'px, ' + s.clientY + 'px)';
		}
		inner.style.transform = 'translate(' + s.clientX + 'px, ' + s.clientY + 'px)';
	});

	document.body.addEventListener('mouseover', function(e){
		if(e.target.closest && e.target.closest(hoverSelector)){
			inner.classList.add('cursor-hover');
			outer.classList.add('cursor-hover');
		}
	});

	document.body.addEventListener('mouseout', function(e){
		var matched = e.target.closest && e.target.closest(hoverSelector);
		if(!matched){
			return;
		}
		// Leaving an <a> that still sits inside a hovered .cursor-pointer must not
		// drop the hover state (the wrapping pointer is still active).
		if(matched.tagName && matched.tagName.toLowerCase() === 'a' && matched.closest('.cursor-pointer')){
			return;
		}
		inner.classList.remove('cursor-hover');
		outer.classList.remove('cursor-hover');
	});

	inner.style.visibility = 'visible';
	outer.style.visibility = 'visible';
}

// -----------------------------------------------------
// ---------------   DATA IMAGES    --------------------
// -----------------------------------------------------

function ip_data_images(){

	"use strict";

	ip_all('*[data-img-url]').forEach(function(element){
		var url = element.getAttribute('data-img-url');
		element.style.backgroundImage = 'url(' + url + ')';
	});
}

// -----------------------------------------------------
// ------------   TESTIMONIALS SCROLL-SNAP   -----------
// -----------------------------------------------------

function ip_testimonials_snap(){

	"use strict";

	// Horizontal snap + autoplay are desktop-only; mobile uses a vertical list (CSS).
	if(ip_is_mobile_layout()){
		return;
	}

	var list = document.querySelector('.ip_about .testimonials .testimonials-snap');
	if(!list){
		return;
	}

	var items = list.querySelectorAll(':scope > li');
	if(items.length < 2){
		return;
	}

	var realItems = Array.prototype.slice.call(items);
	var realCount = realItems.length;

	// Build an infinite track: a full copy of every card on each side of the
	// originals. The three copies are identical, so re-centering into the middle
	// (real) copy is an invisible instant jump — autoplay and manual scroll then
	// loop seamlessly in both directions without Owl-style cloned-slide bookkeeping.
	var leadFrag = document.createDocumentFragment();
	var trailFrag = document.createDocumentFragment();
	realItems.forEach(function(li){
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

	var slides = Array.prototype.slice.call(list.querySelectorAll(':scope > li'));
	var firstRealDom = realCount;          // real cards occupy [realCount .. 2*realCount-1]
	var currentDom = firstRealDom;
	var paused = false;
	var timer = null;
	var scrollEndTimer = null;
	var dragging = false;
	var dragStartX = 0;
	var dragScrollLeft = 0;

	function jumpTo(domIndex){
		var slide = slides[domIndex];
		if(!slide){
			return;
		}
		// Instant reposition: bypass CSS scroll-behavior:smooth so the loop wrap
		// is invisible. Scroll the track only — scrollIntoView() would also move
		// the ancestor .ip_section (overflow-y: scroll) and break layout.
		var prev = list.style.scrollBehavior;
		list.style.scrollBehavior = 'auto';
		list.scrollLeft = slide.offsetLeft;
		void list.offsetWidth;
		list.style.scrollBehavior = prev;
		currentDom = domIndex;
	}

	function scrollToDom(domIndex){
		var slide = slides[domIndex];
		if(!slide){
			return;
		}
		list.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
	}

	function isLastActive(){
		var last = document.getElementById('what');
		return last && last.classList.contains('active');
	}

	function scheduleAutoplay(){
		if(timer){
			clearInterval(timer);
		}
		timer = setInterval(function(){
			if(paused || !isLastActive()){
				return;
			}
			currentDom += 1;
			// Past the trail copy (e.g. section was hidden before scroll re-centered).
			if(currentDom >= slides.length){
				currentDom = firstRealDom + realCount;
			}
			scrollToDom(currentDom);
		}, 5000);
	}

	jumpTo(firstRealDom);
	if(window.requestAnimationFrame){
		requestAnimationFrame(function(){ jumpTo(firstRealDom); });
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

	// Click-drag and trackpad horizontal scroll: stop propagation on the track so
	// the section's own scroll container does not hijack the horizontal gesture.
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
			var nearest = 0;
			var bestDistance = Infinity;
			for(var i = 0; i < slides.length; i++){
				var distance = Math.abs(slides[i].offsetLeft - scrollLeft);
				if(distance < bestDistance){
					bestDistance = distance;
					nearest = i;
				}
			}
			currentDom = nearest;
			// Settled on a clone copy → re-center into the identical real card.
			if(currentDom < firstRealDom){
				jumpTo(currentDom + realCount);
			} else if(currentDom >= firstRealDom + realCount){
				jumpTo(currentDom - realCount);
			}
		}, 140);
	}, { passive: true });

	scheduleAutoplay();
}

// -----------------------------------------------------
// ---------------   ANIMATED HEADLINE   ---------------
// -----------------------------------------------------

// Types the active phrase in, holds, erases it, then switches to
// the next one by animating the wrapper width; overflow:hidden
// plus the ::after bar give the typewriter/cursor look.
function ip_animated_headline(){

	"use strict";

	var animationDelay = 1200;       // initial wait before the first erase
	var revealDuration = 800;        // type / erase width animation duration
	var revealAnimationDelay = 800;  // hold time while a phrase is fully shown
	var reduce = !!(window.matchMedia &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches);

	ip_all('.cd-headline.clip').forEach(function(headline){
		var wrapper = headline.querySelector('.cd-words-wrapper');
		if(!wrapper){ return; }
		var words = Array.prototype.slice.call(wrapper.querySelectorAll('b'));
		if(words.length < 2){ return; }

		var visible = wrapper.querySelector('.is-visible') || words[0];
		words.forEach(function(w){
			w.classList.toggle('is-visible', w === visible);
			w.classList.toggle('is-hidden', w !== visible);
		});

		function takeNext(word){
			var i = words.indexOf(word);
			return words[(i + 1) % words.length];
		}

		function switchWord(oldWord, newWord){
			oldWord.classList.remove('is-visible');
			oldWord.classList.add('is-hidden');
			newWord.classList.remove('is-hidden');
			newWord.classList.add('is-visible');
		}

		// Reduced motion: skip the width typing, just swap phrases on a timer.
		if(reduce){
			wrapper.style.width = 'auto';
			var idx = words.indexOf(visible);
			window.setInterval(function(){
				var cur = words[idx];
				idx = (idx + 1) % words.length;
				switchWord(cur, words[idx]);
			}, animationDelay + revealAnimationDelay + revealDuration);
			return;
		}

		function animateWidth(px, done){
			wrapper.style.transition = 'width ' + revealDuration + 'ms';
			void wrapper.offsetWidth; // reflow so the transition runs from current width
			wrapper.style.width = px + 'px';
			var finished = false;
			function onEnd(e){
				if(e && e.propertyName && e.propertyName !== 'width'){ return; }
				if(finished){ return; }
				finished = true;
				wrapper.removeEventListener('transitionend', onEnd);
				done();
			}
			wrapper.addEventListener('transitionend', onEnd);
			window.setTimeout(onEnd, revealDuration + 80); // fallback if no transitionend
		}

		function hideWord(word){
			var nextWord = takeNext(word);
			animateWidth(2, function(){
				switchWord(word, nextWord);
				showWord(nextWord);
			});
		}

		function showWord(word){
			animateWidth(word.offsetWidth + 10, function(){
				window.setTimeout(function(){ hideWord(word); }, revealAnimationDelay);
			});
		}

		wrapper.style.width = (visible.offsetWidth + 10) + 'px';
		window.setTimeout(function(){ hideWord(visible); }, animationDelay);
	});
}
