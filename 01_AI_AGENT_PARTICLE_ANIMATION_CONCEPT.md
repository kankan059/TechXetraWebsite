# AI Agent Specification — Galaxy Particle Morphing System

## Project Context

The project is a Next.js web application. The hero section should begin as a deep-space galaxy filled with scattered stars/particles. After roughly 1 second, the particles should intelligently move and assemble into a recognizable scorpion silhouette. The scorpion is not a normal image fading in: it must be visibly constructed from the same particles.

This system will later support many similar animations, so the implementation must be reusable and data-driven.

## Core Concept

Build a reusable particle animation engine rather than a one-off scorpion animation.

The system has four conceptual layers:

1. **React / Next.js UI layer**
   - Hero content, typography, buttons, navigation, etc.
   - Should not run the per-particle animation loop.

2. **Canvas rendering layer**
   - A client-side `<canvas>` fills the hero background.
   - Draws hundreds/thousands of particles efficiently.
   - Uses `requestAnimationFrame` for the animation loop.

3. **Particle simulation layer**
   - Maintains particle positions, velocities, target positions, size, opacity, and other visual properties.
   - Moves particles toward target coordinates using interpolation/physics/easing.
   - Handles scattering, forming, holding, and dispersing.

4. **Shape/target layer**
   - Shapes are represented as point sets.
   - A scorpion SVG or silhouette is sampled into target coordinates.
   - The particle engine does not know that the points represent a scorpion.
   - Any future SVG, logo, icon, text silhouette, or custom shape can become another target.

## Why Canvas

Do not create one React/DOM element per particle. Particle positions change every frame, so managing hundreds or thousands of React elements would create unnecessary rendering overhead.

Use React to mount/configure the animation and Canvas to render the particle field.

The canvas animation component should be a Client Component because browser APIs such as `window`, `document`, canvas APIs, and `requestAnimationFrame` are client-side concerns. Next.js uses Server Components by default, while interactive browser-dependent components can opt into Client Components with `"use client"`.

Reference: https://nextjs.org/docs
Reference: https://nextjs.org/learn/react-foundations/server-and-client-components

## Particle Data Model

A particle should conceptually contain:

- x
- y
- targetX
- targetY
- velocityX
- velocityY
- size
- opacity
- brightness/intensity
- optional depth
- optional noise/randomness
- optional trail state

The exact implementation may use classes, typed objects, or optimized typed arrays depending on performance requirements.

## Particle Lifecycle

The initial sequence should be:

### State 1 — SCATTERED

Particles are distributed across the hero area using deterministic/randomized positions.

They should:
- twinkle subtly
- drift very slightly
- have varied sizes
- have varied opacity
- feel like a galaxy rather than a uniform particle grid

### State 2 — FORMING

After approximately 1 second, particles receive target positions generated from the scorpion silhouette.

Each particle moves toward its assigned target.

Avoid perfectly synchronized linear movement. Use:
- easing/interpolation
- slight speed variation
- slight delay variation
- subtle orbital/noise movement
- optional overshoot
- optional attraction force

### State 3 — FORMED

Particles reach approximately the scorpion coordinates and stabilize.

The scorpion should remain recognizable while particles continue tiny natural movements.

### State 4 — DISPERSING (optional)

The scorpion can later dissolve back into the galaxy or transition into another shape.

Do not assume this behavior is mandatory; make it configurable.

## Shape Pipeline

The scorpion should be supplied as an SVG silhouette or equivalent vector source.

Pipeline:

SVG
→ determine visible geometry
→ sample points along the visible shape
→ normalize coordinates
→ scale to current canvas dimensions
→ distribute/assign particles to target points
→ ParticleSystem receives target coordinates

The target representation should be generic:

```ts
type Point = {
  x: number;
  y: number;
};
```

The particle system should work with `Point[]` without knowing the semantic meaning of the shape.

## Reusable API Concept

The implementation should make future animation sequences possible with an API similar to:

```ts
particleSystem.scatter();

particleSystem.morphTo(scorpionPoints);

particleSystem.morphTo(logoPoints);

particleSystem.morphTo(textPoints);

particleSystem.disperse();
```

The actual API can differ, but the separation of concerns must remain.

## Suggested Architecture

```text
src/
├── app/
│   ├── page.tsx
│   └── layout.tsx
│
├── components/
│   ├── hero/
│   │   ├── HeroSection.tsx
│   │   ├── HeroContent.tsx
│   │   └── HeroAnimation.tsx
│   │
│   └── animations/
│       ├── ParticleCanvas.tsx
│       ├── ParticleSystem.ts
│       ├── AnimationController.ts
│       └── shapes/
│           ├── scorpion.ts
│           ├── logo.ts
│           └── text.ts
│
├── lib/
│   └── animation/
│       ├── sampling.ts
│       ├── easing.ts
│       └── math.ts
│
└── public/
    └── shapes/
        └── scorpion.svg
```

Do not create every file immediately. Build the system incrementally.

## Animation Controller

Use an explicit state machine or timeline rather than scattered `setTimeout()` calls.

Example conceptual states:

```ts
type AnimationState =
  | "SCATTERED"
  | "FORMING"
  | "FORMED"
  | "DISPERSING";
```

The controller determines:
- when the formation begins
- duration
- easing
- hold time
- next transition
- whether to repeat

A timeline library such as GSAP can optionally orchestrate high-level sequences, while Canvas remains responsible for particle rendering.

## Performance Requirements

The animation must:
- use one canvas
- use `requestAnimationFrame`
- resize correctly
- avoid React state updates every frame
- avoid creating/destroying objects every frame where practical
- pause or reduce work when the hero is not visible if appropriate
- support reduced-motion preferences
- degrade gracefully on mobile/low-power devices

Start with a modest particle count and increase it after the core system works.

## Responsive Behavior

The scorpion target coordinates must be normalized so the same source shape works at different viewport sizes.

Do not hardcode desktop pixel coordinates.

Use a normalized coordinate system or calculate a scale/offset from the source shape's bounding box.

## Important Engineering Rule

Do not hard-code scorpion-specific logic into `ParticleSystem`.

Bad:

```text
if shape == scorpion:
    do special scorpion movement
```

Good:

```text
shape → Point[] → generic ParticleSystem
```

This distinction is what makes the animation system reusable.

## Accessibility

Respect:

```text
prefers-reduced-motion
```

When reduced motion is requested, use a static star field or a much simpler transition instead of forcing a large particle animation.

The hero's semantic text and controls must remain normal HTML/UI elements above the canvas.

## Development Order

Build in this order:

1. Full-screen Canvas.
2. One moving particle.
3. Basic star field.
4. Particle animation loop.
5. Target attraction.
6. Generic point-set morphing.
7. SVG/scorpion point sampling.
8. Formation timing and easing.
9. Visual polish.
10. Reusable shape system.
11. Additional animations.
12. Performance/accessibility testing.

Never jump directly to the final scorpion effect before the particle engine works.

## AI Agent Instructions

When implementing this system:

- Inspect the existing Next.js project before creating files.
- Preserve the project's existing styling and architecture.
- Do not replace working project infrastructure unnecessarily.
- Explain architectural changes before making them.
- Implement incrementally.
- Prefer TypeScript.
- Keep React UI separate from animation/rendering logic.
- Do not create hundreds/thousands of React components for particles.
- Do not use a raster scorpion image as a simple overlay/fade-in.
- The final scorpion must be formed by the particles themselves.
- Make shape targets generic and reusable.
- Test desktop and mobile behavior.
- Include reduced-motion behavior.
- Optimize only after correctness is established.
