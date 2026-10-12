#!/usr/bin/env bash
set -euo pipefail

OWNER="editorav010-dev"
REPO="meme-capsule-sync"
BRANCH="main"
MESSAGE="${MESSAGE:-Update MEME_CAPSULE_KNOWLEDGE.md via AI agent}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

META_PATH="${META_PATH:-$SCRIPT_DIR/.knowledge_meta.json}"

if [ -z "${LOCAL_PATH:-}" ]; then
  if [ -f "$PROJECT_ROOT/docs/MEME_CAPSULE_KNOWLEDGE.md" ]; then
    LOCAL_PATH="$PROJECT_ROOT/docs/MEME_CAPSULE_KNOWLEDGE.md"
  elif [ -f "$SCRIPT_DIR/MEME_CAPSULE_KNOWLEDGE.md" ]; then
    LOCAL_PATH="$SCRIPT_DIR/MEME_CAPSULE_KNOWLEDGE.md"
  elif [ -f "$PROJECT_ROOT/MEME_CAPSULE_KNOWLEDGE.md" ]; then
    LOCAL_PATH="$PROJECT_ROOT/MEME_CAPSULE_KNOWLEDGE.md"
  else
    LOCAL_PATH="$PROJECT_ROOT/docs/MEME_CAPSULE_KNOWLEDGE.md"
  fi
fi

TOKEN="${CAPSULE_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  for env_file in "$SCRIPT_DIR/.env" "$PROJECT_ROOT/.env"; do
    if [ -f "$env_file" ]; then
      set +e
      TOKEN_LINE=$(grep -E '^\s*CAPSULE_TOKEN\s*=' "$env_file" | head -n 1)
      set -e
      if [ -n "$TOKEN_LINE" ]; then
        TOKEN=$(echo "$TOKEN_LINE" | sed -E 's/^\s*CAPSULE_TOKEN\s*=\s*//' | tr -d '"'\'' ')
        break
      fi
    fi
  done
fi

if [ -z "$TOKEN" ]; then
  echo "Error: CAPSULE_TOKEN is not set. Set it via export CAPSULE_TOKEN=\"ghp_...\" or in .knowledge/.env." >&2
  exit 1
fi

if [ ! -f "$META_PATH" ]; then
  echo "Error: Metadata file '$META_PATH' not found. Run .knowledge/fetch-knowledge.sh first." >&2
  exit 1
fi

SHA=$(grep -o '"sha": *"[^"]*"' "$META_PATH" | head -n 1 | cut -d'"' -f4)
if [ -z "$SHA" ]; then
  echo "Error: Could not read previous sha from '$META_PATH'. Run .knowledge/fetch-knowledge.sh first." >&2
  exit 1
fi

if [ ! -f "$LOCAL_PATH" ] || [ ! -s "$LOCAL_PATH" ]; then
  echo "Error: Content file '$LOCAL_PATH' is missing or empty. Run .knowledge/fetch-knowledge.sh first." >&2
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  PAYLOAD=$(python3 -c '
import sys, json, base64
with open("'"$LOCAL_PATH"'", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")
print(json.dumps({"message": "'"$MESSAGE"'", "content": b64, "sha": "'"$SHA"'", "branch": "'"$BRANCH"'"}))
')
elif command -v node >/dev/null 2>&1; then
  PAYLOAD=$(node -e '
const fs = require("fs");
console.log(JSON.stringify({
  message: process.argv[2],
  content: fs.readFileSync(process.argv[1]).toString("base64"),
  sha: process.argv[3],
  branch: process.argv[4]
}));
' "$LOCAL_PATH" "$MESSAGE" "$SHA" "$BRANCH")
else
  B64=$(base64 < "$LOCAL_PATH" | tr -d '\r\n')
  PAYLOAD="{\"message\":\"$MESSAGE\",\"content\":\"$B64\",\"sha\":\"$SHA\",\"branch\":\"$BRANCH\"}"
fi

API_URL="https://api.github.com/repos/$OWNER/$REPO/contents/MEME_CAPSULE_KNOWLEDGE.md"
TMP_RESP=$(mktemp)
HTTP_CODE=$(curl -s -o "$TMP_RESP" -w "%{http_code}" -X PUT \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$API_URL" || true)

RAW_RESP=$(cat "$TMP_RESP")
rm -f "$TMP_RESP"

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  NEW_SHA=$(echo "$RAW_RESP" | grep -o '"sha": *"[^"]*"' | head -n 1 | cut -d'"' -f4)
  if command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json; json.dump({"sha": "'"$NEW_SHA"'"}, open("'"$META_PATH"'", "w"), indent=2)'
  else
    echo "{\"sha\": \"$NEW_SHA\"}" > "$META_PATH"
  fi
  if [ "$NEW_SHA" = "$SHA" ]; then
    echo "NOTICE: GitHub SHA did not change (${NEW_SHA:0:7}). Content was identical."
  else
    echo -e "\033[0;32mMEME_CAPSULE_KNOWLEDGE.md updated successfully! (new sha: ${NEW_SHA:0:7})\033[0m"
    echo "Synced source: $LOCAL_PATH"
  fi
elif [ "$HTTP_CODE" -eq 409 ]; then
  echo -e "\033[0;33mCONFLICT DETECTED (HTTP 409): Someone updated the file on GitHub after your last fetch.\033[0m" >&2
  echo "1. Run .knowledge/fetch-knowledge.sh to get the latest version." >&2
  echo "2. Merge your changes into the updated file." >&2
  echo "3. Run .knowledge/update-knowledge.sh again." >&2
  exit 1
elif [ "$HTTP_CODE" -eq 403 ]; then
  echo "Error: PERMISSION DENIED (HTTP 403). Your CAPSULE_TOKEN does not have write access." >&2
  exit 1
elif [ "$HTTP_CODE" -eq 401 ]; then
  echo "Error: AUTHENTICATION FAILED (HTTP 401). CAPSULE_TOKEN is invalid or expired." >&2
  exit 1
else
  echo "Error: UPDATE FAILED (HTTP $HTTP_CODE): $RAW_RESP" >&2
  exit 1
fi
