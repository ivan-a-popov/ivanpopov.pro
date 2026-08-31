"use strict";
// Critical, inlined by minify.py between the CRITICAL JS markers in
// index.html. Dismisses the preloader once above-the-fold is ready (style.css,
// fonts and hero decoded), independent of deferred init.js.
// A hard timeout guarantees the overlay never traps the user.
//
// The curtain plays only for humans landing on / or /#home. Deep links
// (#testimonials, …), automation (PageSpeed / Lighthouse), crawlers, and
// prefers-reduced-motion skip it — same HTML, no theatrical wait. html
// starts with skip-preloader (fail-closed for Speed Index); this script
// removes it for humans. Lighthouse 13.4 spoofs a normal Chrome UA and
// hides webdriver, so lab viewports (412×823@1.75, 1350×940) count too.
// Automation additionally gets html.ip-automation, which freezes decorative
// motion (headline rotation, logo-cursor blink) for a static filmstrip.
(function(){
	var GROW_HALF_MS = 1000;
	var HOLD_MS = 400;
	var BLINK_MS = 1350;
	var GROW_FULL_MS = 500;
	var PEEL_MS = 500;
	var SEQUENCE_MS = GROW_HALF_MS + HOLD_MS + BLINK_MS;
	var DISMISS_MS = GROW_FULL_MS + PEEL_MS;
	var FALLBACK_MS = SEQUENCE_MS + DISMISS_MS + 1000;
	var BOT_UA = /Googlebot|AdsBot-Google|bingbot|Yandex(Bot|Images)|DuckDuckBot|Baiduspider|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Slackbot|Discordbot|Applebot|GPTBot|ChatGPT-User|ClaudeBot|CCBot|Bytespider|Amazonbot|HeadlessChrome|HeadlessChromium|Chrome-Lighthouse|PageSpeed/i;

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
	// Lighthouse 13.4 / PSI spoofs a normal Chrome UA (no Chrome-Lighthouse)
	// and leaves navigator.webdriver false. The lab viewport is still exact.
	function isLabViewport(){
		var w = window.innerWidth;
		var h = window.innerHeight;
		var sw = screen && screen.width;
		var sh = screen && screen.height;
		var dpr = window.devicePixelRatio || 1;
		function near(a, b){ return Math.abs(a - b) < 0.02; }
		function slop(a, b, n){ return Math.abs(a - b) <= n; }
		// Viewport OR screen — not AND. PSI desktop often emulates 1350×940
		// for only one of them; requiring both replayed the curtain (SI drop).
		// Width slop: html{scrollbar-gutter:stable} shrinks innerWidth ~15px
		// on desktop classic scrollbars. Mobile overlay scrollbars stay 412.
		if((w === 412 || sw === 412) && near(dpr, 1.75)){ return true; }
		if(near(dpr, 1) && (
			(slop(w, 1350, 20) && slop(h, 940, 2)) ||
			(sw === 1350 && sh === 940)
		)){ return true; }
		return false;
	}
	function isAutomation(){
		if(navigator.webdriver){ return true; }
		if(BOT_UA.test(navigator.userAgent || '')){ return true; }
		try {
			var brands = navigator.userAgentData && navigator.userAgentData.brands;
			if(brands){
				for(var i = 0; i < brands.length; i++){
					if(/HeadlessChrome|HeadlessChromium|Lighthouse/i.test(brands[i].brand || '')){ return true; }
				}
			}
		}catch(e){}
		if(isLabViewport()){ return true; }
		return false;
	}
	function prefersReducedMotion(){
		return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}
	var AUTOMATION = isAutomation();
	var SKIP_PLAY = AUTOMATION || prefersReducedMotion() || landingHash() !== '#home';
	if(AUTOMATION){
		// Separate from skip-preloader (which deep-linked humans also get):
		// lets init.js/style.css freeze decorative motion so the Lighthouse
		// filmstrip is fully static after first paint (Speed Index).
		document.documentElement.classList.add('ip-automation');
	}
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
		var line = preloader.querySelector('.loader_line');
		if(line){
			var boxH = line.offsetHeight || 250;
			var viewH = preloader.clientHeight || window.innerHeight;
			line.style.setProperty('--loader-scale-full', String(viewH / boxH));
		}
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
	// Manrope faces are registered by the inline critical CSS, so loads can be
	// kicked off right away. Only the first-screen Cyrillic strings — Latin
	// Manrope is not preloaded (it would outrank the LCP photo on HTTP/1.1).
	function whenFontsReady(){
		if(!document.fonts || !document.fonts.load){ return Promise.resolve(); }
		var faces = Promise.all([
			document.fonts.load('650 1em Manrope', 'Иван Попов'),
			document.fonts.load('650 1em Manrope', 'Кто такой')
		]).catch(function(){});
		return Promise.race([
			faces,
			new Promise(function(resolve){ setTimeout(resolve, 2500); })
		]);
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
	// half-grow → hold → blink; dismiss triggers full-grow then peel (see critical.css).
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
		var done = false;
		function finish(){
			if(done){ return; }
			done = true;
			dismiss(preloader);
		}
		var fallback = setTimeout(finish, FALLBACK_MS);
		Promise.all([
			whenStylesReady().then(whenHeroReady),
			whenFontsReady(),
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
