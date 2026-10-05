"use strict";
// Critical head script. minify.py inlines it into index.html (between the
// INLINE markers) as a blocking <script> so skip-preloader is decided before
// #preloader.
// Dismisses the preloader once the line has blinked and the hero has decoded,
// independent of init.js. Page CSS is already inlined in <head>.
// .preloaded starts full-grow; the peel is delayed by that same duration.
// A hard timeout guarantees the overlay never traps the user.
//
// The curtain plays only for humans landing on / or /#home. Deep links
// (#testimonials, …) and prefers-reduced-motion skip it — same HTML, no
// theatrical wait. html starts with skip-preloader (fail-closed); this
// script removes it when the curtain should play.
(function(){
	// Preloader timing lives in style.css (:root --preloader-*-ms, unitless
	// milliseconds). Read lazily by start() so skipped runs pay nothing.
	// Choreography is fixed: half-grow → blink → full-grow → peel. The hero
	// decodes under the curtain; .preloaded is added only once that and the
	// blink are both done, and the peel waits out full-grow so the line and
	// the curtains stay in step.
	var SEQUENCE_MS = 0;
	var DISMISS_MS = 0;
	var FALLBACK_MS = 0;
	function readTimings(){
		var cs = getComputedStyle(document.documentElement);
		function ms(name){
			var v = parseFloat(cs.getPropertyValue(name));
			return v >= 0 ? v : 0;
		}
		SEQUENCE_MS = ms('--preloader-grow-half-ms') + ms('--preloader-blink-ms');
		DISMISS_MS = ms('--preloader-grow-full-ms') + ms('--preloader-peel-ms');
		FALLBACK_MS = SEQUENCE_MS + DISMISS_MS;
	}

	// Keep in sync with html[data-ip-section=…] in style.css. Unknown or
	// selector-like hashes must not set the attr: html[data-ip-section] hides
	// #home, and a throw in init.js would leave a blank first paint.
	var SECTION_IDS = { home: 1, about: 1, service: 1, whyme: 1, testimonials: 1 };
	function landingHash(){
		var hash = location.hash;
		if(!hash || hash === '#'){ return '#home'; }
		var id = hash.charAt(0) === '#' ? hash.slice(1) : hash;
		if(!SECTION_IDS[id]){ return '#home'; }
		return '#' + id;
	}
	function prefersReducedMotion(){
		return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}
	var SKIP_PLAY = prefersReducedMotion() || landingHash() !== '#home';
	if(SKIP_PLAY){
		document.documentElement.classList.add('skip-preloader');
	}else{
		document.documentElement.classList.remove('skip-preloader');
	}
	// First-paint stand-in for :target. :target stays stuck on the original
	// fragment after history.pushState, which blocked rollIn/rollOut on the
	// landing section for the rest of the session. init.js clears this.
	var land = landingHash();
	if(land !== '#home'){
		document.documentElement.setAttribute('data-ip-section', land.slice(1));
	}

	function dismiss(preloader){
		preloader.classList.add('preloaded');
		setTimeout(function(){
			if(preloader.parentNode){ preloader.remove(); }
		}, DISMISS_MS);
	}
	function whenHeroReady(){
		var imgs = [].slice.call(document.querySelectorAll('#author_photo_img, #home .ip_home_photo img'));
		return Promise.all(imgs.map(function(img){
			return new Promise(function(resolve){
				if(img.complete){ resolve(); return; }
				img.addEventListener('load', resolve, { once: true });
				img.addEventListener('error', resolve, { once: true });
			});
		}));
	}
	// half-grow → blink; .preloaded then runs full-grow, and the peel starts
	// after that (see style.css).
	function whenLineSequenceReady(){
		return new Promise(function(resolve){
			var line = document.querySelector('#preloader .loader_line');
			if(!line){ resolve(); return; }
			var settled = false;
			function finish(){
				if(settled){ return; }
				settled = true;
				resolve();
			}
			line.addEventListener('animationend', function(e){
				if(e.animationName === 'lineround'){ finish(); }
			});
			setTimeout(finish, SEQUENCE_MS);
		});
	}
	function start(){
		var preloader = document.getElementById('preloader');
		if(!preloader){ return; }
		if(SKIP_PLAY){
			if(preloader.parentNode){ preloader.remove(); }
			return;
		}
		readTimings();
		var done = false;
		function finish(){
			if(done){ return; }
			done = true;
			dismiss(preloader);
		}
		var fallback = setTimeout(finish, FALLBACK_MS);
		Promise.all([
			whenHeroReady(),
			whenLineSequenceReady()
		]).then(function(){
			clearTimeout(fallback);
			requestAnimationFrame(finish);
		});
	}
	if(document.readyState !== 'loading'){
		start();
	}else{
		document.addEventListener('DOMContentLoaded', start);
	}
})();
