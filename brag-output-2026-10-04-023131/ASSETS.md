# Asset and capture ledger

- Official icon: `public/assets/meme_capsule_app_icon_512x512.png`, copied unchanged.
- UI: five 860×1800 PNGs captured from the current React app in isolated Playwright Chromium; 430×900 CSS viewport at 2× density. The capture creates WORKPLACE CHAOS, saves and pins the shown meme via real UI controls. `capture-evidence.json` records the HIT ME target and source URLs.
- Sample images: frozen public backend responses and originals in `composition/assets/content/source.json`. Cake memes 1 and 2 were visually reviewed and used. Sample 3 was downloaded during selection but is not used in the composition.
- Capture isolation: preferences skip the already-documented onboarding and turn off background prefetch/Reddit for deterministic imagery. Requests that could write backend data are intercepted. No actual personal browser data or native purchase state used.
- Detail images: `prepare-visual-data.mjs` crops captured pixels; it does not redraw UI. The HIT ME crop excludes the local-only packs section. Crops intentionally focus on app actions rather than phone chrome.
- Fonts: Anton and Oswald Latin regular WOFF2 from Fontsource via jsDelivr (SIL Open Font License font families).
- Runtime: local GSAP 3.14.2; Hyperframes pinned to 0.8.116. Registry components line-by-line-slide and directional-wipe are adapted for source colors, large type and real screens.
- Narration: generated locally with Kokoro-82M, voice `af_heart`, normal speed. Five measured WAVs; exact text and durations in `voice-timing.json`.
- Music: bundled Happy Beats / Business Moves vol. 10 by ende.app; first 30 seconds. Cue guidance from the bundled preset; ending reveal locks to 24.01s.
- SFX: bundled CC0 Kenney assets: interface/click_003, impact/impactSoft_medium_001, casino/card-slide-1. Sparse, motion-aligned placements.
- Reactivity: pre-extracted 30fps RMS/bass from the actual bed using the Hyperframes creative extraction helper; bounded backplate opacity on the registered timeline.
- Media-polish scan: UI screenshots already carry intentional brand colors and readable crops. No photographic grade applied.

Scripts run from this output directory: `node prepare-assets.mjs`, `node generate-voice.mjs`, `node capture-product.mjs`, `node prepare-visual-data.mjs`. Voice generation reuses existing WAVs; remove only a deliberately superseded take before regenerating altered copy.
