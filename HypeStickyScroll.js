/*!
Hype Sticky Scroll 1.2.0
Copyright (c) 2022-2025 Max Ziebell, (https://maxziebell.de). MIT-license
*/

/*
* Version-History
* 1.0.0 Initial release under MIT-license
* 1.0.1 Modernized code and cleanup 
* 1.0.2 Added a way to ignore scenes and callbacks
* 1.0.3 Added function callbacks stickyScrollBefore and stickyScrollAfter
* 1.0.4 HypeDocumentLoad set to push on HYPE_eventListeners (instead of unshift)
* 1.0.5 Added getScrollFromProgress
* 1.0.6 Added scrollToProgress, refactored scrollToSceneStart with options object and offset support
* 1.0.7 Deferred DOM setup with requestAnimationFrame, added guard patterns to prevent extension conflicts
* 1.0.8 Added autoScrollSpeed setting and improved scroll animation comments
* 1.0.9 Changed duration parameter from milliseconds to seconds for consistency
* 1.1.0 Added Lenis smooth scroll support with auto-detection and setupLenis helper function
* 1.2.0 Added getProgressFromSceneTime and scrollToSceneTime for scene-time based navigation
*/

if ("HypeStickyScroll" in window === false) {
	window['HypeStickyScroll'] = (function () {
		// defaults
		let _default = {
			ignoreSceneSymbol: '🔒',
			wrapperHeight: 5000,
			autoScrollSpeed: 1, // Speed factor in thousands of pixels per second (1 = 1000px/s, 2 = 2000px/s, 0.5 = 500px/s)
			lenis: false, // Enable Lenis smooth scroll integration
			lenisOptions: { // Default Lenis configuration
				duration: 1.2,
				easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
				direction: 'vertical',
				smooth: true
			}
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
		 * Get the Lenis instance if available
		 * @returns {Object|null} The Lenis instance or null
		 */
		function getLenis() {
			return window.lenis || null;
		}

		/**
		 * Get current scroll position (Lenis-aware)
		 * @returns {number} Current scroll position
		 */
		function getScrollY() {
			const lenis = getLenis();
			return lenis ? lenis.animatedScroll : window.scrollY;
		}

		/**
		 * Setup Lenis smooth scroll (helper function for non-technical users)
		 * @param {Object} options Optional Lenis configuration
		 * @returns {Object} The Lenis instance
		 */
		function setupLenis(options = {}) {
			// Check if Lenis library is loaded
			if (typeof Lenis === 'undefined') {
				console.error('HypeStickyScroll: Lenis library not found. Please load Lenis before calling setupLenis()');
				return null;
			}

			// Merge user options with defaults
			const lenisOptions = Object.assign({}, getDefault('lenisOptions'), options);

			// Create Lenis instance
			const lenis = new Lenis(lenisOptions);

			// Setup RAF loop
			function raf(time) {
				lenis.raf(time);
				requestAnimationFrame(raf);
			}
			requestAnimationFrame(raf);

			// Store globally for detection
			window.lenis = lenis;

			// Enable Lenis mode
			setDefault('lenis', true);

			return lenis;
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
			// Store references that will be set after DOM setup
			let wrapperElm = null;
			let stickyElm = null;

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
				// Guard: if dependency not ready, retry next frame
				if (!wrapperElm) {
					requestAnimationFrame(() => hypeDocument.enableStickyScroll(height));
					return;
				}

				if (hypeDocument.isStickyScrollRunning) return;
				wrapperElm.style.height = height ? height + 'px' : getDefault('wrapperHeight') + 'px';
				hypeDocument.isStickyScrollRunning = true;
				requestAnimationFrame(function () {
					const lenis = getLenis();
					if (lenis) {
						// Use Lenis scroll event
						lenis.on('scroll', scrollHandler);
					} else {
						// Use native scroll
						window.addEventListener('scroll', scrollHandler);
						// Call it initially
						window.dispatchEvent(new Event('scroll'));
					}
				});
			};

			// disable the sticky scroll
			hypeDocument.disableStickyScroll = function () {
				hypeDocument.isStickyScrollRunning = false;
				const lenis = getLenis();
				if (lenis) {
					lenis.off('scroll', scrollHandler);
				} else {
					window.removeEventListener('scroll', scrollHandler);
				}
			};

			// Get the progress of the scroll
			hypeDocument.getProgress = function () {
				// Guard: if dependencies not ready, return 0
				if (!stickyElm || !wrapperElm) return 0;

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

			// Get progress from scene name and time in scene
			hypeDocument.getProgressFromSceneTime = function (sceneName, timeInScene) {
				// Guard: if sceneInfo not ready, return 0
				if (!hypeDocument.sceneInfo || hypeDocument.sceneInfo.length === 0) return 0;

				const sceneIndex = hypeDocument.sceneNames().indexOf(sceneName);
				if (sceneIndex === -1) return 0; // Scene not found

				let accumulatedTime = 0;

				// Add all previous scenes' durations
				for (let i = 0; i < sceneIndex; i++) {
					accumulatedTime += hypeDocument.sceneInfo[i].duration;
				}

				// Add time within the target scene (clamped to scene duration)
				const sceneDuration = hypeDocument.sceneInfo[sceneIndex].duration;
				accumulatedTime += Math.max(0, Math.min(timeInScene, sceneDuration));

				// Calculate total duration
				const totalDuration = hypeDocument.sceneInfo.reduce((total, scene) => total + scene.duration, 0);

				return accumulatedTime / totalDuration;
			};

			// Scroll to a progress value (0-1)
			hypeDocument.scrollToProgress = function (progress, options = {}) {
				// Default options (duration in seconds)
				const {
					duration = 0,
					easing = 'inout',
					offset = 0
				} = options;

				// Clamp progress between 0 and 1
				progress = Math.max(0, Math.min(1, progress));

				// Get the scroll position for this progress value
				let scrollPosition = hypeDocument.getScrollFromProgress(progress);

				// Apply offset (fractional 0-1, percentage string, or pixel string)
				if (offset !== 0) {
					const wrapper = document.querySelector('.wrapper');
					const wrapperStyle = getComputedStyle(wrapper);
					const wrapperPaddingTop = parseFloat(wrapperStyle.paddingTop);
					const wrapperHeightWithoutPadding = wrapper.clientHeight - (wrapperPaddingTop + parseFloat(wrapperStyle.paddingBottom));

					if (typeof offset === 'string' && offset.endsWith('%')) {
						// Percentage offset
						const percentValue = parseFloat(offset) / 100;
						scrollPosition += percentValue * (wrapperHeightWithoutPadding - window.innerHeight);
					} else if (typeof offset === 'string' && offset.endsWith('px')) {
						// Pixel offset
						scrollPosition += parseFloat(offset);
					} else {
						// Number = Fractional progress offset (0-1)
						scrollPosition += parseFloat(offset) * (wrapperHeightWithoutPadding - window.innerHeight);
					}
				}

				const lenis = getLenis();

				// Instant scroll (no animation)
				if (duration === 0) {
					if (lenis) {
						lenis.scrollTo(scrollPosition, { immediate: true });
						// Force scroll handler to refresh screen after immediate Lenis scroll
						requestAnimationFrame(() => {
							window.dispatchEvent(new Event('scroll'));
						});
					} else {
						window.scrollTo({
							top: scrollPosition,
							behavior: 'auto'
						});
					}
				} else {
					if (lenis) {
						// Use Lenis smooth scroll (duration in seconds)
						let finalDuration = duration;
						if (duration === "auto") {
							const distance = Math.abs(scrollPosition - getScrollY());
							finalDuration = distance / getDefault('autoScrollSpeed') / 1000; // Convert ms to seconds
						}
						lenis.scrollTo(scrollPosition, {
							duration: finalDuration,
							easing: easing === 'linear' ? (t) => t :
								easing === 'in' ? (t) => t * t :
									easing === 'out' ? (t) => t * (2 - t) :
										(t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
						});
					} else {
						// Animated scroll with easing (native - convert seconds to ms)
						const start = performance.now();
						const startPosition = window.scrollY;
						const distance = scrollPosition - startPosition;

						// Calculate final duration in ms (auto = configured speed factor)
						let finalDuration = duration * 1000; // Convert seconds to milliseconds
						if (duration === "auto") {
							finalDuration = Math.abs(distance) / getDefault('autoScrollSpeed');
						}

						// Animation loop
						requestAnimationFrame(function step(timestamp) {
							const progressValue = Math.min((timestamp - start) / finalDuration, 1);
							const easedProgress = applyEasing(progressValue, easing);
							const currentScrollPosition = startPosition + (distance * easedProgress);
							window.scrollTo({
								top: currentScrollPosition
							});

							// Continue animation until complete
							if (progressValue < 1) {
								requestAnimationFrame(step);
							}
						});
					}
				}
			};

			// Defer DOM modifications to avoid conflicts with other extensions
			requestAnimationFrame(function () {
				// Add wrapper and get variables
				wrapperElm = makeSticky(document.getElementById(hypeDocument.documentId()));
				stickyElm = document.querySelector('.sticky');

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
				delete (hypeDocument.runningStickySetup);
			});

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

			// Scroll to the start of a scene
			hypeDocument.scrollToSceneStart = function (sceneName, options = {}) {
				// Guard: if sceneInfo not ready, retry next frame
				if (!hypeDocument.sceneInfo || hypeDocument.sceneInfo.length === 0) {
					requestAnimationFrame(() => hypeDocument.scrollToSceneStart(sceneName, options));
					return;
				}

				// Default options (duration in seconds)
				const {
					duration = 0,
					easing = 'linear',
					offset = 0
				} = options;

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
				let scrollPosition = Math.ceil((accumulatedDuration / totalDuration) * (wrapperHeightWithoutPadding - window.innerHeight) + wrapperPaddingTop);

				// Apply offset (fractional 0-1, percentage string, or pixel string)
				if (offset !== 0) {
					if (typeof offset === 'string' && offset.endsWith('%')) {
						// Percentage offset
						const percentValue = parseFloat(offset) / 100;
						scrollPosition += percentValue * (wrapperHeightWithoutPadding - window.innerHeight);
					} else if (typeof offset === 'string' && offset.endsWith('px')) {
						// Pixel offset
						scrollPosition += parseFloat(offset);
					} else {
						// Number = Fractional progress offset (0-1)
						scrollPosition += parseFloat(offset) * (wrapperHeightWithoutPadding - window.innerHeight);
					}
				}

				const lenis = getLenis();

				// Instant scroll (no animation)
				if (duration === 0) {
					if (lenis) {
						lenis.scrollTo(scrollPosition, { immediate: true });
						// Force scroll handler to refresh screen after immediate Lenis scroll
						requestAnimationFrame(() => {
							window.dispatchEvent(new Event('scroll'));
						});
					} else {
						window.scrollTo({
							top: scrollPosition,
							behavior: 'auto'
						});
					}
				} else {
					if (lenis) {
						// Use Lenis smooth scroll (duration in seconds)
						let finalDuration = duration;
						if (duration === "auto") {
							const distance = Math.abs(scrollPosition - getScrollY());
							finalDuration = distance / getDefault('autoScrollSpeed') / 1000; // Convert ms to seconds
						}
						lenis.scrollTo(scrollPosition, {
							duration: finalDuration,
							easing: easing === 'linear' ? (t) => t :
								easing === 'in' ? (t) => t * t :
									easing === 'out' ? (t) => t * (2 - t) :
										(t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
						});
					} else {
						// Animated scroll with easing (native - convert seconds to ms)
						const start = performance.now();
						const startPosition = window.scrollY;
						const distance = scrollPosition - startPosition;

						// Calculate final duration in ms (auto = configured speed factor)
						let finalDuration = duration * 1000; // Convert seconds to milliseconds
						if (duration === "auto") {
							finalDuration = Math.abs(distance) / getDefault('autoScrollSpeed');
						}

						// Animation loop
						requestAnimationFrame(function step(timestamp) {
							const progress = Math.min((timestamp - start) / finalDuration, 1);
							const easedProgress = applyEasing(progress, easing);
							const currentScrollPosition = startPosition + (distance * easedProgress);
							window.scrollTo({
								top: currentScrollPosition
							});

							// Continue animation until complete
							if (progress < 1) {
								requestAnimationFrame(step);
							}
						});
					}
				}
			};

			// Scroll to a specific time in a scene
			hypeDocument.scrollToSceneTime = function (sceneName, timeInScene, options = {}) {
				// Guard: if sceneInfo not ready, retry next frame
				if (!hypeDocument.sceneInfo || hypeDocument.sceneInfo.length === 0) {
					requestAnimationFrame(() => hypeDocument.scrollToSceneTime(sceneName, timeInScene, options));
					return;
				}

				// Get progress from scene + time
				const progress = hypeDocument.getProgressFromSceneTime(sceneName, timeInScene);

				// Use existing scrollToProgress
				hypeDocument.scrollToProgress(progress, options);
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
		window.HYPE_eventListeners.push({ type: "HypeDocumentLoad", callback: HypeDocumentLoad });
		window.HYPE_eventListeners.push({ type: "HypeSceneLoad", callback: HypeSceneLoad });

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
			version: '1.2.0',
			getDefault: getDefault,
			setDefault: setDefault,
			setupLenis: setupLenis,
		};

		/**
		 * Reveal Public interface to window['HypeStickyScroll']
		 * return {HypeStickyScroll}
		 */
		return HypeStickyScroll;

	})();
}