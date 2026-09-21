# Hyperframes Composition Brief: Meme Capsule

## Objective
Create a 20.2-second launch-style brag video for Meme Capsule, an intentionally over-serious meme delivery network.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20.2 seconds

## Source Material
- Project root: `/Users/prathampandey/Desktop/zip`
- Primary files read: `src/App.tsx`, `src/index.css`, `src/OnboardingModal.tsx`, `README.md`, `public/assets/meme_capsule_app_icon_512x512.png`
- Product name: `Meme Capsule`
- Tagline / strongest claim: `Pure memes. Zero algorithm.`
- Key UI or visual moment to recreate: oversized `HIT ME` hero action, hacker-style loading logs, meme result card with action rail, Vault and Triple Drop affordances
- Copy that must appear verbatim:
  - `MEME CAPSULE`
  - `MEME NETWORK READY`
  - `HIT ME`
  - `Pure memes. Zero algorithm.`
  - `CONTACTING MEME NETWORK...`
  - `HARVESTING CLOUDFLARE D1 SHARDS...`
  - `SYNCING R2 IMAGE PAYLOAD...`
  - `SECURED IN VAULT`
  - `TRIPLE DROP`

## Creative Direction
- Tone preset: chaotic
- Creative direction: fake infrastructure launch for a meme delivery network
- Interpretation: Fast, loud, high-contrast and dead-serious about absurd backend terminology; hard cuts and impact hits, with readable holds.
- Angle: Present Meme Capsule as a ridiculous but polished network for delivering fresh meme payloads, using the app's real terminology as if it were mission-critical infrastructure.
- Hook: `THE INTERNET IS LOUD.` → `WE BUILT A CAPSULE.`
- Outro / punchline: `MEME CAPSULE` / `THE DANK PAYLOAD IS READY.`
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign
  - Tiny text or unreadable speed ramps

## Visual Identity
- Background: `#131313`
- Text: `#e5e2e1`
- Accent: `#9b30ff`, `#f4c300`, `#dd0061`
- Display font: Anton (use a shipped/local or system-safe fallback)
- Body font: Chivo (use a shipped/local or system-safe fallback)
- Visual references from the project: neo-brutalist borders, offset shadows, purple/yellow/pink palette, hacker logs, capsule icon

## Storyboard
1. System announcement — 2.8s — type the hook and stamp the capsule premise.
2. The product — 3.7s — show the `HIT ME` home UI and simulate the tap.
3. Payload delivery — 4.3s — show the loading logs, progress fill, and meme result.
4. The loop — 4.7s — show swipe, reactions, Vault, and Triple Drop.
5. Hoard the chaos — 4.7s — beat-aligned commands and final logo lockup.

## Audio
- Audio role: dense rhythmic layer with a clear voiceover lane
- Audio arc: low under the hook, rises through the product flow, ducks for the final voice line, then fades under the logo hold
- Music: `assets/music/happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`
- Music treatment: volume 0.16 under voice, 0.26 in the middle, fade toward 0.08 for the final hold
- Music cue guidance: `assets/music/cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json`; strong cues at 15.82s, 18.01s, 20.19s; beat grid available for sequential accents
- Audio-reactive treatment: subtle; use pre-extracted RMS/bass to breathe the capsule glow and progress meter, never a waveform
- Audio-coupled moments:
  - Scene 1 hook stamp — keyboard typing then impact
  - Scene 2 `HIT ME` press — simulated click
  - Scene 3 result card — warm reveal hit
  - Scene 4 reactions — first and final chip accents
  - Scene 5 logo — final bell
- SFX selection guidance: choose low/medium-risk impact and interface sounds; exact filenames can follow the implemented motion
- SFX analysis guidance: `.agents/skills/brag/assets/sfx/sfx-analysis.md`
- Exact SFX choice: use the local files already copied under `composition/assets/sfx/`
- Audio files: music, cue metadata, `interface/click_003.ogg`, `interface/glitch_002.ogg`, `impact/impactSoft_medium_001.ogg`, `impact/impactBell_heavy_000.ogg`

## Voice
Voice is enabled for this run. Use Kokoro with `af_heart`; generate `composition/assets/voiceover.wav` from the script in `brag-plan.md`. Music must duck while voiceover is active.

## Hyperframes Instructions
Use the current Hyperframes composition contract: one paused GSAP timeline registered as `window.__timelines["main"]`, deterministic animation, local audio assets, and `data-*` scene timing. Show actual Meme Capsule copy and UI patterns. Use beat comments for the major stamp, result reveal, and logo; align sequential reaction chips to the bundled beat grid where readability allows. Include a subtle per-frame audio-reactive treatment driven by pre-extracted audio data if extraction is available; document and skip only if the helper or FFmpeg is unavailable.
