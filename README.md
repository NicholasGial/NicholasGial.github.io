# Nicholas Gialouris — personal website

A static personal website with a Three.js surface-code-inspired opening, expandable research stories, a curated photography gallery, and an accessible native-dialog image viewer. The artwork is an artistic interpretation, not a simulation of a lattice-surgery protocol.

## Preview

Run `npm run dev` and visit http://127.0.0.1:5173. The complete deployable website is in `dist/`; it has no runtime API, database, or external CDN dependency.

## Content

- Edit page copy and research stories in `dist/index.html`.
- Edit photo titles, alt text, locations, years, and optional stories in `content/photos.json`. Titles are initial editorial suggestions, not supplied personal captions.
- Run `uv run --with pillow python scripts/prepare-images.py` to regenerate optimized images, synchronize photo cards and the browser manifest. This uses Pillow and reads original photographs from `../Photos/` and the portrait from `../profile_photo.jpg`. Keep those originals in the parent workspace; they are not part of the hosted source repository.
- A photo's `id` is its stable identity. Reordering the gallery does not affect the lattice.
- Adding a new gallery placement requires adding its card to `dist/index.html`; the image-preparation script updates existing cards from the manifest. `npm run check` flags missing cards.
- Image derivatives strip source metadata. Original photographs remain untouched. Optional location, year, and story fields are blank until supplied by Nicholas.
- The CV is deliberately not published on the site. Facts shown on the page (education, publications, tools) were taken from the November 2026 CV; check time-sensitive information when updating.

## Graphics

`dist/scene.js` owns the 3D scene, a schematic of the teleportation protocol in arXiv:2611.23165. It is not a simulation: the layout and the order of steps follow the paper; timing, glow and the way the state "spreads" during the merge are illustrative.

- Layout (`layout()`, the single source of the geometry): a 3×7 rotated surface code in one plane, 21 data qubits and 20 auxiliary qubits (12 X-type, blue; 8 Z-type, green, as in the paper's figures). Auxiliaries sit at plaquette centres, weight-2 ones half a cell outside the boundary. Lines are data–auxiliary couplings only. Columns 0–2 and 4–6 are the distance-three patches; column 3 and four X-type auxiliaries form the seam. The two Z-type auxiliaries beside the seam are weight-2 while split and weight-4 while merged.
- Loop (seven stabilizer rounds of 2.4 s, then mirrored; two rounds while the target is prepared, three while merged, two after the split): target patch prepared in |0⟩; merge, with the seam data qubits and seam X-stabilizers switched on (measuring X⊗X); split, with the seam data qubits read out (a brief soft glow, no beams); source patch read out and left idle; the state remains on the target. X- and Z-type rounds are offset by half a cycle, as a nod to the pipelined stabilizer measurements. The current step is written into `#scene-step` under the scene.
- Rendering: bloom (`dist/vendor/postprocessing`), pointer parallax, drag, and a turn as the hero scrolls away.

`node scripts/fallback.mjs` asserts the qubit and stabilizer counts and that all stabilizers commute, in both the merged and the split configuration, before writing the fallback.

`dist/assets/lattice.svg` is the immediate fallback, generated from the same layout and camera by `node scripts/fallback.mjs` (rerun it after changing either). The scene progressively replaces it, pauses offscreen and when the document is hidden, observes reduced motion, drops bloom on slow GPUs, and returns to the fallback after graphics context loss. The motion button persists the user's preference locally and also disables the CSS motion.

`dist/field.js` is a second, lighter scene: about 10,800 points that settle into a shape and morph between shapes. Each shape is one function in `SHAPES`, with its caption.

- Research stage (`#field`, sticky beside the project list; below 900px `app.js` moves it into the open project): follows the hovered project, otherwise the one nearest the middle of the screen. `code` is one distance-three patch from `layout()` with logical Z (a row) and logical X (a column) lighting in turn; `cat` is the Wigner function of |α⟩ + e^{iφ}|−α⟩ with α = 1.9, negative fringes in blue; `squeezed` is the Wigner function of squeezed vacuum (r = 0.7) with a ring at the vacuum 1/e contour.
- Contact (`#qubit`): a Bloch sphere with a precessing state vector. Decorative.

If either scene fails to start, the research list takes the full width and nothing else changes.

The rest of the motion is CSS plus a few lines at the end of `dist/app.js`: hero entrance, scroll reveals, photographs that tilt toward the cursor and drift inside their frames as they scroll (where the browser supports scroll-driven animations).

To update the pinned Three.js dependency, install dependencies and run `npm run prepare:vendor`. Vendored files and the upstream license are committed so static hosting needs no package installation. The add-ons import the bare specifier `three`, which the import map in `dist/index.html` points at the vendored build.

## Verification

Run `npm run check` for internal asset/link checks, gallery and manifest consistency, and JavaScript syntax. Run `node scripts/test-interactions.mjs` for mocked interaction checks (this does not substitute for browser testing).

Before calling the visual design final, inspect desktop and phone layouts in a real browser. Verify lattice appearance, reduced motion, keyboard and touch navigation, gallery close/back/forward behavior, and WebGL initialization/context-loss fallback. The November 2026 revision was checked with headless Chrome screenshots at desktop and ~500px widths; pointer, drag, scroll and touch behaviour and real-device performance are still unverified.

## Hosting

`.github/workflows/pages.yml` publishes `dist/` to GitHub Pages on every push to `main` (repository Settings > Pages > Source must be "GitHub Actions"). The original high-resolution photo library and the CV are not part of this repository.

After the site has an address, add an absolute `og:image` meta tag to `dist/index.html` for link previews; it was removed because it pointed at a previous host.
