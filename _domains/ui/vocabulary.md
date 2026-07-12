# Motion & animation vocabulary (reverse glossary)

A reference, not an engine cell. Read by `ui-design` (and `explain` when a motion term is the subject) to
turn a **vague description of a motion effect into its precise term**, so the user knows what to ask a
designer or an AI for. For *naming* an effect, not designing or building one.

Adapted from emilkowalski/skills `animation-vocabulary`.

## How to use

The user describes an effect loosely ("the bouncy thing when a popover opens", "the iOS rubber-band
scroll"). Return the matching term first, then 1–2 alternates only if they genuinely compete, each with
one line on how it differs. Read for the *sensation* the user describes, not keywords. Quote the
glossary descriptions as-is. If nothing matches exactly, name the closest and say it's an
approximation — don't invent a term. Lead with the term; expand only if asked.

Format:

```
**Stagger** — Animate several items one after another with a small delay between each, creating a cascade.
```

## Glossary

### Entrances & exits
- **Fade in / out** — Appears or disappears by changing opacity.
- **Slide in** — Enters by sliding from off-screen (left/right/top/bottom).
- **Scale in** — Grows from smaller to full size, often paired with a fade.
- **Pop in** — Appears with a slight overshoot, like it bounces into place.
- **Reveal** — Uncovered gradually, often by animating a clip-path or mask.
- **Enter / Exit** — The animation played when an element is added to / removed from the screen.

### Sequencing & timing
- **Keyframes** — Defined points (0%, 50%, 100%) the browser fills between.
- **Interpolation / Tween** — Generating the in-between frames between a start and end value.
- **Stagger** — Animate several items one after another with a small delay, creating a cascade.
- **Orchestration** — Deliberately timing multiple animations so they read as one coordinated motion.
- **Delay** / **Duration** — Time before an animation starts / how long it takes.
- **Fill mode** — Whether an element keeps its first or last frame's styles before/after running.
- **Stepped animation** — Divided into discrete steps, like a countdown timer.

### Movement & transforms
- **Translate / Scale / Rotate / Skew** — Move / resize / spin / slant an element.
- **3D tilt / Flip** — Rotate in 3D (rotateX / rotateY) for depth.
- **Perspective** — How strong the 3D effect looks; lower exaggerates depth.
- **Transform origin** — The anchor point a scale or rotation grows or spins from.
- **Origin-aware animation** — Animates out of its trigger (a popover growing from the button that
  opened it) instead of its own center, which is the CSS default.

### Transitions between states
- **Crossfade** — One element fades out as another fades in, same spot.
- **Continuity transition** — Keeps the user oriented by visually connecting before and after.
- **Morph** — One shape smoothly turns into another (Dynamic Island).
- **Shared element transition** — An element travels and transforms from one position into another (a
  thumbnail expanding into a card).
- **Layout animation** — An element animates to a new size/position instead of snapping.
- **Accordion / Collapse** — Smoothly expands/collapses height to show/hide content.
- **Direction-aware transition** — Slides one way forward, the opposite way back.

### Scroll
- **Scroll reveal** — Elements fade/slide in as they enter the viewport.
- **Scroll-driven animation** — Progress tied directly to scroll position.
- **Parallax** — Background and foreground move at different speeds, creating depth.
- **Page / View transition** — Animation between routes; the browser morphs between two states.

### Feedback & interaction
- **Hover effect** — Visual change on cursor-over.
- **Press / Tap feedback** — Subtle scale-down on click, so it feels physical.
- **Hold to confirm** — A progress effect that fills while the user holds.
- **Drag / Drag to reorder / Swipe to dismiss** — Move by grabbing; rearrange a list; drag off-screen
  to close.
- **Rubber-banding** — Resistance and snap-back when dragging past a boundary (iOS overscroll).
- **Shake / Wiggle** — Quick side-to-side jitter signaling an error.
- **Ripple** — A circle expanding from a tap point, confirming the press.

### Easing
- **Easing** — How speed changes over an animation.
- **Ease-out** — Starts fast, ends slow. Default for UI and anything responding to the user.
- **Ease-in** — Starts slow, ends fast. Usually avoided.
- **Ease-in-out** — Slow-fast-slow. For elements already on screen moving A→B.
- **Linear** — Constant speed; reserve for spinners/marquees.
- **Cubic-bezier** — A custom easing curve.
- **Asymmetric easing** — Accelerates and decelerates at different rates.

### Spring
- **Spring** — Motion driven by physics (tension, mass, damping), not a set duration.
- **Stiffness / Tension** — How strongly it pulls to target; higher = snappier.
- **Damping** — How fast it settles; lower = more bounce.
- **Mass** — How heavy it feels; more = slower.
- **Bounce** — Overshoot-and-settle; adds playfulness.
- **Momentum / Velocity** — Carried motion, especially after a drag; a spring carries velocity into
  the next animation when interrupted.
- **Interruptible animation** — Can be redirected mid-flight instead of finishing first.

### Looping & ambient
- **Marquee / Loop / Alternate (yoyo)** — Continuous scroll; repeat; forward-then-reverse each cycle.
- **Orbit / Pulse / Float / Idle** — Circling; gentle repeating scale/opacity; up-and-down drift;
  subtle motion while waiting.

### Polish & effects
- **Blur** — Softens an element or masks tiny imperfections in a transition.
- **Clip-path / Mask** — Clip to a shape (reveals, sliders); mask allows soft fadeable edges.
- **Before / after slider** — Draggable divider wiping between two overlaid images.
- **Line drawing** — An SVG path drawing itself in.
- **Text morph / Typewriter / Number ticker** — Animate text char-by-char; type one char at a time;
  digits rolling to a value.
- **Skeleton / Shimmer** — A placeholder with a moving sheen while content loads.
- **Tabular numbers** — Fixed-width digits so numbers don't shift; essential for tickers/timers.

### Performance
- **Frame rate (FPS) / Jank / Dropped frame** — Frames per second; visible stutter; a missed frame.
- **Compositing / will-change / Hardware acceleration** — GPU moves/fades an element on its own layer;
  a hint to promote it ahead of time; animating transform/opacity keeps motion smooth.
- **Layout thrashing** — Animating width/height/top/left forces per-frame layout recalculation.

### Principles
- **Purposeful animation** — Motion serves a function (orient, feedback, relationship), not decoration.
- **Anticipation / Follow-through / Squash & stretch** — Wind-up before a move; parts settle after;
  deform to convey weight and speed.
- **Perceived performance** — The right animation makes an interface register as faster.
- **Frequency of use** — The more often seen, the shorter and subtler it should be.
- **Spatial consistency** — Keep an element's identity and position across states.
- **Reduced motion** — Respect `prefers-reduced-motion` by toning down, not removing comprehension aids.
