# Hyperframes Composition Brief: Meme Capsule

## Objective and output
Create the narrated 30-second landscape launch film specified in `brag-plan.md`.
1920 × 1080, 30fps; composition under `composition/`; final MP4/poster one directory above.
The user's explicit 30-second request overrides the usual shorter brag default.

## Source truth
Project: `/Users/prathampandey/Desktop/zip`.
Source: `src/App.tsx`, `src/ShareModal.tsx`, `src/CreateBoardModal.tsx`, `src/index.css`, `index.html`, `src/types.ts`, canonical shared knowledge.
Actual copy: HIT ME; MEME VAULT; MOOD BOARDS; LIKE; VAULT; PIN; MORE.
Use the existing official app icon in `public/assets/` and captures of the working React UI.
Show an isolated sample session, documenting content provenance in an asset ledger.
Do not show fabricated pricing, purchase outcomes or production availability of local-only monetization changes.

## Creative direction
Preset `default`; neon arcade with neo-brutalist physicality. Fast entrances, calm readable holds.
Hook: “YOUR BREAK DESERVES BETTER.”
Five scenes: hook 0–4, tap/drop 4–10, Vault/Boards 10–17, Share 17–24, brand/CTA 24–30.
Use the detailed storyboard and voice script in `brag-plan.md` as the contract.

## Design tokens
Canvas `#131313`, text `#f5f2f7`, purple `#9b30ff`, gold `#f4c300`, pink `#dd0061`.
Anton headlines and Oswald support text. Ship local font files and GSAP.
Black hard borders and offset shadows are intentional source-brand choices.
Large title/panel hierarchy, 100px+ safe margins, no generic SaaS grids.

## Motion and assets
Search/install registry headline/transition primitives before adapting them.
One deterministic paused GSAP timeline registered to the root composition ID.
Timed scene clips contain animated inner wrappers; framework owns media timing.
Product screenshots remain crisp and faithful; the composition supplies camera/panel motion.
Use an actual tap position from the browser capture, then the resulting screenshot.
Persist asset provenance and all local preparation scripts for reproducibility.

## Audio
Required narration: local Kokoro `af_heart` via `hyperframes tts`; no provider fallback.
Generate five lines and measure duration before finalizing timing.
Music: bundled `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`, 0–30s.
Cue preset: `.claude/skills/brag/assets/music/cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json`.
At 24.01s, beat-lock the end-card's first visual arrival.
Use low-risk SFX from the bundled analysis, matched to implemented button/card motion.
Group narration as `voiceover`; dynamic carve on the music bed plus fade automation.
Pre-extract music bands with the Hyperframes creative helper; use restrained backplate presence. Document any extraction failure instead of claiming reactivity.

## Acceptance and handoff
`npx hyperframes check` must pass with zero errors including contrast/layout.
Inspect first frame, each proof state, handoffs and final settled frame; inspect actual UI readability.
Start persistent Studio preview, verify HTTP 200, provide its project URL and request approval.
After approval, render delivery-quality video, verify duration/audio/resolution, choose best settled poster and bake it into frame 0. Keep the final brand hold intact.
