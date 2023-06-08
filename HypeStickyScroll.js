/*!
Hype Sticky Scroll 1.0.5
Copyright (c) 2022 Max Ziebell, (https://maxziebell.de). MIT-license
*/

/*
* Version-History
* 1.0.0 Initial release under MIT-license
* 1.0.1 Modernized code and cleanup 
* 1.0.2 Added a way to ignore scenes and callbacks
* 1.0.3 Added function callbacks stickyScrollBefore and stickyScrollAfter
* 1.0.4 HypeDocumentLoad set to push on HYPE_eventListeners (instead of unshift)
* 1.0.5 Added getScrollFromProgress
*/

if ("HypeStickyScroll" in window === false) { window['HypeStickyScroll'] = (function () {
		// defaults
		let _default = {
			ignoreSceneSymbol: '🔒',
			wrapperHeight: 5000,
		};
		/**
		 * This function allows to override a global default by key or if a object is given as key to override all default at once
		 *
		 * @param {String} key This is the key to override
		 * @param {String|Function|Object} value This is the value to set for the key
		 */
		function setDefault(key, value) {
			//allow setting all defaults
			if (typeof (key) == 'object') {
				_default = key;
				return;
			}

			//set specific default
			_default[key] = value;
		}

		/**
		 * This function returns the value of a default by key or all default if no key is given
		 *
		 * @param {String} key This the key of the default.
		 * @return Returns the current value for a default with a certain key.
		 */
		function getDefault(key) {
			// return all defaults if no key is given
			if (!key) return _default;

			// return specific default
			return _default[key];
		}

		/**
		 * Returns the running sticky setup
		 * @param {any} hypeDocument - The Hype document object.
		 * @returns {any} The running sticky setup.
		 */
		function HypeSceneLoad(hypeDocument, element, event) {
			if (hypeDocument.runningStickySetup !== undefined) {
				return hypeDocument.runningStickySetup;
			}
		}

		/**
		 * Loads the Hype document.
		 * @param {any} hypeDocument - The Hype document object.
		 */
		function HypeDocumentLoad(hypeDocument, element, event) {
			// Add wrapper and get variables
			const wrapperElm = makeSticky(document.getElementById(hypeDocument.documentId()));
			const stickyElm = document.querySelector('.sticky');

			// Set the timer id, start and end values for the scroll position, total length of all hypeDocument.sceneInfo,
			// scene names, current scene name, and create an array to store the scene info
			let rAF = null;
			let totalLength = 0;
			const sceneNames = hypeDocument.sceneNames().filter((name) => !name.startsWith(getDefault('ignoreSceneSymbol')));
			const currentScene = hypeDocument.currentSceneName();
			hypeDocument.sceneInfo = [];

			// Set the tracking variables
			hypeDocument.runningStickySetup = false;

			// enable the sticky scroll
			hypeDocument.enableStickyScroll = function (height) {
				if (hypeDocument.isStickyScrollRunning) return;
				wrapperElm.style.height = height ? height + 'px' : getDefault('wrapperHeight')+'px';
				hypeDocument.isStickyScrollRunning = true;
				requestAnimationFrame(function () {
					window.addEventListener('scroll', scrollHandler);
					// Call it initially
					window.dispatchEvent(new Event('scroll'));
				});
			};

			// disable the sticky scroll
			hypeDocument.disableStickyScroll = function () {
				hypeDocument.isStickyScrollRunning = false;
				window.removeEventListener('scroll', scrollHandler);
			};

			// Get the progress of the scroll
			hypeDocument.getProgress = function () {
				return getProgress(stickyElm, wrapperElm);
			};

			hypeDocument.getScrollFromProgress = function (progress) {
				const wrapperElm = document.querySelector('.wrapper');
				const wrapperStyle = getComputedStyle(wrapperElm);
				const wrapperPaddingTop = parseFloat(wrapperStyle.paddingTop);
				const wrapperHeightWithoutPadding = wrapperElm.clientHeight - (wrapperPaddingTop + parseFloat(wrapperStyle.paddingBottom));
				const scrollPosition = progress * (wrapperHeightWithoutPadding - window.innerHeight) + wrapperPaddingTop;

				return Math.ceil(scrollPosition);
			};


			// Loop through the scene names, show the scene, get the duration of the timeline,
			// add the duration to the total length, add the scene info to the array
			for (let i = 0; i < sceneNames.length; i++) {
				hypeDocument.showSceneNamed(sceneNames[i]);
				const duration = hypeDocument.durationForTimelineNamed('timelineName');
				totalLength += duration;
				hypeDocument.sceneInfo.push({
					name: sceneNames[i],
					duration: duration,
					layouts: hypeDocument.layoutsForSceneNamed(sceneNames[i])
				});
			}

			// Revert back to the (initial) current scene, set the handler
			hypeDocument.showSceneNamed(currentScene);

			// Stop setup returns
			delete(hypeDocument.runningStickySetup);

			// Setup scroll handler
			function scrollHandler() {

				// Only calculate if not currently waiting for rAF
				if (rAF) return;

				// Set the scroll position, calculate the percentage, calculate the current time
				const percentage = getProgress(stickyElm, wrapperElm);

				const currentTime = percentage * totalLength;

				// Set the current scene and time in scene, loop through the scene info
				let currentScene = 0;
				let currentTimeInScene = 0;
				let scene;
				for (let i = 0; i < hypeDocument.sceneInfo.length; i++) {
					// Get the scene
					scene = hypeDocument.sceneInfo[i];

					// Add the duration to the current time in scene
					currentTimeInScene += scene.duration;

					// Check if the current time is greater than the current time in scene
					if (currentTimeInScene > currentTime) {
						// Set the current scene
						currentScene = i;
						// Break the loop
						break;
					}
				}

				// Calculate the time
				const time = currentTime - (currentTimeInScene - scene.duration);

				// Clear the timer id
				cancelAnimationFrame(rAF);

				// Set the timer id
				rAF = requestAnimationFrame(function () {
					// Change scene if needed
					if (hypeDocument.currentSceneName() != scene.name)
						hypeDocument.showSceneNamed(scene.name);

					// Pause the timeline
					hypeDocument.pauseTimelineNamed('timelineName');

					// Go to the time
					hypeDocument.goToTimeInTimelineNamed(time, 'timelineName');

					// only trigger custom behavior if the percentage has changed
					if (hypeDocument.lastPercentage !== percentage) {

						hypeDocument.lastPercentage = percentage;
						// Trigger custom behavior 
						if (percentage === 0) {
							hypeDocument.triggerCustomBehaviorNamed('stickyScrollBefore');
							if (hypeDocument.functions()['stickyScrollBefore'] !== undefined) {
								hypeDocument.functions()['stickyScrollBefore'](hypeDocument, element, event);
							}
						} else if (percentage === 1) {
							hypeDocument.triggerCustomBehaviorNamed('stickyScrollAfter');
							if (hypeDocument.functions()['stickyScrollAfter'] !== undefined) {
								hypeDocument.functions()['stickyScrollAfter'](hypeDocument, element, event);
							}
						}
					}
					// Reset rAF
					rAF = null;
				});
			}

			// Get the progress of the scroll
			hypeDocument.scrollToSceneStart = function (sceneName, duration = 0, easing = 'linear') {

				const sceneIndex = hypeDocument.sceneNames().indexOf(sceneName);
				let accumulatedDuration = 0;

				for (let i = 0; i < sceneIndex; i++) {
					accumulatedDuration += hypeDocument.sceneInfo[i].duration;
				}

				const totalDuration = hypeDocument.sceneInfo.reduce((total, scene) => total + scene.duration, 0);
				const wrapper = document.querySelector('.wrapper');
				const wrapperStyle = getComputedStyle(wrapper);
				const wrapperPaddingTop = parseFloat(wrapperStyle.paddingTop);
				const wrapperHeightWithoutPadding = wrapper.clientHeight - (wrapperPaddingTop + parseFloat(wrapperStyle.paddingBottom));
				const scrollPosition = Math.ceil((accumulatedDuration / totalDuration) * (wrapperHeightWithoutPadding - window.innerHeight) + wrapperPaddingTop);

				if (duration === 0) {
					window.scrollTo({
						top: scrollPosition,
						behavior: 'auto'
					});
				} else {
					const start = performance.now();
					const startPosition = window.scrollY;
					const distance = scrollPosition - startPosition;

					if (duration === "auto") {
						duration = Math.abs(distance);
					}

					requestAnimationFrame(function step(timestamp) {
						const progress = Math.min((timestamp - start) / duration, 1);
						const easedProgress = applyEasing(progress, easing);
						const currentScrollPosition = startPosition + (distance * easedProgress);
						window.scrollTo({
							top: currentScrollPosition
						});

						if (progress < 1) {
							requestAnimationFrame(step);
						} 
					});

				}
			};

			function applyEasing(t, easing) {
				switch (easing) {
					case 'in':
						return t * t;
					case 'out':
						return t * (2 - t);
					case 'inout':
						return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
					default:
						return t;
				}
			}
		}

		if ("HYPE_eventListeners" in window === false) { window.HYPE_eventListeners = Array(); }
		window.HYPE_eventListeners.push({type: "HypeDocumentLoad", callback: HypeDocumentLoad});
		window.HYPE_eventListeners.push({ type: "HypeSceneLoad", callback: HypeSceneLoad});

		/**
		 * Makes an element sticky.
		 * @param {HTMLElement} element - The element to make sticky.
		 * @param {number} height - The height of the element.
		 * @returns {HTMLElement} The wrapper element.
		 */
		function makeSticky(element) {
			const parent = element.parentNode;
			const next = element.nextSibling;
			const container = document.createElement('div');
			container.classList.add('wrapper');
			container.style.position = 'relative';
			container.appendChild(element);
			element.style.position = 'sticky';
			element.classList.add('sticky');
			element.style.top = '0px';
			element.style.height = element.style.height.replace('%', 'vh');
			const style = document.createElement('style');
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
			const stickyHeight = sticky.clientHeight;

			const stickyStyle = getComputedStyle(sticky);
			const wrapperStyle = getComputedStyle(wrapper);
			const stickyPaddingTop = parseFloat(stickyStyle.paddingTop);
			const wrapperPaddingTop = parseFloat(wrapperStyle.paddingTop);
			const stickyPaddingBottom = parseFloat(stickyStyle.paddingBottom);
			const wrapperPaddingBottom = parseFloat(wrapperStyle.paddingBottom);

			const wrapperHeight = wrapper.clientHeight - (wrapperPaddingTop + wrapperPaddingBottom);

			const stickyTop = sticky.getBoundingClientRect().top + stickyPaddingTop;
			const wrapperTop = wrapper.getBoundingClientRect().top + wrapperPaddingTop;
			const stickyBottom = sticky.getBoundingClientRect().bottom - stickyPaddingBottom;
			const wrapperBottom = wrapper.getBoundingClientRect().bottom - wrapperPaddingBottom;

			const windowHeight = window.innerHeight;


			if (stickyBottom < wrapperTop) {
				return 0;
			} else if (stickyTop > wrapperBottom) {
				return 1;
			} else {
				const stickyOffset = stickyTop - wrapperTop;
				const wrapperOffset = wrapperHeight - stickyHeight;
				const progress = stickyOffset / wrapperOffset;
				return progress;
			}
		}

		/**
		 * @typedef {Object} HypeStickyScroll
		 * @property {String} version Version of the extension
		 */
		var HypeStickyScroll = {
			version: '1.0.5',
			getDefault: getDefault,
			setDefault: setDefault,
		};

		/**
		 * Reveal Public interface to window['HypeStickyScroll']
		 * return {HypeStickyScroll}
		 */
		return HypeStickyScroll;

	})();
}
