"use strict";

// ----------  TINY DOM HELPERS  ----------

function ip_ready(fn){
	if(document.readyState !== 'loading'){
		fn();
	}else{
		document.addEventListener('DOMContentLoaded', fn);
	}
}
function ip_all(selector, context){
	return [...(context || document).querySelectorAll(selector)];
}
function ip_one(selector, context){
	return (context || document).querySelector(selector);
}
function ip_add_classes(el, str){
	if(!el || !str){ return; }
	str.split(/\s+/).forEach(function(c){ if(c){ el.classList.add(c); } });
}
function ip_remove_classes(el, str){
	if(!el || !str){ return; }
	str.split(/\s+/).forEach(function(c){ if(c){ el.classList.remove(c); } });
}
ip_ready(function(){
	ip_mark_touch_device();
	ip_init_section_focus();
	ip_build_swipe_nav();
	ip_page_transition();
	ip_swipe_navigation();
	ip_keyboard_navigation();
	ip_service_popup();
	ip_cursor();
	ip_testimonials_snap();
	ip_animated_headline();
	ip_preloader();
});


// -------------   PAGE TRANSITION    ------------------

function ip_goto(href){
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
	target.focus({ preventScroll: true });
	return true;
}

function ip_init_section_focus(){
	ip_all('.ip_section').forEach(function(section){
		if(!section.hasAttribute('tabindex')){
			section.setAttribute('tabindex', '-1');
		}
	});
	var active = ip_one('.ip_section.active') || ip_one('.ip_section.animated');
	if(active){
		active.focus({ preventScroll: true });
	}
}

// Shared by swipe + keyboard section navigation.
var IP_NAV_LINKS_HEADER = '.ip_header .menu .transition_link a';
var IP_NAV_LINKS_SWIPE = '.ip_swipe_nav .transition_link a';

function ip_nav_section_order(linkSelector){
	return ip_all(linkSelector).map(function(a){
		return a.getAttribute('href');
	});
}

function ip_current_section_href(opts){
	opts = opts || {};
	var active = ip_one(opts.activeLink || '.transition_link li.active a');
	if(active){
		return active.getAttribute('href');
	}
	var visible = ip_all('.ip_section.active').filter(function(s){
		return !s.classList.contains('hidden');
	});
	if(!visible.length && opts.fallbackAnimated){
		visible = ip_all('.ip_section.animated').filter(function(s){
			return !s.classList.contains('hidden');
		});
	}
	var last = visible[visible.length - 1];
	return last ? ('#' + last.id) : null;
}

function ip_navigate_section(step, linkSelector, hrefOpts){
	var order = ip_nav_section_order(linkSelector);
	if(!order.length){
		return false;
	}
	var index = order.indexOf(ip_current_section_href(hrefOpts));
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

function ip_page_transition(){
	ip_all('.transition_link a').forEach(function(link){
		link.addEventListener('click', function(e){
			e.preventDefault();
			var href = link.getAttribute('href');
			ip_goto(href);
		});
	});
}


// -----------   SWIPE NAVIGATION (MOBILE)   -----------
// Mirrors the CSS 1023px breakpoint where stacked/mobile content layout
// takes over from the desktop two-column layout.
function ip_is_mobile_layout(){
	return window.matchMedia('(max-width: 1023px)').matches;
}
function ip_is_touch_device(){
	return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}
function ip_mark_touch_device(){
	var wrap = ip_one('.ip_all_wrap');
	if(wrap && ip_is_touch_device()){
		wrap.classList.add('has-touch');
	}
}

// Build the bottom dots indicator (mobile only, hidden by CSS on desktop)
function ip_build_swipe_nav(){
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
		var label	= (a.textContent || '').trim();
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
	var mainpart = ip_one('.ip_mainpart');
	var wrap = ip_one('.ip_all_wrap');
	if(!mainpart){
		return;
	}

	var startX = 0, startY = 0, startTime = 0, tracking = false;
	var swipeHrefOpts = {
		activeLink: '.ip_swipe_nav li.active a',
		fallbackAnimated: true
	};
	mainpart.addEventListener('touchstart', function(e){
		if(!wrap || !wrap.classList.contains('has-touch')){
			tracking = false;
			return;
		}
		var modal = ip_one('.ip_modalbox');
		if(e.touches.length !== 1 || (modal && modal.classList.contains('opened'))){
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
		if(Date.now() - startTime > 900){ return; }
		if(Math.abs(dx) < 60){ return; }
		if(Math.abs(dx) < Math.abs(dy) * 1.4){ return; }
		ip_navigate_section(dx < 0 ? 1 : -1, IP_NAV_LINKS_SWIPE, swipeHrefOpts);
	}, { passive: true });
}


// ------------   KEYBOARD NAVIGATION    ---------------
// Arrow Left/Right step through the menu sections (Up/Down stay free for
// scrolling section content). Escape closes the service popup.
function ip_keyboard_navigation(){
	var modalBox	= ip_one('.ip_modalbox');
	var headerHrefOpts = { activeLink: '.transition_link li.active a' };

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

		if(key === 'Escape'){
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
			if(ip_navigate_section(1, IP_NAV_LINKS_HEADER, headerHrefOpts)){ e.preventDefault(); }
		}else if(key === 'ArrowLeft'){
			if(ip_navigate_section(-1, IP_NAV_LINKS_HEADER, headerHrefOpts)){ e.preventDefault(); }
		}
	});
}

// -------------  SERVICE POPUP  -------------------
function ip_service_popup(){
	var modalBox		= ip_one('.ip_modalbox');
	if(!modalBox){
		return;
	}
	var buttons			= ip_all('.ip_service .ip_full_link');
	var closePopup		= modalBox.querySelector('.close');
	var serviceCards	= ip_all('.ip_service .service-card');
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
			var parent	= button.closest('.service-card');
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
				infos.insertAdjacentHTML('afterbegin', '<div class="service-popup-hero"><img class="service-popup-hero__image" src="'+elImage+'" alt="" width="640" height="320" /><div class="service-popup-hero__title"><h3>'+title+'</h3></div></div>');
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

// ---------------   PRELOADER   -----------------------
function ip_preloader(){
	var preloader = ip_one('#preloader');

	if(!preloader){
		return;
	}

	var run = function(){
		setTimeout(function() {
			preloader.classList.add('preloaded');
		}, 180);
		setTimeout(function() {
			preloader.remove();
		}, 850);
	};

	if(document.readyState === 'complete'){
		run();
	}else{
		window.addEventListener('load', run, { once: true });
	}
}


// ------------------   CURSOR    ----------------------


function ip_cursor(){
	var myCursor = ip_one('.mouse-cursor');
	if(!myCursor){
		return;
	}

	var inner = ip_one('.cursor-inner');
	var outer = ip_one('.cursor-outer');
	if(!inner || !outer){
		return;
	}

	var hoverSelector = 'a';
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
		inner.classList.remove('cursor-hover');
		outer.classList.remove('cursor-hover');
	});

	inner.style.visibility = 'visible';
	outer.style.visibility = 'visible';
}


// ------------   TESTIMONIALS SCROLL-SNAP   -----------

function ip_use_vertical_testimonials_layout(){
	// Keep the desktop snap carousel only when there is enough vertical room.
	// On short viewports (including some high-DPI phones/tablets reported as
	// wide CSS widths), switch testimonials to the vertical list variant.
	if(ip_is_mobile_layout()){
		return true;
	}
	return window.matchMedia('(max-height: 920px)').matches && ip_is_touch_device();
}

function ip_testimonials_snap(){
	// Horizontal snap + autoplay are desktop-only; mobile uses a vertical list (CSS).
	if(ip_use_vertical_testimonials_layout()){
		return;
	}

	var list = ip_one('.testimonials .testimonials-snap');
	if(!list){
		return;
	}

	var items = list.querySelectorAll(':scope > li');
	if(items.length < 2){
		return;
	}

	var realItems = [...items];
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

	var slides = [...list.querySelectorAll(':scope > li')];
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
		var last = ip_one('#what');
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
	requestAnimationFrame(function(){ jumpTo(firstRealDom); });

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


// ---------------   ANIMATED HEADLINE   ---------------

function ip_animated_headline(){
	var animationDelay = 1200;       // initial wait before the first erase
	var revealDuration = 800;        // type / erase width animation duration
	var revealAnimationDelay = 800;  // hold time while a phrase is fully shown
	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	ip_all('.cd-headline.clip').forEach(function(headline){
		var wrapper = headline.querySelector('.cd-words-wrapper');
		if(!wrapper){ return; }
		var words = [...wrapper.querySelectorAll('b')];
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
