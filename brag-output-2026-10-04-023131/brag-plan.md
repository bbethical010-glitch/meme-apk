# Brag Plan: Meme Capsule

## Invocation and scope
- Resumed run: `2026-10-04-023131`.
- Voice enabled by `--voice`: local Kokoro `af_heart` through Hyperframes.
- Duration: **30 seconds**, explicitly requested with `--30secs`; this is the reason for exceeding the usual 15–25-second brag range.
- Landscape, 1920 × 1080, 30 fps. Music and tasteful SFX enabled.
- Local deliverables; preview approval precedes the final encode.

## Nine-question rubric
1. **What is the app?** An Android meme dispenser: tap HIT ME for a random meme, save favorites, organize Mood Boards, and share.
2. **Strongest claim?** “One tap. One meme. Zero algorithms.” The joke is how little the app asks of you.
3. **Visual hook?** The actual oversized HIT ME button and tilted, hard-edged arcade card stack in purple, gold, and pink.
4. **Real UI to show?** The current app's Home, loaded meme/LIKE–VAULT–PIN–MORE row, saved Vault, Mood Boards, and Share Sheet.
5. **Shortest satisfying video?** About 22 seconds without voice; the requested 30 seconds gives narration and real screens room to read.
6. **Tone?** `default`, refined to “a neon arcade break from the feed.” Playful and punchy, with confident holds instead of frantic cuts.
7. **Audio?** Warm conversational Kokoro voice over a compact upbeat bed; soft physical hits for the button, card and closing lockup.
8. **Caption?** We built Meme Capsule for the break that doesn't need a feed: tap for a random meme, save the keepers, and send the chaos to your group chat.
9. **Flow?** Open → tap HIT ME → see a random meme; save it → open a collection; open Share → choose a destination.

## The angle
Your break deserves better than a feed. A large, deliberately finite arcade button replaces the endless scroll. The middle of the film demonstrates the working app; the end gives the viewer an immediately memorable name and URL.

## Visual identity
- Background `#131313`; foreground `#f5f2f7`.
- Brand purple `#9b30ff`, gold `#f4c300`, pink `#dd0061`.
- Anton display type, Oswald supporting type, bundled locally.
- Hard 4px borders, offset block shadows, generous screen-safe edges.
- Authentic browser captures from the current React app, with an isolated capture session and documented sample content. Native delivery is represented by its real Share Sheet, without implying a desktop capture tests Android intents.
- Large copy is narrative; smaller real app text is product evidence, not required reading.

## Storyboard (30.00 seconds)

### 1 — Take your break back — 0.00–4.00
Headline: **YOUR BREAK / DESERVES BETTER.** Secondary line: “Than another endless feed.” Official icon anchors the opposite edge; three offset card outlines evoke the app's card deck.
- Sequential: two headline lines settle by 0.6s and hold through the cut.
- Narration: “Your five-minute break shouldn't become an endless scroll.”
- Motion: line-by-line slide, one compact impact, restrained card-depth drift.
- Transition: clean hard cut to the app.

### 2 — The entire premise — 4.00–10.00
Headline: **HIT ME. / GET A MEME.** Actual Home capture in a tall viewport; a visible tap lands on HIT ME, followed by the actual loaded-card state. Enlarge the button moment and hold the resulting meme for at least 2.3s.
- Sequential/interaction: Home → tap → card/result, with the real action row visible.
- Narration: “Meet Meme Capsule. Tap Hit Me, and a random meme drops. That's it.”
- Audio: small tap; soft card landing; music stays below the narrator.
- Transition: directional content handoff.

### 3 — Keep your kind of chaos — 10.00–17.00
Headline: **KEEP THE / GOOD STUFF.** Actual Vault capture followed by Mood Boards. Save/collection labels each hold for multiple seconds; show a real board name created in the isolated demonstration session.
- Sequential/interaction: saved Vault → Mood Boards; panel handoff at approximately 13.5s, adjusted to measured narration.
- Narration: “Found a keeper? Save it to your Vault. Build Mood Boards for every kind of chaos.”
- Audio: quiet save click; soft arrival accent near 15.82s only if it supports the voice timing.
- Transition: content slide, not a new unrelated background.

### 4 — The group chat gets it — 17.00–24.00
Headline: **GROUP CHAT / AMMO.** Actual loaded meme transitions to its Share Sheet; let the real destinations remain legible. Supporting text: “Save it. Pin it. Pass it on.”
- Sequential/interaction: open MORE/Share → Share Sheet slides up. No simulated purchase or external send.
- Narration: “Then send the good stuff straight to the group chat. No hunting for that screenshot.”
- Audio: quiet button accent and low card-slide cue. Secondary accent can land at 20.19s.
- Transition: logo/closing lockup lands at 24.01s, beat-locked.

### 5 — A small app. A complete idea. — 24.00–30.00
Official icon plus **MEME CAPSULE**. “One tap. One meme. Zero algorithms.” `memecapsule.wtf` and “Get it on Google Play.” A final hold of at least 2 seconds after all elements settle.
- Sequential: wordmark, tagline, URL, with full-set readable hold.
- Narration: “One tap. One meme. Zero algorithms. Meme Capsule.”
- Audio: warm landing, music rises slightly after the final word then fades out over the final second.
- Final frame stays on the full lockup.

## Voiceover script
Generate the five narration lines above separately using Kokoro `af_heart`, normal conversational speed. Measure each WAV and place it inside its scene with breathing room. If a line exceeds its scene, shorten the line or rebalance scene holds while retaining exactly 30.00s. Never cut off a word or silently remove narration.

## Music cue guidance
- Track: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`, first 30 seconds.
- Bundled cue preset read; estimated tempo 109.96 BPM, preset covers first 25 seconds.
- Major optional locks: 15.82s collection accent, 20.19s share accent, **24.01s end-card landing**.
- Beat intervals (~0.55s) are for accents, not a new sentence on each beat.
- Copy readability and measured speech outrank beat matching.

## Audio treatment
Bed approximately 0.14 under speech, short fade-in, end fade; dynamic spectral carve against the grouped voice clips. SFX sparse and motion-matched, with low high-frequency risk. A pre-extracted music-energy signal subtly changes existing card/backplate presence; no visualizer bars, strobing or text pulsing.

## Delivery
Validate with Hyperframes check and inspect proof frames. Hand off a persistent Studio preview for approval. Final artifacts after approval: `brag.mp4`, selected `brag.jpg` baked into frame 0, and `share-copy.txt`.
