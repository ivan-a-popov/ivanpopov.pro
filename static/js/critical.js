"use strict";
// Critical head script. minify.py inlines it into index.html (between the
// INLINE markers) as a blocking <script> so skip-preloader is decided before
// #preloader.
// Dismisses the preloader once above-the-fold is ready (style.css and
// hero decoded), independent of deferred init.js.
// A hard timeout guarantees the overlay never traps the user.
//
// The curtain plays only for humans landing on / or /#home. Deep links
// (#testimonials, …) and prefers-reduced-motion skip it — same HTML, no
// theatrical wait. html starts with skip-preloader (fail-closed); this
// script removes it when the curtain should play.
(function(){
	// Preloader timing lives in critical.css (:root --preloader-*-ms, unitless
	// milliseconds). Read lazily by start() so skipped runs pay nothing.
	// The line animation is not a minimum cover. PSI (Lighthouse 13.5) had
	// LCP at 0.3s desktop / 1.2s mobile while Speed Index sat at 1.6s / 4.0s
	// — the only points off 100 on both — because this script also waited out
	// half-grow + blink before peeling. Shrinking those variables used to
	// shrink the fallback too, so the curtain opened before style.css and the
	// hero and Speed Index got worse.
	var DISMISS_MS = 0;
	var FALLBACK_MS = 5000;
	function readTimings(){
		var cs = getComputedStyle(document.documentElement);
		function ms(name){
			var v = parseFloat(cs.getPropertyValue(name));
			return v >= 0 ? v : 0;
		}
		// .preloaded peels immediately. Keep the node until the peel and the
		// line fade have both finished.
		DISMISS_MS = Math.max(ms('--preloader-grow-full-ms'), ms('--preloader-peel-ms'));
	}

	// Keep in sync with html[data-ip-section=…] in critical.css. Unknown or
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
	function stylesApplied(){
		return getComputedStyle(document.documentElement)
			.getPropertyValue('--ip-styles-ready').trim() === '1';
	}
	function whenStylesReady(){
		// Wait for async style.css (sentinel), then let its layout settle behind
		// the fixed opaque preloader before the curtains open.
		return new Promise(function(resolve){
			function settle(){
				requestAnimationFrame(function(){
					requestAnimationFrame(function(){
						resolve();
					});
				});
			}
			(function poll(){
				if(stylesApplied()){ settle(); return; }
				setTimeout(poll, 50);
			})();
		});
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
		whenStylesReady().then(whenHeroReady).then(function(){
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
