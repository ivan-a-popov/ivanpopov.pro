"use strict";
// Critical, inlined by stamp-cache.sh between the CRITICAL JS markers in
// index.html. Dismisses the preloader once above-the-fold is ready (style.css
// settled + mainpart revealed + hero decoded), independent of deferred init.js.
// A hard timeout guarantees the overlay never traps the user.
(function(){
	var GROW_HALF_MS = 1000;
	var HOLD_MS = 400;
	var BLINK_MS = 1350;
	var BLINK_COUNT = 1;
	var GROW_FULL_MS = 500;
	var PEEL_MS = 500;
	var SEQUENCE_MS = GROW_HALF_MS + HOLD_MS + BLINK_MS * BLINK_COUNT;
	var DISMISS_MS = GROW_FULL_MS + PEEL_MS;
	var FALLBACK_MS = SEQUENCE_MS + DISMISS_MS + 1000;

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
	function revealMainpart(){
		var mainpart = document.querySelector('.ip_mainpart');
		if(mainpart){ mainpart.classList.add('is-ready'); }
	}
	function whenStylesReady(){
		// Wait for async style.css (sentinel), let layout commit while mainpart
		// is still visibility:hidden, then reveal — never in the same frame as
		// the stylesheet's first apply (that race caused ~0.95 CLS).
		return new Promise(function(resolve){
			function settleThenReveal(){
				requestAnimationFrame(function(){
					requestAnimationFrame(function(){
						revealMainpart();
						resolve();
					});
				});
			}
			(function poll(){
				if(stylesApplied()){ settleThenReveal(); return; }
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
		var done = false;
		function finish(){
			if(done){ return; }
			done = true;
			// Fallback path: never leave mainpart hidden if the overlay is forced off.
			revealMainpart();
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
