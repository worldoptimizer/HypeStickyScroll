
/*!
Hype Sticky Scroll 1.0.0
copyright (c) 2022 Max Ziebell, (https://maxziebell.de). MIT-license
*/


/*
* Version-History
* 1.0.0	Initial release under MIT-license
*/
if("HypeStickyScroll" in window === false) window['HypeStickyScroll'] = (function () {

	function HypeSceneLoad(hypeDocument, element, event) {
		if (hypeDocument.runningStickySetup !== undefined) {
			return hypeDocument.runningStickySetup;
		}
	}


	function HypeDocumentLoad(hypeDocument, element, event) {
		hypeDocument.runningStickySetup = false;
		
		// set the timer id, start and end values for the scroll position, total length of all hypeDocument.sceneInfo, 
		// scene names, current scene name, and create an array to store the scene info
		var rAF = null;
		var totalLength = 0;
		var sceneNames = hypeDocument.sceneNames();
		var currentScene = hypeDocument.currentSceneName();
		hypeDocument.sceneInfo = []
		
		// loop through the scene names, show the scene, get the duration of the timeline, 
		// add the duration to the total length, add the scene info to the array
		for (var i = 0; i < sceneNames.length; i++) {
			hypeDocument.showSceneNamed(sceneNames[i]);
			duration = hypeDocument.durationForTimelineNamed('timelineName');
			totalLength += duration;
			hypeDocument.sceneInfo.push({
				name: sceneNames[i], 
				duration: duration,
			});
		}
		
		// show the current scene, set the handler
		hypeDocument.showSceneNamed(currentScene);
		
		// stop setup returns
		delete (hypeDocument.runningStickySetup);
		
		// add wrapper and get variables
		makeSticky(document.getElementById(hypeDocument.documentId()), 5000)
		const stickyElm = document.querySelector('.sticky');
		const wrapperElm = document.querySelector('.wrapper');
		
		// setup scroll handler
		function scrollHandler() {
			
			// only calc if not currently waiting for rAF
			if(rAF) return;
			
			// set the scroll position, calculate the percentage, calculate the current time
			var percentage = getProgress(stickyElm, wrapperElm);
			if (hypeDocument.lastPercentage == percentage) return;
			hypeDocument.lastPercentage = percentage;
		
			var currentTime = percentage * totalLength;
			
			// set the current scene and time in scene, loop through the scene info
			var currentScene = 0;
			var currentTimeInScene = 0;
			var scene;
			for (var i = 0; i < hypeDocument.sceneInfo.length; i++) {
				
				// get the scene
				scene = hypeDocument.sceneInfo[i];
				
				// add the duration to the current time in scene
				currentTimeInScene += scene.duration;
		
				// check if the current time is greater than the current time in scene
				if (currentTimeInScene > currentTime) {
					
					// set the current scene
					currentScene = i;
					
					// break the loop
					break;
				}
			}
			
			// calculate the time
			var time = currentTime - (currentTimeInScene - scene.duration);
					
			// clear the timer id
			cancelAnimationFrame(rAF);
			
			// set the timer id
			rAF = requestAnimationFrame(function () {
				// change scene if needed
				if (hypeDocument.currentSceneName() != scene.name)
					hypeDocument.showSceneNamed(scene.name);
				
				// pause the timeline
				hypeDocument.pauseTimelineNamed('timelineName');
				
				// go to the time
				hypeDocument.goToTimeInTimelineNamed(time, 'timelineName');
				
				// reset rAF
				rAF = null
			});
			
		}
		
		hypeDocument.startStickyScroll = function(height){
			if (hypeDocument.isStickyScrollRunning) return;
			wrapperElm.style.height = height? height + 'px' : '5000px';
			hypeDocument.isStickyScrollRunning = true;
			window.addEventListener('scroll', scrollHandler);
			// call it initially
			window.dispatchEvent(new Event('scroll'));
		}
		
		hypeDocument.stopStickyScroll = function(){
			hypeDocument.isStickyScrollRunning = false;
			window.removeEventListener('scroll', scrollHandler);
		}
	
		hypeDocument.getProgress = function(){
			return getProgress(stickyElm, wrapperElm);
		}
		
	}
	
	if("HYPE_eventListeners" in window === false) { window.HYPE_eventListeners = Array(); }
	window.HYPE_eventListeners.unshift({type: "HypeDocumentLoad", callback: HypeDocumentLoad});
	window.HYPE_eventListeners.push({type: "HypeSceneLoad", callback: HypeSceneLoad});
	
	
	/**
	 * Makes an element sticky.
	 * @param {HTMLElement} element - The element to make sticky.
	 * @param {number} height - The height of the element.
	 * @returns {HTMLElement} The wrapper element.
	 */
	function makeSticky(element) {
		var parent = element.parentNode;
		var next = element.nextSibling;
		var container = document.createElement('div');
		container.classList.add('wrapper');
		container.style.position = 'relative';
		container.appendChild(element);
		element.style.position = 'sticky';
		element.classList.add('sticky');
		element.style.top = '0px';
		element.style.height = element.style.height.replace('%', 'vh');
		var style = document.createElement('style');
		style.innerHTML = '#' + element.id + ' { height: ' + element.style.height + ' !important; }';
		document.head.appendChild(style);
		if (next) {
			parent.insertBefore(container, next);
		} else {
			parent.appendChild(container);
		}
		return container;
	}	
	/**
	 * Get the progress of a sticky element within a wrapper element.
	 * @param {HTMLElement} sticky The sticky element.
	 * @param {HTMLElement} wrapper The wrapper element.
	 * @returns {number} The progress of the sticky element within the wrapper element.
	 */
	function getProgress(sticky, wrapper) {
		const stickyHeight = sticky.offsetHeight;
		const wrapperHeight = wrapper.offsetHeight;
		const stickyTop = sticky.getBoundingClientRect().top;
		const wrapperTop = wrapper.getBoundingClientRect().top;
		const stickyBottom = sticky.getBoundingClientRect().bottom;
		const wrapperBottom = wrapper.getBoundingClientRect().bottom;
	
		if (stickyBottom < wrapperTop) {
			return 0;
		} else if (stickyTop > wrapperBottom) {
			return 1;
		} else {
			const stickyOffset = stickyTop - wrapperTop;
			const wrapperOffset = wrapperHeight - stickyHeight;console.log(stickyOffset, wrapperOffset, stickyOffset / wrapperOffset )
			return (stickyOffset / wrapperOffset);
		}
	}

	
	/**
	 * @typedef {Object} HypeStickyScroll
	 * @property {String} version Version of the extension
	 */
	 var HypeStickyScroll = {
		version: '1.0.0',
	};

	/** 
	 * Reveal Public interface to window['HypeStickyScroll']
	 * return {HypeStickyScroll}
	 */
	return HypeStickyScroll;
	
})();
