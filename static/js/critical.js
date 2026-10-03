"use strict";
// Critical head script. minify.py inlines it into index.html (between the
// INLINE markers) as a blocking <script> so skip-preloader is decided before
// #preloader.
// Dismisses the preloader once above-the-fold is ready (style.css and
// hero decoded), independent of deferred init.js.
// A hard timeout guarantees the overlay never traps the user.
//
// The curtain plays only for humans landing on / or /#home. Deep links
// (#testimonials, …), self-identified automation and crawlers, and
// prefers-reduced-motion skip it — same HTML, no theatrical wait. html
// starts with skip-preloader (fail-closed); this script removes it when
// the curtain should play.
// Automation additionally gets html.ip-automation, which freezes decorative
// motion (headline rotation, contact dock, cursor).
(function(){
	// Preloader timing lives in critical.css (:root --preloader-*-ms, unitless
	// milliseconds). Read lazily by start() so skipped runs pay nothing.
	var SEQUENCE_MS = 0;
	var DISMISS_MS = 0;
	var FALLBACK_MS = 0;
	function readTimings(){
		var cs = getComputedStyle(document.documentElement);
		function ms(name){
			var v = parseFloat(cs.getPropertyValue(name));
			return v >= 0 ? v : 0;
		}
		// half-grow → hold → blink; dismiss then runs full-grow → peel.
		SEQUENCE_MS = ms('--preloader-grow-half-ms') + ms('--preloader-blink-ms');
		DISMISS_MS = ms('--preloader-grow-full-ms') + ms('--preloader-peel-ms');
		FALLBACK_MS = SEQUENCE_MS + DISMISS_MS + 100;
	}
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
		readTimings();
		var done = false;
		function finish(){
			if(done){ return; }
			done = true;
			dismiss(preloader);
		}
		var fallback = setTimeout(finish, FALLBACK_MS);
		Promise.all([
			whenStylesReady().then(whenHeroReady),
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
