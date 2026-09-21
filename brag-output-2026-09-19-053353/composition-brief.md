# Hyperframes Composition Brief: Meme Capsule

## Objective
Create a 25-second horizontal launch reel for Meme Capsule that sells the anti-feed premise through fast, loud, internet-native chaos.

## Output
- Composition directory: `brag-output-2026-09-19-053353/composition/`
- Rendered video: `brag-output-2026-09-19-053353/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 25 seconds

## Source Material
- Project root: `/Users/prathampandey/Desktop/zip`
- Primary files read: `src/App.tsx`, `src/index.css`, `README.md`, `public/assets/meme_capsule_app_icon_512x512.png`
- Product name: Meme Capsule
- Tagline / strongest claim: one random meme, no algorithmic feed
- Key UI moment: yellow `HIT ME` button, terminal loading logs, result card, reaction picker, Vault
- Copy that must appear verbatim:
  - `HIT ME`
  - `DANK!`
  - `ONE TAP. ONE MEME. PURE CHAOS.`
  - `memecapsule.wtf`

## Creative Direction
- Tone preset: chaotic
- Creative direction: unhinged internet-native anti-feed product launch
- Interpretation: all-caps heavy type, neo-brutalist gold/purple/pink palette, hard cuts, flashes, zooms, and rapid readable holds.
- Angle: no algorithm, no feed, no control; just one button and a random meme.
- Hook: algorithmic feed boredom collapses into `NO ALGORITHM. NO FEED.` then `HIT ME`.
- Outro / punchline: `ONE TAP. ONE MEME. PURE CHAOS.` with Play Store badge and URL.
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Voiceover
  - Any shot lingering longer than two seconds before the final lockup

## Visual Identity
- Background: `#131313`
- Text: `#e5e2e1`
- Accent: `#9b30ff`, `#f4c300`, `#dd0061`
- Display font: Anton with `Impact, Arial Black, sans-serif` fallback
- Body font: Chivo with `ui-monospace, monospace` fallback
- Visual references: original brutalist button shadow, loading shimmer, hacker logs, reaction chips, app icon

## Storyboard
Use `brag-plan.md` as the creative contract.

Scene summary:
1. Algorithmic coma — 2.0s — fake feed cards collapse into NO ALGORITHM / NO FEED
2. One button — 2.0s — HIT ME tap and NO CONTROL
3. Terminal roulette — 3.0s — real hacker logs and 100% payload progress
4. Random payload — 2.0s — meme result card slam
5. The reaction — 2.0s — reaction chips and DANK!
6. Vault the chaos — 2.0s — SAVED TO VAULT and next drop
7. Anti-feed manifesto — 2.0s — NO ALGORITHM / NO FEED / NO CONTROL
8. Final lockup — 10.0s — icon, tagline, Play Store badge, URL, HIT ME AGAIN

## Audio
- Audio role: dense rhythmic layer
- Audio arc: energetic music from frame one, denser accents through the flow, strong final logo hit, short fade beneath the end hold
- Music: `assets/music/happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`
- Music treatment: 0.28 volume, full duration, slight fade under final lockup
- Music cue guidance: bundled preset at `assets/music/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json`; target strong cues 15.82s, 18.01s, 20.19s, 22.92s
- Audio-reactive treatment: subtle RMS/low-band scaling on glows and icon only
- Audio-coupled moments:
  - HIT ME tap — click
  - terminal lines — short glitch ticks
  - payload and DANK! — impact punches
  - final lockup — bell/impact on 22.92s
- SFX selection guidance: use interface clicks/glitches, impact punches for chaotic reveals, and one bell for the logo; align each to animation start
- SFX analysis guidance: `assets/sfx-analysis.md`
- Exact SFX choice: choose the copied local assets based on motion
- Audio files: all selected files are already copied into `composition/assets/`

## Hyperframes Instructions
Use the current Hyperframes composition contract, a single paused GSAP timeline in `window.__timelines["main"]`, and local relative assets. Show real product copy and flow. Keep all non-final scenes under two seconds, preserve 25 seconds exactly, and run `npx hyperframes check` before rendering.
