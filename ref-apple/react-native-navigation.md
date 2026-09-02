# React Native native-stack headers on iOS 26

`@react-navigation/native-stack` + `react-native-screens`. Line numbers are from
native-stack 7.17.10 and screens 4.25.2; re-check them against the installed
copy rather than trusting them.

## A large title goes invisible if its bar has any background

On iOS 26, a `UINavigationBar` scroll-edge appearance carrying a background —
colour **or** blur effect — paints the large title as nothing. The element is
still laid out and still in the accessibility tree at full large-title
geometry; only the glyphs are missing. So `idb ui describe-all` reporting the
heading at the right frame is not evidence the title rendered.

native-stack already dodges half of this: it forces
`headerBackgroundColor: 'transparent'` whenever `headerLargeTitleEnabled` is
set on iOS (`src/views/useHeaderConfigProps.tsx:247`, with the reason in the
comment above it). Its own note is the reason `headerStyle: {}` is the right
thing to leave alone.

Three separate options reach that appearance, and each one triggers the bug:

- `headerStyle: { backgroundColor: … }` — the case native-stack guards.
- `headerLargeStyle: { backgroundColor: <opaque> }` — becomes
  `largeTitleBackgroundColor`, assigned straight to
  `scrollEdgeAppearance.backgroundColor`
  (`ios/RNSScreenStackHeaderConfig.mm:539`).
- `headerBlurEffect` — the non-obvious one. It sets
  `appearance.backgroundEffect` on the *standard* appearance (`mm:391`), and
  `scrollEdgeAppearance` is copy-constructed from it with
  `initWithBarAppearance:` (`mm:527`), so the effect is inherited.

## Making the bar opaque without losing the title

The bar must be opaque when scrolled, or list rows show through it. The
combination that gives both:

```js
headerStyle: {},                                    // leave the transparent fallback alone
headerBlurEffect: 'systemChromeMaterialDark',       // material behind the COLLAPSED bar
headerLargeStyle: { backgroundColor: 'transparent' }, // strip that effect off the scroll-edge one
```

Alpha 0 in `headerLargeStyle` takes the branch at `mm:531`, which calls
`configureWithTransparentBackground` on the scroll-edge appearance and nils its
background colour. The library's comment there says what it is for: *"This will
also remove the background blur effect in the large title which is otherwise
inherited from the standard appearance."*

At rest the bar then has nothing behind it and the title paints; there is no
overlap at rest anyway, because the scroll view's content inset already starts
rows below the bar. Scrolled, the title collapses into the standard appearance,
which still carries the material.

## Verifying it

Screenshot the at-rest state, read the heading's frame from
`idb ui describe-all`, and sample that box's max luma. Light title text on a
dark bar peaks near 255; the blanked state measures in the 30s. Checking that
the header "looks like a solid block" passes just as happily when the title
inside it has vanished.

For bleed-through, screenshot at two scroll offsets with a *different* row
under the bar each time and compare pixel statistics over the header band. An
opaque bar gives near-identical numbers; a transparent one tracks whatever is
beneath it.

## Scroll-edge effects need the scroll view on the first-child chain

`RNSScrollViewFinder` walks `subviews[0]` only
(`ios/helpers/scroll-view/RNSScrollViewFinder.mm`), so iOS 26 scroll-edge
effects (`scrollEdgeEffects`) are configured on the scroll view found down that
one chain and nowhere else. A screen that renders a banner as a sibling *above*
its list can take the scroll view off that chain.
