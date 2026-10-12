# BACKEND REQUEST: Category & Drop Mode Support for Meme Capsule

**Date:** October 12, 2026  
**Requested By:** Android / Client Team  
**Scope:** Serverless Edge API (`functions/api/random-meme.ts` & D1 Database)

---

## 1. Summary
The Meme Capsule Android application has implemented Drop Mode Packs in the client store and hero UI:
- **Dark Humour** (`pack_dark_humour`)
- **Wholesome** (`pack_wholesome`)
- **Desi Memes** (`pack_desi`)
- **Gaming** (`pack_gaming`)

Currently, `functions/api/random-meme.ts` does not accept query parameters for filtering by category or tag. As per client architecture safety constraints, client code has kept these packs marked as `available: false` (displaying **COMING SOON** in the store and hero picker) to prevent selling features until the backend endpoint is ready.

---

## 2. API Endpoint Specification Needed

### Request
```http
GET /api/random-meme?category={category}&count={count}
```

### Supported Category Parameters
- `all` (default): random meme across all active categories.
- `dark_humour`: memes categorized under Dark Humour.
- `wholesome`: memes categorized under Wholesome.
- `desi`: memes categorized under Desi / Regional.
- `gaming`: memes categorized under Gaming.

### D1 Database Schema Consideration
Ensure the `memes` table in Cloudflare D1 has an indexed `category` or `tags` column:
```sql
ALTER TABLE memes ADD COLUMN category TEXT DEFAULT 'general';
CREATE INDEX idx_memes_category ON memes(category);
```

### Response Format (unchanged)
```json
{
  "meme": {
    "id": "meme_12345",
    "url": "https://pub-...r2.dev/meme_12345.webp",
    "caption": "Meme title or punchline",
    "category": "gaming",
    "source": "curated"
  }
}
```

---

## 3. Client Readiness
Once this backend query parameter is implemented, the client will set `available: true` in `src/monetization/catalog.ts` and pass `?category={activeDropMode}` in the fetch call without breaking any FIFO buffer or swipe physics.
