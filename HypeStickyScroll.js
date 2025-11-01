/*!
Hype Sticky Scroll 1.4.0
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
* 1.3.0 Added scene focus with setSceneFocus/clearSceneFocus, snapToBoundaries option, and viewportHeightUnit option
* 1.4.0 Added scroll snapping with setupScrollSnapping, scene-time based snap points, and asymmetric tolerance zones
*/

if ("HypeStickyScroll" in window === false) {
	window['HypeStickyScroll'] = (function () {
		// defaults
		let _default = {
			ignoreSceneSymbol: '🔒',
			wrapperHeight: 5000,
			autoScrollSpeed: 1, // Speed factor in thousands of pixels per second (1 = 1000px/s, 2 = 2000px/s, 0.5 = 500px/s)
			snapToBoundaries: true, // Enable scroll snapping to scene boundaries when focus is active
			updateOnFocus: true, // Trigger scroll handler immediately when setting focus
			viewportHeightUnit: 'dvh', // Viewport height unit for sticky element (dvh, vh, svh, lvh)
			lenis: false, // Enable Lenis smooth scroll integration
			lenisOptions: { // Default Lenis configuration
				duration: 1.2,
				easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
				direction: 'vertical',
				smooth: true
			},
			snapPoints: [], // Default snap points configuration
			snapTolerance: { // Default snap tolerance zones
				before: 200,
				after: 50
			},
			snapDelay: 1000, // Default snap delay in milliseconds
			snapDuration: 'auto', // Default snap animation duration
			snapEasing: 'inout' // Default snap easing
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
			hypeDocument.focusedScene = null;

			// Snap point tracking variables
			hypeDocument.snapEnabled = false;
			hypeDocument.snapPoints = [];
			hypeDocument.snapConfig = null;
			hypeDocument.snapTimeout = null;
			hypeDocument.lastScrollY = 0;
			hypeDocument.scrollVelocity = 0;

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

			// Set scene focus (lock to a specific scene)
			hypeDocument.setSceneFocus = function (sceneName) {
				hypeDocument.focusedScene = sceneName;
				// Trigger scroll handler to apply focus immediately
				if (getDefault('updateOnFocus')) {
					window.dispatchEvent(new Event('scroll'));
				}
			};

			// Clear scene focus (resume normal scrolling)
			hypeDocument.clearSceneFocus = function () {
				hypeDocument.focusedScene = null;
			};

			// Setup scroll snapping
			hypeDocument.setupScrollSnapping = function (options = {}) {
				// Guard: if sceneInfo not ready, retry next frame
				if (!hypeDocument.sceneInfo || hypeDocument.sceneInfo.length === 0) {
					requestAnimationFrame(() => hypeDocument.setupScrollSnapping(options));
					return;
				}

				// Merge with defaults
				const config = {
					snapPoints: options.snapPoints || getDefault('snapPoints') || [],
					tolerance: {
						before: options.tolerance?.before ?? getDefault('snapTolerance')?.before ?? 200,
						after: options.tolerance?.after ?? getDefault('snapTolerance')?.after ?? 50
					},
					delay: options.delay ?? getDefault('snapDelay') ?? 1000,
					duration: options.duration ?? getDefault('snapDuration') ?? 'auto',
					easing: options.easing ?? getDefault('snapEasing') ?? 'inout'
				};

				// Guard: Early return if no snap points provided
				if (!config.snapPoints || config.snapPoints.length === 0) {
					console.warn('HypeStickyScroll: setupScrollSnapping called without snap points. Snapping not enabled.');
					return;
				}

				// Normalize snap points to include pixel positions
				hypeDocument.snapPoints = config.snapPoints.map(point => {
					// Resolve 'end' keyword to scene duration
					let resolvedTime = point.time;
					if (point.time === 'end') {
						const sceneInfo = hypeDocument.sceneInfo.find(s => s.name === point.scene);
						resolvedTime = sceneInfo ? sceneInfo.duration : 0;
					}
					
					const progress = hypeDocument.getProgressFromSceneTime(point.scene, resolvedTime);
					const scrollY = hypeDocument.getScrollFromProgress(progress);
					
					return {
						scene: point.scene,
						time: resolvedTime,
						progress: progress,
						scrollY: scrollY,
						tolerance: {
							before: point.tolerance?.before ?? config.tolerance.before,
							after: point.tolerance?.after ?? config.tolerance.after
						}
					};
				});

				hypeDocument.snapConfig = config;
				hypeDocument.snapEnabled = true;
			};

			// Disable scroll snapping
			hypeDocument.disableScrollSnapping = function () {
				hypeDocument.snapEnabled = false;
				if (hypeDocument.snapTimeout) {
					clearTimeout(hypeDocument.snapTimeout);
					hypeDocument.snapTimeout = null;
				}
			};

			// Check if snapping is enabled
			hypeDocument.isScrollSnappingEnabled = function () {
				return hypeDocument.snapEnabled;
			};

			// Get the progress of the scroll
			hypeDocument.getProgress = function () {
				// Guard: if dependencies not ready, return 0
				if (!stickyElm || !wrapperElm) return 0;

				return getProgress(stickyElm, wrapperElm);
			};

			hypeDocument.getScrollFromProgress = function (progress) {
				// Guard: if dependencies not ready, return 0
				if (!wrapperElm) return 0;

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

				const sceneIndex = hypeDocument.sceneInfo.findIndex(s => s.name === sceneName);
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
					const wrapperStyle = getComputedStyle(wrapperElm);
					const wrapperPaddingTop = parseFloat(wrapperStyle.paddingTop);
					const wrapperHeightWithoutPadding = wrapperElm.clientHeight - (wrapperPaddingTop + parseFloat(wrapperStyle.paddingBottom));

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

				// Auto-initialize snap points from defaults if they exist
				const defaultSnapPoints = getDefault('snapPoints');
				if (defaultSnapPoints && defaultSnapPoints.length > 0) {
					hypeDocument.setupScrollSnapping();
				}

				// Stop setup returns
				delete (hypeDocument.runningStickySetup);
			});

			// Helper function to get scene boundaries
			function getSceneBoundaries(sceneName) {
				const sceneIndex = hypeDocument.sceneInfo.findIndex(s => s.name === sceneName);
				if (sceneIndex === -1) return null;

				let accumulatedDuration = 0;
				for (let i = 0; i < sceneIndex; i++) {
					accumulatedDuration += hypeDocument.sceneInfo[i].duration;
				}

				const sceneDuration = hypeDocument.sceneInfo[sceneIndex].duration;
				const totalDuration = hypeDocument.sceneInfo.reduce((t, s) => t + s.duration, 0);

				return {
					sceneIndex: sceneIndex,
					startProgress: accumulatedDuration / totalDuration,
					endProgress: (accumulatedDuration + sceneDuration) / totalDuration,
					startTime: accumulatedDuration,
					endTime: accumulatedDuration + sceneDuration,
					duration: sceneDuration
				};
			}

			// Setup scroll handler
			function scrollHandler() {

				// Only calculate if not currently waiting for rAF
				if (rAF) return;

				// Set the scroll position, calculate the percentage, calculate the current time
				const percentage = getProgress(stickyElm, wrapperElm);

				// Handle scroll snapping
				if (hypeDocument.snapEnabled && hypeDocument.snapPoints.length > 0) {
					const currentScrollY = getScrollY();
					
					// Calculate scroll velocity
					hypeDocument.scrollVelocity = Math.abs(currentScrollY - hypeDocument.lastScrollY);
					hypeDocument.lastScrollY = currentScrollY;

					// Clear existing snap timeout
					if (hypeDocument.snapTimeout) {
						clearTimeout(hypeDocument.snapTimeout);
						hypeDocument.snapTimeout = null;
					}

					// Set new snap timeout
					hypeDocument.snapTimeout = setTimeout(() => {
						// Find nearest snap point within tolerance
						let nearestSnapPoint = null;
						let minDistance = Infinity;

						for (const snapPoint of hypeDocument.snapPoints) {
							const distance = currentScrollY - snapPoint.scrollY;
							const absDistance = Math.abs(distance);
							
							// Check if within tolerance zone
							// distance > 0 means we're past the snap point (scrolled down beyond it)
							// distance < 0 means we're before the snap point (haven't reached it yet)
							const isPastSnapPoint = distance > 0;
							const tolerance = isPastSnapPoint ? snapPoint.tolerance.after : snapPoint.tolerance.before;
							
							if (absDistance <= tolerance && absDistance < minDistance) {
								minDistance = absDistance;
								nearestSnapPoint = snapPoint;
							}
						}

						// Snap to nearest point if found
						if (nearestSnapPoint) {
							hypeDocument.scrollToProgress(nearestSnapPoint.progress, {
								duration: hypeDocument.snapConfig.duration,
								easing: hypeDocument.snapConfig.easing
							});
						}
					}, hypeDocument.snapConfig.delay);
				}

				// Handle scene focus scroll clamping
				if (hypeDocument.focusedScene && getDefault('snapToBoundaries')) {
					const boundaries = getSceneBoundaries(hypeDocument.focusedScene);
					if (boundaries) {
						// If scrolled before scene start, jump to scene start
						if (percentage < boundaries.startProgress) {
							hypeDocument.scrollToProgress(boundaries.startProgress, { duration: 0 });
							return;
						}
						// If scrolled after scene end, jump to scene end
						if (percentage > boundaries.endProgress) {
							hypeDocument.scrollToProgress(boundaries.endProgress, { duration: 0 });
							return;
						}
					}
				}

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

				// If loop completed without breaking, we're at the last scene
				if (currentTimeInScene <= currentTime) {
					currentScene = hypeDocument.sceneInfo.length - 1;
					scene = hypeDocument.sceneInfo[currentScene];
				}

				// Calculate the time
				let time = currentTime - (currentTimeInScene - scene.duration);

				// Handle scene focus
				if (hypeDocument.focusedScene) {
					const focusedSceneIndex = hypeDocument.sceneInfo.findIndex(s => s.name === hypeDocument.focusedScene);
					if (focusedSceneIndex !== -1) {
						if (currentScene < focusedSceneIndex) {
							// Before focused scene - lock to first frame
							currentScene = focusedSceneIndex;
							scene = hypeDocument.sceneInfo[focusedSceneIndex];
							time = 0;
						} else if (currentScene > focusedSceneIndex) {
							// After focused scene - lock to last frame
							currentScene = focusedSceneIndex;
							scene = hypeDocument.sceneInfo[focusedSceneIndex];
							time = scene.duration;
						}
						// If currentScene === focusedSceneIndex, use calculated time (normal behavior)
					}
				}

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

				const sceneIndex = hypeDocument.sceneInfo.findIndex(s => s.name === sceneName);
				if (sceneIndex === -1) return; // Scene not found

				let accumulatedDuration = 0;

				for (let i = 0; i < sceneIndex; i++) {
					accumulatedDuration += hypeDocument.sceneInfo[i].duration;
				}

				const totalDuration = hypeDocument.sceneInfo.reduce((total, scene) => total + scene.duration, 0);
				const wrapperStyle = getComputedStyle(wrapperElm);
				const wrapperPaddingTop = parseFloat(wrapperStyle.paddingTop);
				const wrapperHeightWithoutPadding = wrapperElm.clientHeight - (wrapperPaddingTop + parseFloat(wrapperStyle.paddingBottom));
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
			const viewportUnit = getDefault('viewportHeightUnit');
			element.style.height = element.style.height.replace('%', viewportUnit);
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

				// Guard against division by zero when sticky fills wrapper
				if (wrapperOffset === 0) return 0;

				const progress = stickyOffset / wrapperOffset;
				return progress;
			}
		}

		/**
		 * @typedef {Object} HypeStickyScroll
		 * @property {String} version Version of the extension
		 */
		var HypeStickyScroll = {
			version: '1.4.0',
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