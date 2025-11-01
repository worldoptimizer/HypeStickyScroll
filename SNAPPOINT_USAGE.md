# SnapPoint Feature - Usage Guide

## Overview

The SnapPoint feature adds intelligent scroll snapping to HypeStickyScroll. After the user stops scrolling, the page automatically snaps to predefined points with smooth animation.

## Basic Usage

```javascript
// Setup scroll snapping with scene-time based snap points
hypeDocument.setupScrollSnapping({
    snapPoints: [
        { scene: 'Intro', time: 0 },
        { scene: 'Intro', time: 2.5 },
        { scene: 'Chapter 1', time: 0 },
        { scene: 'Chapter 1', time: 3.0 },
        { scene: 'Chapter 2', time: 0 }
    ],
    tolerance: {
        before: 200,   // Snap when within 200px before reaching the snap point
        after: 50      // Snap when within 50px after passing the snap point
    },
    delay: 1000,        // Wait 1 second after scroll stops
    duration: 'auto',   // Auto-calculate snap animation duration
    easing: 'inout'     // Smooth easing
});
```

## Configuration Options

### snapPoints (Required)
Array of snap point objects with scene name and time:
```javascript
snapPoints: [
    { scene: 'Scene 1', time: 0 },      // Scene start
    { scene: 'Scene 1', time: 2.5 },    // 2.5 seconds into Scene 1
    { scene: 'Scene 1', time: 'end' },  // Scene end (auto-resolves to scene duration)
    { scene: 'Scene 2', time: 0 }       // Scene 2 start
]
```

**Special time values:**
- `time: 0` - Scene start
- `time: 'end'` - Scene end (automatically resolves to the scene's duration)
- `time: 16.5` - Decimal seconds for sub-second precision

### tolerance (Optional)
Default tolerance zones in pixels:
```javascript
tolerance: {
    before: 200,   // Magnetic pull before reaching snap point (default: 200)
    after: 50      // Magnetic pull after passing snap point (default: 50)
}
```

### Per-Point Tolerance Override
Override tolerance for specific snap points:
```javascript
snapPoints: [
    { 
        scene: 'Scene 1', 
        time: 0,
        tolerance: { before: 300, after: 100 }  // Custom tolerance
    },
    { scene: 'Scene 1', time: 2.5 }  // Uses default tolerance
]
```

### delay (Optional)
Milliseconds to wait after scrolling stops before snapping:
```javascript
delay: 1000  // Default: 1000ms (1 second)
```

### duration (Optional)
Snap animation duration:
```javascript
duration: 'auto'  // Auto-calculate based on distance (default)
duration: 0.8     // Fixed 0.8 seconds
```

### easing (Optional)
Snap animation easing:
```javascript
easing: 'inout'   // Default
easing: 'linear'
easing: 'in'
easing: 'out'
```

## Control Functions

### Enable Snapping
```javascript
hypeDocument.setupScrollSnapping(options);
```

### Disable Snapping
```javascript
hypeDocument.disableScrollSnapping();
```

### Check Status
```javascript
if (hypeDocument.isScrollSnappingEnabled()) {
    console.log('Snapping is active');
}
```

## Complete Example

```javascript
function setupMySnapping(hypeDocument, element, event) {
    // Wait for sticky scroll to be ready
    hypeDocument.enableStickyScroll();
    
    // Setup snap points
    hypeDocument.setupScrollSnapping({
        snapPoints: [
            // Intro section
            { scene: 'Intro', time: 0 },
            
            // Chapter 1 - key moments
            { scene: 'Chapter 1', time: 0 },
            { scene: 'Chapter 1', time: 2.5 },
            { scene: 'Chapter 1', time: 5.0 },
            
            // Chapter 2 - with custom tolerance
            { 
                scene: 'Chapter 2', 
                time: 0,
                tolerance: { before: 400, after: 100 }
            },
            
            // Outro
            { scene: 'Outro', time: 0 }
        ],
        
        // Default tolerance
        tolerance: {
            before: 200,
            after: 50
        },
        
        // Timing
        delay: 800,
        duration: 'auto',
        easing: 'inout'
    });
}
```

## How It Works

1. **User scrolls** - Snap timeout is continuously reset while scrolling
2. **User stops scrolling** - After `delay` milliseconds, snap detection runs
3. **Find nearest snap point** - Checks which snap points are within tolerance
4. **Snap animation** - Smoothly scrolls to the nearest snap point using `scrollToProgress()`

## Asymmetric Tolerance Explained

The tolerance zones are **asymmetric** based on position relative to the snap point:

```
Snap Point at 1000px
         ↓
    [←200px→|←50px→]
     before   after
```

- **`before`**: Snap when within 200px **before** reaching the snap point (approaching it)
- **`after`**: Snap when within 50px **after** passing the snap point (scrolled past it)

This creates natural snapping behavior where it's easier to "catch" a snap point as you approach it.

## Tips

- **Scene starts**: Use `time: 0` for scene beginnings
- **Key moments**: Add snap points at important animation moments
- **Spacing**: Don't place snap points too close together
- **Testing**: Start with longer delays (1500ms) and adjust down
- **Tolerance**: Larger `before` tolerance feels more natural

## Version

Added in HypeStickyScroll v1.4.0
