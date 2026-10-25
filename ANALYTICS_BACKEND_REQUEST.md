# Backend Analytics Ingestion Allowlist Request

This document details requested additions to the backend analytics allowlist for missing client product roles identified during the client compatibility and role coverage audit.

In accordance with strict client rules, the Android client **does not emit** these event names until they are formally deployed to backend D1/ingestion rules.

---

## Requested Events & Proposed Schemas

### 1. `meme_pin`
- **Role:** Pin meme to user mood board / collection header.
- **Current Client Status:** Not emitted.
- **Proposed Event Name:** `meme_pin`
- **Root Dimensions:**
  - `meme_id`: string (e.g., `"meme_12345"`)
  - `screen_name`: string (`"deck"` or `"vault"`)
- **Allowed Properties:**
  - `action`: string (`"pin"` | `"unpin"`)
  - `board_id`: string (optional, mood board identifier)

### 2. `ad_reward_offered`
- **Role:** Rewarded ad opportunity is presented/offered to user (e.g. bonus drop dialog shown).
- **Current Client Status:** Not emitted. Client only emits `ad_impression` (when the ad begins) and `ad_reward_viewed` (when the reward callback completes).
- **Proposed Event Name:** `ad_reward_offered`
- **Root Dimensions:**
  - `screen_name`: string (`"home"` | `"deck"` | `"store"`)
- **Allowed Properties:**
  - `reward_type`: string (`"bonus_drop"`)
  - `trigger`: string (`"empty_deck"` | `"store_action"`)

### 3. `client_error`
- **Role:** Diagnostic client-side error telemetry (non-PII, coarse failure tracking).
- **Current Client Status:** Not emitted.
- **Proposed Event Name:** `client_error`
- **Root Dimensions:**
  - `screen_name`: string
- **Allowed Properties:**
  - `error_type`: string (`"network"` | `"render"` | `"billing"`)
  - `error_code`: string (coarse status code, e.g. `"HTTP_500"`, `"BILLING_UNAVAILABLE"`)
  - `sanitized_message`: string (max 128 characters, zero tokens, zero PII)

### 4. `meme_download` (Optional Dedicated Event)
- **Role:** Explicit image/meme download to Android MediaStore / Gallery.
- **Current Client Status:** Emitted under `meme_save` with property `destination: "download"` or `action: "download"`.
- **Proposed Event Name:** `meme_download`
- **Root Dimensions:**
  - `meme_id`: string
  - `screen_name`: string
- **Allowed Properties:**
  - `status`: string (`"success"` | `"failure"`)
  - `source`: string (`"button"` | `"share_sheet"`)

---

## Backend Ingestion Deployment Checklist
- [ ] Add `meme_pin`, `ad_reward_offered`, `client_error`, `meme_download` to `ALLOWED_EVENT_NAMES` in backend `functions/api/analytics/events.ts`.
- [ ] Add property keys (`board_id`, `trigger`, `error_type`, `error_code`, `sanitized_message`, `status`, `source`) to backend properties allowlist.
- [ ] Deploy Cloudflare Pages backend migration.
- [ ] Notify Android client team to enable emission in upcoming release.
