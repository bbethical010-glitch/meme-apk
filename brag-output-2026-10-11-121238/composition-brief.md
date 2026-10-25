# Hyperframes Composition Brief: Meme Capsule

## Objective
Create a 30-second launch-style brag video for Meme Capsule, an anti-algorithm meme dispenser for Android.

## Output
- Composition directory: `brag-output-2026-10-11-121238/composition/`
- Rendered video: `brag-output-2026-10-11-121238/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 30 seconds

## Source Material
- Project root: `/Users/prathampandey/Desktop/zip`
- Primary files read: `index.html`, `src/index.css`, `src/App.tsx`, `src/components/MemeStack.tsx`, `src/components/MemeCard.tsx`, `src/ShareModal.tsx`, `src/monetization/packs.ts`, `info.md`, `MEME_CAPSULE_KNOWLEDGE.md`
- Product name: Meme Capsule
- Tagline / strongest claim: `One Tap. One Meme. Zero Fluff.`
- Key UI or visual moment to recreate: the HIT ME dispenser, hacker loading console, 4-card 3D spring stack, and LIKE / VAULT / PIN / MORE CTA row
- Copy that must appear verbatim:
  - `NO FEED. NO DOOMSCROLL.`
  - `HIT ME`
  - `CONTACTING MEME NETWORK...`
  - `HARVESTING CLOUDFLARE D1 SHARDS...`
  - `FILTERING CRINGE FREQUENCIES...`
  - `ONE TAP. ONE MEME. ZERO FLUFF.`

## Creative Direction
- Tone preset: chaotic
- Creative direction: overproduced cyber-arcade launch trailer for a deliberately simple meme dispenser
- Interpretation: Use modern kinetic typography, chromatic aberration, scanlines, tactile cards, hard cuts, punch-in camera energy, and tasteful motion graphics while keeping the app UI recognisable and copy readable.
- Angle: The internet is an endless feed; Meme Capsule is the dramatic arcade machine that gives you exactly one curated meme and lets you escape.
- Hook: `NO FEED. NO DOOMSCROLL. JUST HIT ME.`
- Outro / punchline: `OPEN ONE. SEND ONE. ESCAPE.`
- Avoid:
  - Generic SaaS language
  - Abstract filler without product UI
  - A fake feed or recommendation algorithm
  - Tiny unreadable copy
  - Overusing glitch effects

## Visual Identity
- Background: `#131313`
- Text: `#e5e2e1` / white
- Accent: `#9b30ff`, `#f4c300`, `#dd0061`
- Display font: Anton-like local fallback, preferably shipped or a safe system fallback if no font asset is available
- Body font: Oswald / Chivo-like fallback
- Visual references from the project: neo-brutalist borders, offset shadows, gold/purple/pink palette, CRT grain, 4-card stack, arcade UI labels, supplied icon at `composition/assets/meme_capsule_app_icon_design.png`

## Storyboard
Use `brag-plan.md` as the creative contract.

Scene summary:
1. Anti-feed hook — 3s — kinetic `NO FEED. NO DOOMSCROLL. JUST HIT ME.`
2. The dispenser — 4s — HIT ME app panel and tap interaction
3. Hacker decryption — 4s — real loading-console copy and counter scramble
4. The drop — 6s — 3D card stack, epic meme card, swipe
5. Save, pin, share — 5s — CTA row and share ribbon
6. Anti-algorithm proof — 4s — zero-account / zero-algorithm / curated proof points
7. Logo close — 4s — supplied icon and final tagline

## Audio
- Audio role: dense rhythmic layer with polished arcade impacts
- Audio arc: immediate pulse, rising through the decryption and card reveal, then a confident lower-density outro
- Music: `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`
- Music treatment: data-start 0, total 30 seconds, volume around 0.32, slight duck under the final logo hold
- Music cue guidance: `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json`; target major moments near 2.5s, 12s, and 26.5s; use the beat grid for card and CTA accents, not for rushed text
- Audio-reactive treatment: subtle RMS/bass response on the background glow, card presence, and scanlines; no waveform/equalizer visuals
- Audio-coupled moments:
  - Hook text — sparse key/click accents
  - HIT ME tap — one UI click
  - Card stack — card-slide/card-place rhythm
  - Final icon — one heavy impact bell
- SFX selection guidance: use local files from `composition/assets/`; keep SFX at moderate volume and align them to animation starts
- Exact SFX choice: selected from local CC0 assets; Hyperframes may adjust timestamps and density based on the implemented motion
- Audio files: copied into `composition/assets/music/` and `composition/assets/sfx/`

## Hyperframes Instructions
- Build a single deterministic standalone composition with one paused GSAP timeline.
- Use the current Hyperframes core data-attribute contract.
- Use modern motion graphics grounded in the actual app: kinetic type, chromatic channel offsets, grid/scanline texture, 3D card depth, spring-like CTA chips, and logo sting.
- Use the supplied icon asset locally.
- Keep all required text readable.
- Run `npx hyperframes check` before rendering.
- Render after the composition passes the check gate.
