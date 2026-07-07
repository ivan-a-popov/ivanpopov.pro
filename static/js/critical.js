"use strict";
// Critical, inlined by stamp-cache.sh between the CRITICAL JS markers in
// index.html. Its only job: dismiss the preloader as soon as the above-the-fold
// is ready (style.css applied + hero image decoded), independent of the deferred
// init.js. A hard timeout guarantees the overlay never traps the user.
(function(){
	function dismiss(preloader){
		preloader.classList.add('preloaded');
		// Remove after curtain peel finishes (500ms delay + 500ms scaleX).
		setTimeout(function(){
			if(preloader.parentNode){ preloader.remove(); }
		}, 1000);
	}
	function whenStylesReady(){
		// .ip_mainpart is hidden by critical.css and flips to visible only once
		// style.css applies, so its computed visibility is the reveal signal.
		return new Promise(function(resolve){
			var mainpart = document.querySelector('.ip_mainpart');
			if(!mainpart){ resolve(); return; }
			(function poll(){
				if(getComputedStyle(mainpart).visibility === 'visible'){ resolve(); return; }
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
	// Line growth is a 1000ms height keyframe on .loader_line::before; curtain peel
	// must not start until that animation finishes (see critical.css).
	function whenLineGrown(){
		var LINE_MS = 1000;
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
				if(e.animationName === 'lineheight'){ finish(); }
			});
			setTimeout(finish, LINE_MS);
		});
	}
	function start(){
		var preloader = document.getElementById('preloader');
		if(!preloader){ return; }
		var done = false;
		function finish(){
			if(done){ return; }
			done = true;
			dismiss(preloader);
		}
		var fallback = setTimeout(finish, 4000);
		Promise.all([
			whenStylesReady().then(whenHeroReady),
			whenLineGrown()
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
