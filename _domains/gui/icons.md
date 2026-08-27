# Hand-authored icons

[slop.md](slop.md) rules out emoji and Unicode glyphs as an icon system. This is the failure
one step past that: the icon is a real authored SVG, drawn at a consistent stroke, and still
reads as the wrong object.

An icon is recognised by **silhouette**, not by ingredient list. A viewer at 16px never counts
the parts — they match the outline against the one they already know. So an icon built from the
right ingredients in the wrong arrangement does not read as a rough version of the right thing.
It reads, confidently, as something else.

## The gear that is a sun

The most common instance, and the reason this file exists. The reflex when drawing a settings
gear is a circle with spokes radiating from it:

```html
<!-- reads as a sun, every time -->
<circle cx="12" cy="12" r="3.2"/>
<path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6"/>
```

Small centre, detached rays pointing outward, radial symmetry — that is a sun, and no amount of
tuning the ray length rescues it. A gear's silhouette is the opposite arrangement:

- **The ring is large and the hole is small.** A gear is mostly body with a bore through the
  middle; a sun is mostly empty with a small core.
- **The teeth are attached to the ring and are stubby** — wider than they are long. Rays are
  thin and long and detached.
- **The outline is one closed path.** A gear is a solid with a bite taken out of it, not a
  centre plus decorations.

Draw the toothed ring as a single path with a round bore, or use a real icon set. Check it by
asking what it would be called by someone who has not been told: if "sun", "asterisk",
"sparkle" or "snowflake" is available as an answer, it is not a gear yet.

## The same failure, other icons

- **Speaker vs. play.** A speaker cone drawn without waves and without the rectangular
  waveguide is a triangle, which is the play button. The cone needs its stem.
- **Refresh vs. share.** A circular arrow with too little of the circle drawn is an arc with a
  head on it, which reads as a redirect.
- **Trash vs. cup.** A tapered body with no lid line and no vertical ribs is a cup or a
  bucket. The lid, the lid's handle and the ribs are the recognition, not the taper.
- **Grid vs. table vs. window.** A 2×2 of squares is a grid; the same box with one heavier
  top row is a table; the same box with one heavier left column is a sidebar. The weighted
  edge is the entire difference, so it has to be unmistakable — a hairline apart is not.
- **Search vs. record.** A circle with a short tail at the wrong angle stops reading as a
  magnifier. The handle runs at 45° and clears the circle's edge.

## Checking one

Look at it rendered at the size it ships at, alone, with the label hidden. Icons are judged
at 16–24px on a desktop and 24–32px in a mobile bar, and every one of these failures is
invisible in the 200px preview where they get drawn. If a hand-authored set is going into
anything real, the cheaper answer is almost always a maintained set — SF Symbols on Apple
platforms, Lucide, Phosphor, Material Symbols — where the silhouettes are already resolved.
