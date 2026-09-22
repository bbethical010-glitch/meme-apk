# Agent Context & Instructions: Meme Capsule

> **PRIMARY CONTEXT DOCUMENT:** All AI agents working on this project must consult **[AI_APP_CONTEXT.md](file:///Users/prathampandey/Desktop/zip/AI_APP_CONTEXT.md)** for full architecture, feature inventory, state schemas, native Android bridges, and operational guardrails.

## Quick Reference for Agents

- **Project Name:** Meme Capsule (`com.meme.capsule`)
- **Core Architecture:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Capacitor 8 Android + Cloudflare D1/R2.
- **Current Distribution Status:** Google Play Console Internal Testing (Pre-Production).
- **Primary Design Aesthetic:** Neo-Brutalist Arcade / Cyberpunk (sharp corners, thick solid borders, offset drop shadows, `#131313` cyber dark theme).

## Critical Non-Negotiable Rules
1. **Preserve Native Java Bridge:** Always maintain compatibility with `window.MemeCapsuleAndroid` in `MainActivity.java` for gallery downloads (MediaStore) and native sharing (`FileProvider`).
2. **Never Display Database / R2 IDs on the UI:** Keep the card strip clean (internal hashes removed in recent commits `3e6ba5a` and `8cccb7b`).
3. **Immersive #131313 Dark Theme:** Never reintroduce white top/bottom bars or flashes on Android or web.
4. **FIFO Prefetch Pipeline:** Do not bypass the 7-meme background prefetch buffer (`memeQueue` / `fillPipeline`) in `src/App.tsx`.
5. **Google Play Safety (UGC):** Preserve NSFW filtering and `ReportModal` submission (`/api/report`).
6. **Lint Check Before Completing Work:** Always verify changes with `npm run lint`.

*For detailed specifications, consult [AI_APP_CONTEXT.md](file:///Users/prathampandey/Desktop/zip/AI_APP_CONTEXT.md).*
