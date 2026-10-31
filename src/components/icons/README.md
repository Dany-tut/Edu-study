# Loop mobile icon system

Original SVG paths from the approved Taskli Loop kit, including crosses,
chevrons, selectors and editor/media controls. Source: `design/ios-concepts/loop-kit`.
Figma review: https://www.figma.com/design/y8qQ23hqFJtufp7gGdZTse/Taskli?node-id=124-101

## Application boundary

Import UI icons from `components/icons/appIcons`, with the same named exports,
props and refs as Lucide. `LoopIconProvider` in `App.tsx` enables Loop below
1024 px on cabinet, login and shared learning routes. Desktop renders the
original Lucide components. The landing route is excluded.

React context follows portals, so dialogs, sheets, notifications and lazy
lesson/homework/trainer pages keep the same icon family. There is one viewport
subscription, rather than a resize listener on each icon. The constructor's
desktop-only full icon picker intentionally keeps its Lucide namespace import;
its entire catalog must stay in the lazy desktop chunk.

`TaskliIcon` is the semantic wrapper for navigation and lesson states.
`LoopInlineIcon` and `LoopTextIcon` replace legacy inline SVG/text controls only
inside the mobile boundary. Shared Checkbox/Radio marks and feed action glyphs
also use the boundary, preserving their inputs, keyboard behavior and state.
Subject marks use `SubjectMark` instead of emoji on mobile. Charts, lesson
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
npm install --prefix /tmp/taskli-loop-renderer @resvg/resvg-js
node scripts/buildLoopNativeIcons.mjs --renderer=/tmp/taskli-loop-renderer/node_modules/@resvg/resvg-js
npm run build
npx cap copy ios
```
