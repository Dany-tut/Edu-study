# Loop icon system

Original SVG paths from the approved Iskra Loop kit, including crosses,
chevrons, selectors and editor/media controls. Source: `design/ios-concepts/loop-kit`.
Figma review: https://www.figma.com/design/y8qQ23hqFJtufp7gGdZTse/Iskra?node-id=124-101

## Application boundary

Import UI icons from `components/icons/appIcons`, with the same named exports,
props and refs as Lucide. Loop is the default at every viewport, including
cabinet, login, shared learning routes, landing and standalone previews.

React context follows portals, so dialogs, sheets, notifications and lazy
lesson/homework/trainer pages keep the same icon family. Icons do not subscribe
to viewport changes. The constructor picker offers the approved Loop catalog;
stored icon keys keep their names and unknown legacy keys use FileText.

`TaskliIcon` is the legacy technical name of Iskra’s semantic wrapper for navigation and lesson states. It does not identify a separate product. Testly is a separate product connected through its own integration module.
`LoopInlineIcon` and `LoopTextIcon` replace legacy inline SVG/text controls throughout
the UI. Shared Checkbox/Radio marks and feed action glyphs
also use Loop, preserving their inputs, keyboard behavior and state.
Subject marks use `SubjectMark` instead of emoji at every viewport. Charts, lesson
diagrams, brand logos and animation artwork retain their own drawing.

## Geometry and color

- Base grid: 32 × 32, optical stroke 2.3, round ends and joins.
- Use existing control sizes; prefer 16–20 px for compact actions, 24 px for
  navigation and 28–32 px for feature/status marks.
- Preserve curves, asymmetry and the small warm details on utility icons.
- Main strokes inherit `currentColor`, preserving white button glyphs,
  destructive actions and subject/status colors. Semantic neutral/accent icons
  use `--loop-ink`. Details and fills use `--loop-detail` / `--loop-soft`.
  All three tokens have dark-theme values in `index.css`.
- The SVG remains decorative by default. Label the button/link that owns its
  action. A standalone SVG with `aria-label` / `aria-labelledby` is exposed to
  assistive technology. Caller events, classes, motion refs and sizing pass through.

## Sources and regeneration

`loopArtwork.tsx` and `appIcons.tsx` are generated static JSX, not injected HTML.
They contain 248 kit symbols plus a plain like-heart for the feed. TeacherBook
is composed from the same person/book paths. Keep generated exports static to
allow tree shaking.

After changing original SVG sources:

```sh
npm run icons:generate
npm run icons:check
```

`icons:check` checks generated-file freshness, all named icon imports, direct
Lucide bypasses, SVG/source consistency and native light/dark asset hashes.

## Native iOS

The teacher's UITabBar, headers and app-supplied menu symbols resolve to the
bundled Loop PNGs in `public/icons/loop`, with light/dark variants at 3×.
UIKit still owns their interaction, layout, accessibility and glass surfaces.
System-owned chrome (status bar, OS dialogs and system menu selection marks)
retains its platform drawing. Unknown platform symbol identifiers fall back
to SF Symbols.

To regenerate the checked-in PNGs without adding a runtime dependency:

```sh
npm install --prefix /tmp/iskra-loop-renderer @resvg/resvg-js
node scripts/buildLoopNativeIcons.mjs --renderer=/tmp/iskra-loop-renderer/node_modules/@resvg/resvg-js
npm run build
npx cap copy ios
```

Stroked artwork stays inside the SVG viewport through `strokeWidth={3}`.
Source glyphs that touched the edge have a proportional fit transform with
a 0.5-unit safety margin. Keep SVG sources, `glyphs.json`, and the fit transforms
in `generate.cjs` in sync. `npm run icons:check` rasterizes all 250 React drawings
at stroke widths 1, 2, 2.5 and 3 to detect clipped ink, including composites.
