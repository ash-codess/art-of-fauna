# Art of Fauna

A calm puzzle game: drag the scattered tiles of vintage natural-history plates
back into place, then meet the creature you’ve uncovered. Built with **React +
Vite + Tailwind**, with all motion driven by **GSAP** (Draggable, Flip,
CustomEase). Dressed in a **herbarium sage** palette with **frosted-glass
panels**, and scored with synthesised **ambient audio** (Web Audio API).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the built bundle
```

## Deploy (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app
and publishes it to GitHub Pages at
**https://ash-codess.github.io/art-of-fauna/**.

- The build sets Vite's `base` to `/art-of-fauna/` (via the `GITHUB_PAGES` env
  var) so assets resolve under the project path.
- A `404.html` (a copy of `index.html`) gives the SPA a fallback, so deep links
  like `/art-of-fauna/a/snowy-owl` survive a refresh.
- One-time setup: in the repo, **Settings → Pages → Build and deployment →
  Source: GitHub Actions** (the workflow also enables this automatically on its
  first run).

## The experience

- **Library** (`/`) — a bento grid of plates. Unsolved plates are blurred
  teasers; solved ones resolve to crisp art with a tick. Tracks assembled count
  and a daily streak in `localStorage`.
- **Puzzle** — the plate is sliced into a 2D grid of tiles (4 columns × 3–6 rows,
  chosen so tiles stay roughly square for the plate's aspect ratio — 12–24 tiles).
  Each tile is nudged off its home cell in **both axes**; tiles drift in
  staggered (`power3.out`) and are dragged back into the grid (GSAP **Draggable**,
  `type: 'x,y'`). Release within the snap threshold and the tile locks home with
  an `elastic.out` bounce. Pause dims the board and freezes motion; shuffle
  re-deals.
- **Solve** — a scale-pulse + radial colour flash, then a **Flip** shared-element
  morph from the assembled tiles into the revealed plate.
- **Description / Fact** — the revealed plate with Latin + common names, a
  segmented toggle that slide-swaps to the fact card (metadata chips stagger in),
  and **Next** to move on. A gentle idle "breathing" tween keeps the plate alive.
- **Share** (`↗`) — exports a portrait share-card PNG (artwork + names) via the
  native share sheet where available, and copies a per-animal link
  (`https://ash-codess.github.io/art-of-fauna/a/<slug>`).

- **Synthwave score** — while the puzzle is being solved, a retro synthwave loop
  plays (driving 8th-note saw bass, a 16th-note arpeggio through a tempo-synced
  dotted-8th echo, a warm detuned-saw pad over a 4-chord progression, and
  four-on-the-floor drums), synthesised live with the Web Audio API on a
  lookahead scheduler. There are **four tracks** — _Midnight Drive_, _Neon
  Coast_, _Afterglow_, _Outrun_ — differing in key, tempo (90–124 BPM), and lead
  timbre; each animal opens on a consistent track, and the `♪ <track> ›` label
  cycles to the next. A bright chord resolves on solve. The mute toggle is
  persisted; the context only starts after a user gesture, per autoplay rules.

One custom ease — `CustomEase.create("soft", "0.6,0,0.2,1")` — is reused
everywhere for a consistent, weighted feel. `prefers-reduced-motion` is honoured
throughout.

The visual language is **frosted glass** (`backdrop-filter` panels floating over
soft moss/terracotta colour fields) rather than flat cards.

## Project layout

```
src/
  data/animals.js      curated species (names, facts, class, IUCN) + image URL helper
  data/images.json     output of the Wikimedia fetch pipeline
  lib/gsap.js          plugin registration + the shared "soft" ease
  lib/storage.js       progress + streak persistence
  lib/audio.js         synthesised ambient pad + resolve chord (Web Audio API)
  lib/share.js         canvas share-card + share link
  components/
    Library.jsx        bento grid home
    PlayFlow.jsx       puzzle → description → fact orchestration + Flip morph
    Puzzle.jsx         2D tile grid, shuffle, Draggable (x+y), win-detect, celebration
    Revealed.jsx       description + fact views, tab slide-swap, chip stagger
    ProgressBar.jsx    GSAP-eased progress
    Chip.jsx           label chips + metadata sub-cards
    IconButton.jsx     circular outline chrome buttons
scripts/
  fetch-images.ps1     queries Wikimedia Commons for one verified plate per species
```

## Artwork

Images are public-domain plates (Audubon, Haeckel, Gould, Albin, …) resolved at
runtime from Wikimedia Commons via `Special:FilePath/<file>?width=…`, which
returns a server-scaled thumbnail of the (often 11,000px) originals.

### Adding more animals

`scripts/fetch-images.ps1` searches Commons for each species and writes
`src/data/images.json`; several slugs (mammals, reptiles, insects) are still
`null` because the auto-search didn’t return a confidently-matching plate. To add
them, find a good Commons file, then add an entry to the `animals` array in
`src/data/animals.js` with its `file`, `width`, `height`, and metadata. The
library and puzzle pick it up automatically.

```bash
npm run fetch-images   # re-run the Commons search pipeline
```
