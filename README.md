# Hype Sticky Scroll
![](https://playground.maxziebell.de/Hype/StickyScroll/HypeStickyScroll.jpg)

Introducing Hype Sticky Scroll, a powerful and versatile tool that unlocks the potential of scroll-driven animations in your Tumult Hype projects. With this plugin, create seamless and engaging scroll-based experiences that respond dynamically to user interactions.

Key features include:

* **Scene filtering and ignoring**: Choose which scenes to include or exclude from the sticky scroll animation (just add 🔒 to the scene name).
* **Customizable wrapper height**: Adjust the height of the wrapper to fit your content and design.
* **Function callbacks**: Implement custom behaviors with the stickyScrollBefore and stickyScrollAfter callbacks.
* **Progress tracking**: Monitor the scroll progress and control playback of your animations.
* **Smooth scene navigation**: Scroll to specific scenes or progress values with customizable durations, easing, and offsets.
* **Scene-time navigation**: Scroll to specific timeline positions within scenes for precise animation control.
* **Scroll snapping**: Automatically snap to predefined points with configurable tolerance zones and timing.
* **Lenis smooth scroll integration**: Optional support for buttery-smooth scrolling with Lenis library.
* **Auto-scroll speed control**: Configurable automatic scroll duration based on distance.

## Content Delivery Network (CDN)
Latest version can be linked into your project using the following in the head section of your project:
```html
<script src="https://cdn.jsdelivr.net/gh/worldoptimizer/HypeStickyScroll/HypeStickyScroll.min.js"></script>
```

Optionally you can also link a SRI version or specific releases. Read more about that on the JsDelivr (CDN) page for this extension at https://www.jsdelivr.com/package/gh/worldoptimizer/HypeStickyScroll

Learn how to use the latest extension version and how to combine extensions into one file at https://github.com/worldoptimizer/HypeCookBook/wiki/Including-external-files-and-Hype-extensions


---


# Documentation

The Hype Sticky Scroll extension allows you to create a sticky scroll effect in your Tumult Hype projects. The extension provides an easy way to control the scroll progress and switch between scenes within a Hype document.

## Getting Started

Include the Hype Sticky Scroll script in the head of your HTML document either through the resources library or using a CDN.

## FAQ

**Q: How do I enable the sticky scroll effect?**

A: You can enable the sticky scroll effect by calling the `enableStickyScroll` function on the Hype document object like this:

```javascript
hypeDocument.enableStickyScroll(height);
```

Replace `height` with your desired height value in pixels.

**Q: How do I disable the sticky scroll effect?**

A: You can disable the sticky scroll effect by calling the `disableStickyScroll` function on the Hype document object like this:

```javascript
hypeDocument.disableStickyScroll();
```

**Q: How do I exclude certain scenes from the sticky scroll calculation?**

A: To exclude specific scenes from the sticky scroll effect, simply include the 🔒 symbol in the scene's name. This tells the Hype Sticky Scroll extension to ignore that scene when calculating the total length of the scroll effect.

**Q: How can I get the current scroll progress?**

A: You can get the current scroll progress by calling the `getProgress` function on the Hype document object like this:

```javascript
hypeDocument.getProgress();
```

This function returns a value between 0 and 1, representing the scroll progress.

**Q: How can I scroll to a specific progress value?**

A: You can scroll to a specific progress value (0-1) using the `scrollToProgress` function:

```javascript
// Instant scroll to 50% progress
hypeDocument.scrollToProgress(0.5);

// Animated scroll with options (duration in seconds)
hypeDocument.scrollToProgress(0.5, {
    duration: 1.5,        // 1.5 seconds
    easing: 'inout',      // 'linear', 'in', 'out', 'inout'
    offset: 0.1           // Additional 10% offset (also accepts '10%' or '50px')
});

// Auto-duration based on distance
hypeDocument.scrollToProgress(0.8, {
    duration: 'auto',     // Duration calculated by distance * autoScrollSpeed
    easing: 'out'
});
```

**Q: How can I scroll to the start of a scene?**

A: You can scroll to the start of a scene using the `scrollToSceneStart` function with an options object:

```javascript
// Instant scroll
hypeDocument.scrollToSceneStart('Scene 2');

// Animated scroll with options (duration in seconds)
hypeDocument.scrollToSceneStart('Scene 2', {
    duration: 2,          // 2 seconds
    easing: 'inout',      // 'linear', 'in', 'out', 'inout'
    offset: '5%'          // Offset by 5% (also accepts 0.05 or '50px')
});

// Auto-duration based on distance
hypeDocument.scrollToSceneStart('Scene 3', {
    duration: 'auto'
});
```

**Q: How can I scroll to a specific time within a scene?**

A: You can scroll to a specific timeline position within a scene using the `scrollToSceneTime` function:

```javascript
// Instant scroll to 3.5 seconds into Scene 2
hypeDocument.scrollToSceneTime('Scene 2', 3.5);

// Animated scroll with options
hypeDocument.scrollToSceneTime('Scene 2', 3.5, {
    duration: 1.5,
    easing: 'inout',
    offset: 0.05
});
```

You can also get the progress value for any scene and time:

```javascript
// Get progress for Scene 2 at 3.5 seconds
const progress = hypeDocument.getProgressFromSceneTime('Scene 2', 3.5);
console.log(progress); // e.g., 0.45
```

**Q: How do I use Lenis smooth scrolling?**

A: First, load the Lenis library, then use the simple setup function:

```html
<!-- Load Lenis library -->
<script src="https://unpkg.com/lenis@latest/dist/lenis.min.js"></script>

<!-- Load Hype Sticky Scroll -->
<script src="HypeStickyScroll.min.js"></script>

<!-- Setup Lenis (in your Hype function or custom JavaScript) -->
<script>
    // Simple setup with defaults
    HypeStickyScroll.setupLenis();

    // Or with custom options
    HypeStickyScroll.setupLenis({
        duration: 1.5,
        easing: (t) => t,
        direction: 'vertical'
    });
</script>
```

The extension will automatically detect Lenis and use it for smooth scrolling. All `scrollToProgress` and `scrollToSceneStart` functions will work seamlessly with Lenis.

**Q: How can I configure the auto-scroll speed?**

A: You can set the `autoScrollSpeed` default to control how fast "auto" duration scrolls:

```javascript
// Default is 1 (1000px/s)
HypeStickyScroll.setDefault('autoScrollSpeed', 2); // 2000px/s (faster)
HypeStickyScroll.setDefault('autoScrollSpeed', 0.5); // 500px/s (slower)
```

**Q: How do I setup scroll snapping?**

A: Scroll snapping automatically snaps to predefined points after the user stops scrolling:

```javascript
// Setup snap points for specific scenes and times
hypeDocument.setupScrollSnapping({
    snapPoints: [
        { scene: 'Intro', time: 0 },
        { scene: 'Chapter 1', time: 0 },
        { scene: 'Chapter 1', time: 2.5 },
        { scene: 'Chapter 2', time: 0 }
    ],
    tolerance: {
        before: 200,   // Snap within 200px before reaching point
        after: 50      // Snap within 50px after passing point
    },
    delay: 1000,       // Wait 1s after scroll stops
    duration: 'auto',  // Auto-calculate animation duration
    easing: 'inout'
});
```

You can also set default snap points globally that apply automatically:

```javascript
// Set defaults BEFORE Hype document loads
HypeStickyScroll.setDefault('snapPoints', [
    { scene: 'Intro', time: 0 },
    { scene: 'Chapter 1', time: 0 },
    { scene: 'Chapter 2', time: 0 }
]);

// Snap points automatically initialize when document loads
// No need to call setupScrollSnapping()
```

Control snapping:
```javascript
hypeDocument.disableScrollSnapping();           // Disable
hypeDocument.isScrollSnappingEnabled();         // Check status
```

**Note:** If `setupScrollSnapping()` is called without snap points (and no defaults are set), it will return early without enabling snapping.

**Q: How do I debug snap points visually?**

A: Enable debug mode to see a clean visual indicator on the right side of the screen:

```javascript
// Enable debug visualization
HypeStickyScroll.setDefault('debug', true);
```

**Debug visualization shows:**
- **White horizontal line**: Your current scroll position with scene name and time (e.g., "Persona 12.5s")
- **Green dots**: Snap point locations (larger when you're near them)
- **Thin vertical lines**: Tolerance zones
  - Green = you're in snap range (will snap when you stop scrolling)
  - Gray = inactive
  - Orange = **overlapping tolerance zones** (conflict - see below)
- **Time labels**: Only shown when active or overlapping
- **⚠️ Warning**: Indicates overlapping snap points

**What are overlaps?** When tolerance zones of consecutive snap points overlap, both points could try to snap you simultaneously. For example:
- Snap point at 12s with `after: 400` extends to position X
- Snap point at 16s with `before: 400` starts before position X
- The overlapping area (orange) means both points are "fighting" for control

**How to fix overlaps:** Reduce tolerance values or increase spacing between snap points.

## Extended hypeDocument API

| Command               | Description |
|-----------------------|-------------|
| `hypeDocument.enableStickyScroll(height)`  | Enables the sticky scroll effect with specified wrapper height. |
| `hypeDocument.disableStickyScroll()` | Disables the sticky scroll effect. |
| `hypeDocument.getProgress()` | Returns the current scroll progress (0-1). |
| `hypeDocument.getScrollFromProgress(progress)` | Returns the scroll position for a given progress value. |
| `hypeDocument.getProgressFromSceneTime(sceneName, timeInScene)` | Returns the progress value for a specific scene and timeline time. |
| `hypeDocument.scrollToProgress(progress, options)` | Scrolls to a specific progress value (0-1) with optional duration, easing, and offset. |
| `hypeDocument.scrollToSceneStart(sceneName, options)` | Scrolls to the start of a scene with optional duration, easing, and offset. |
| `hypeDocument.scrollToSceneTime(sceneName, timeInScene, options)` | Scrolls to a specific timeline time within a scene with optional duration, easing, and offset. |
| `hypeDocument.setupScrollSnapping(options)` | Enables scroll snapping with snap points and configuration. |
| `hypeDocument.disableScrollSnapping()` | Disables scroll snapping. |
| `hypeDocument.isScrollSnappingEnabled()` | Returns true if scroll snapping is enabled. |

### Options Object

All scroll functions (`scrollToProgress`, `scrollToSceneStart`, and `scrollToSceneTime`) accept an options object:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `duration` | Number or "auto" | 0 | Scroll duration in **seconds** (0 = instant, "auto" = distance-based) |
| `easing` | String | 'inout' / 'linear' | Easing function: 'linear', 'in', 'out', 'inout' |
| `offset` | Number or String | 0 | Additional offset: fractional (0.1), percentage ('10%'), or pixels ('50px') |

## HypeStickyScroll API

| Command      | Description |
|--------------|-------------|
| `HypeStickyScroll.setDefault(key, value)` | Sets a default value for a specified key or overrides all default values at once. |
| `HypeStickyScroll.getDefault(key)` | Returns the value of a default by key or all default values if no key is given. |
| `HypeStickyScroll.setupLenis(options)` | Simple helper to setup Lenis smooth scrolling (requires Lenis library). |
| `HypeStickyScroll.version` | The version of the Hype Sticky Scroll extension. |

### Available Defaults

| Default | Type | Default Value | Description |
|---------|------|---------------|-------------|
| `ignoreSceneSymbol` | String | '🔒' | Symbol to exclude scenes from sticky scroll |
| `wrapperHeight` | Number | 5000 | Default wrapper height in pixels |
| `autoScrollSpeed` | Number | 1 | Speed factor in thousands of pixels per second (1 = 1000px/s) |
| `lenis` | Boolean | false | Enable Lenis smooth scroll integration |
| `lenisOptions` | Object | {...} | Default Lenis configuration options |
| `snapPoints` | Array | [] | Default snap points (auto-applied if set) |
| `snapTolerance` | Object | {before: 200, after: 50} | Default snap tolerance zones in pixels |
| `snapDelay` | Number | 1000 | Default snap delay in milliseconds |
| `snapDuration` | Number/String | 'auto' | Default snap animation duration |
| `snapEasing` | String | 'inout' | Default snap easing function |
| `debug` | Boolean | false | Enable visual debugging (snap points + scroll position) |

### Examples

```javascript
// Change the ignore symbol
HypeStickyScroll.setDefault('ignoreSceneSymbol', '⛔');

// Set default wrapper height
HypeStickyScroll.setDefault('wrapperHeight', 8000);

// Configure auto-scroll speed
HypeStickyScroll.setDefault('autoScrollSpeed', 2); // 2000px/s

// Customize Lenis options
HypeStickyScroll.setDefault('lenisOptions', {
    duration: 2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    smooth: true
});

// Enable debug visualization
HypeStickyScroll.setDefault('debug', true);
```

---

**Copyright (c) 2022-2025 Max Ziebell. MIT License.**
