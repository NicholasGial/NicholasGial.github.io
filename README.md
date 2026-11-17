# Nicholas Gialouris — personal website

A static personal website with a Three.js surface-code-inspired opening, expandable research stories, a curated photography gallery, and an accessible native-dialog image viewer. The artwork is an artistic interpretation, not a simulation of a lattice-surgery protocol.

## Preview

Run `npm run dev` and visit http://127.0.0.1:5173. The complete deployable website is in `dist/`; it has no runtime API, database, or external CDN dependency.

## Content

- Edit page copy and research stories in `dist/index.html`.
- Edit photo titles, alt text, locations, years, and optional stories in `content/photos.json`. Titles are initial editorial suggestions, not supplied personal captions.
- Run `uv run --with pillow python scripts/prepare-images.py` to regenerate optimized images, synchronize photo cards and the browser manifest, and copy the CV. This uses Pillow and reads original photographs from `../Photos/`, the portrait from `../profile_photo.jpg`, and the CV from `../Nicholas_Gialouris_CV.pdf`. Keep those originals in the parent workspace; they are not part of the hosted source repository.
- A photo's `id` is its stable identity. Reordering the gallery does not affect the lattice.
- Adding a new gallery placement requires adding its card to `dist/index.html`; the image-preparation script updates existing cards from the manifest. `npm run check` flags missing cards.
- Image derivatives strip source metadata. Original photographs remain untouched. Optional location, year, and story fields are blank until supplied by Nicholas.
- Displayed CV details are based on the provided November 2026 CV; check time-sensitive information when updating.

## Graphics

`dist/scene.js` owns the 3D scene. `dist/assets/lattice.svg` is the immediate fallback. The scene progressively replaces it, pauses offscreen and when the document is hidden, observes reduced motion, and returns to the fallback after graphics context loss. The motion button persists the user's preference locally.

To update the pinned Three.js dependency, install dependencies and run `npm run prepare:vendor`. Vendored files and the upstream license are committed so static hosting needs no package installation. `node scripts/fallback.mjs` regenerates the fallback artwork.

## Verification

Run `npm run check` for internal asset/link checks, gallery and manifest consistency, and JavaScript syntax. Run `node scripts/test-interactions.mjs` for mocked interaction checks (this does not substitute for browser testing).

Before calling the visual design final, inspect desktop and phone layouts in a real browser. Verify lattice appearance, reduced motion, keyboard and touch navigation, gallery close/back/forward behavior, and WebGL initialization/context-loss fallback. Browser QA was unavailable in the authoring session because the browser host was unavailable and native computer-use permission was denied; real-device performance is unmeasured.

## Hosting

