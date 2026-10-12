## Mandatory Cross-Codebase Knowledge Sync Workflow

The canonical single source of truth across all 3 Meme Capsule repositories is `MEME_CAPSULE_KNOWLEDGE.md`, synchronized via `editorav010-dev/meme-capsule-sync`. All sync scripts are maintained inside `.knowledge/`.

### 1. BEFORE STARTING ANY TASK (MANDATORY STEP 0):
Before writing any code or changing any configuration, detect your operating system and fetch the latest master knowledge:
- **Windows**: `powershell -ExecutionPolicy Bypass -File .knowledge/fetch-knowledge.ps1`
- **macOS / Linux**: `bash .knowledge/fetch-knowledge.sh`
Read `MEME_CAPSULE_KNOWLEDGE.md` to understand recent architectural updates, schema migrations, and decisions made by teammates across other codebases.

### 2. AFTER COMPLETING ANY TASK (MANDATORY FINAL STEP):
After making ANY changes (features, bug fixes, UI/UX changes, Android APK updates, billing, or config):
1. Update `MEME_CAPSULE_KNOWLEDGE.md` with your new changes, version updates, or notes.
2. Push the updated knowledge file back to the shared repository:
   - **Windows**: `powershell -ExecutionPolicy Bypass -File .knowledge/update-knowledge.ps1`
   - **macOS / Linux**: `bash .knowledge/update-knowledge.sh`
3. **If a CONFLICT (HTTP 409) occurs:** Run the fetch script fresh, manually merge your changes into the latest file, and run the update script again. Never force-push or bypass the fetch.

### 3. STRICT REPOSITORY BOUNDARY ENFORCEMENT:
When editing `MEME_CAPSULE_KNOWLEDGE.md`, you are strictly restricted to the section corresponding to THIS codebase:
- **If working in Android APK (`com.meme.capsule`)**: Only modify Android APK, Google Play billing, store architecture, AdMob, themes, and client bridge sections.
- **If working in Companion Web (`memecapsule.wtf`)**: Only modify promotional landing, web marketing, and client web sections.
- **If working in Backend / Curation Engine (`Meme-Capsule`)**: Only modify Cloudflare Pages, D1 tables, R2 storage, `/curate`, `/admin`, and AI Judge sections.
**NEVER** touch, wipe, replace, or summarize another codebase's context. Always preserve external sections verbatim!