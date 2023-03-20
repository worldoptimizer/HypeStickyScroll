# Hype Sticky Scroll
![](https://playground.maxziebell.de/Hype/StickyScroll/HypeStickyScroll.jpg)

Introducing Hype Sticky Scroll, a powerful and versatile tool that unlocks the potential of scroll-driven animations in your Tumult Hype projects. With this plugin, create seamless and engaging scroll-based experiences that respond dynamically to user interactions.

Key features include:

* Scene filtering and ignoring: Choose which scenes to include or exclude from the sticky scroll animation (just add 🔒 to the scene name).
* Customizable wrapper height: Adjust the height of the wrapper to fit your content and design.
* Function callbacks: Implement custom behaviors with the stickyScrollBefore and stickyScrollAfter callbacks.
* Progress tracking: Monitor the scroll progress and use it to control the playback of your animations (easier method in the works).
* Smooth scene navigation: Scroll to specific scenes with ease, complete with customizable durations and easing options.

## Content Delivery Network (CDN)
Latest version can be linked into your project using the following in the head section of your project:
```
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

**Q: How can I scroll to the start of a scene?**

A: You can scroll to the start of a scene by calling the `scrollToSceneStart` function on the Hype document object like this:

```javascript
hypeDocument.scrollToSceneStart(sceneName, duration, easing);
```

Replace `sceneName` with the name of the scene you want to scroll to, `duration` with the desired scroll duration in milliseconds (use 0 for instant scrolling), and `easing` with the desired easing function ('linear', 'in', 'out', 'inout').


## Extended hypeDocument API

| Command               | Description |
|-----------------------|-------------|
| `hypeDocument.enableStickyScroll`  | Enables the sticky scroll effect. |
| `hypeDocument.disableStickyScroll` | Disables the sticky scroll effect. |
| `hypeDocument.getProgress`         | Returns the current scroll progress. |
| `hypeDocument.scrollToSceneStart`  | Scrolls to the start of a scene (duration, easing). You can use 'auto' for a distance base duration |

## HypeStickyScroll API

| Command      | Description |
|--------------|-------------|
| `HypeStickyScroll.setDefault` | Sets a default value for a specified key or overrides all default values at once. |
| `HypeStickyScroll.getDefault` | Returns the value of a default by key or all default values if no key is given. |
| `HypeStickyScroll.version`    | The version of the Hype Sticky Scroll extension. |
