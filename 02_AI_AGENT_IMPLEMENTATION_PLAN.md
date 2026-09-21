# AI Agent Implementation Plan — Galaxy → Scorpion Hero

## Objective

Implement a reusable animated hero background in an existing Next.js application.

The visual sequence:

```text
PAGE LOAD
   ↓
Deep-space background
   ↓
Scattered stars
   ↓
~1 second delay
   ↓
Stars accelerate toward target positions
   ↓
Scorpion silhouette forms from the stars
   ↓
Scorpion holds / subtly animates
   ↓
Optional dissolve back into stars
```

## Technical Stack

Primary:
- Next.js
- React
- TypeScript
- HTML Canvas
- requestAnimationFrame

Optional:
- GSAP for high-level sequencing/timelines
- SVG as the source format for shape silhouettes

Do not introduce Three.js/WebGL unless a later performance or visual requirement justifies it.

## Component Responsibilities

### HeroSection

Responsible for layout only.

Responsibilities:
- hero dimensions
- positioning
- content layering
- accessibility structure
- mounting animation component

It should not contain particle physics.

### HeroContent

Responsible for:
- heading
- paragraph
- CTA/buttons
- other semantic hero content

It must remain independent of Canvas.

### ParticleCanvas

A Client Component.

Responsibilities:
- create/get canvas
- obtain 2D rendering context
- handle resize
- start/stop animation loop
- connect the canvas to ParticleSystem
- clean up event listeners and animation frame

It should not contain all particle math directly.

### ParticleSystem

Responsible for:
- particle creation
- particle storage
- updating positions
- target assignment
- scatter behavior
- morph behavior
- rendering

It should not know about React.

### AnimationController

Responsible for:
- animation state
- timing
- transitions
- triggering ParticleSystem methods

It should not draw directly.

### Shape Utilities

Responsible for converting source shapes into normalized point sets.

Input:

```text
scorpion.svg
```

Output:

```ts
Point[]
```

The rest of the animation system only sees `Point[]`.

## Suggested Interfaces

These are conceptual interfaces, not mandatory exact code.

```ts
type Point = {
  x: number;
  y: number;
};

type Particle = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
};

interface ParticleSystem {
  scatter(): void;
  setTargets(points: Point[]): void;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}
```

## Target Assignment

The number of sampled shape points may differ from the number of particles.

The implementation must handle this.

Possible strategies:
- sample exactly the desired number of target points
- repeat nearest/available target points
- distribute particles along the shape
- use weighted sampling

Start simple. Optimize the distribution after the visual behavior works.

## Morph Physics

Avoid a simple:

```ts
x += (targetX - x) * 0.01;
```

as the only behavior if it looks too mechanical.

Start with interpolation and then add controlled variation.

Desired appearance:
- particles feel attracted to the silhouette
- movement has momentum
- particles don't all arrive simultaneously
- final shape remains stable

Possible parameters:

```text
attraction strength
friction
maximum velocity
formation duration
arrival threshold
random delay
noise strength
```

These should be configurable.

## Galaxy Appearance

Initial stars should have:
- varied size
- varied opacity
- sparse distribution
- subtle twinkle
- very slow drift
- optional glow

Avoid:
- perfectly uniform spacing
- excessive particle density
- heavy bloom that obscures the hero content
- animation that makes text difficult to read

## Layering

Use a structure similar to:

```text
Hero
├── Background / gradient
├── Canvas
├── Optional glow layer
└── Content
```

The canvas should not block interaction with buttons.

Use appropriate pointer-event behavior so UI remains clickable.

## Responsive Scaling

When the viewport changes:
1. resize canvas for device pixel ratio
2. recalculate rendering dimensions
3. transform/scale normalized shape coordinates
4. update particle targets
5. preserve or smoothly restart the animation as appropriate

Do not stretch a desktop coordinate map blindly onto mobile.

## Device Pixel Ratio

The canvas should account for `devicePixelRatio` so the particle rendering does not appear blurry on high-density displays.

Keep CSS size separate from internal canvas resolution.

## Animation Lifecycle

On mount:

```text
initialize canvas
↓
initialize particle system
↓
create star field
↓
start animation loop
↓
schedule formation
```

On unmount:

```text
cancel requestAnimationFrame
remove listeners
release references
```

Avoid memory leaks.

## Reduced Motion

Check the user's motion preference.

If reduced motion is enabled:
- show a static or gently twinkling star field
- skip the large morph animation
- keep all hero content fully usable

## Testing Checklist

### Functional
- Canvas appears.
- Stars render.
- Stars move.
- Formation starts after the intended delay.
- Scorpion is recognizable.
- Hero text remains visible.
- Buttons remain clickable.
- Animation can be repeated.

### Responsive
- Desktop.
- Laptop.
- Tablet.
- Mobile portrait.
- Mobile landscape.

### Performance
- No React re-render every animation frame.
- No console errors.
- No runaway animation loops.
- Reasonable CPU usage.
- Particle count can be configured.

### Accessibility
- Reduced motion works.
- Canvas is decorative and does not replace semantic content.
- Text contrast remains readable.

## Future Extensions

Once the first animation works, the same engine should support:

```text
Galaxy → Scorpion
Galaxy → Logo
Galaxy → Symbol
Galaxy → Text
Galaxy → Planet
Galaxy → Custom SVG
```

Later, add:
- mouse attraction/repulsion
- cursor trails
- scroll-driven morphs
- section transitions
- multiple particle colors
- particle trails
- depth/parallax
- WebGL renderer if required

## Implementation Rule

Do not attempt all future features now.

The first production milestone is:

```text
responsive galaxy
+
particle engine
+
generic point targets
+
scorpion SVG morph
```

Everything else comes afterward.
