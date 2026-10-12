#!/usr/bin/env bash
set -euo pipefail

OWNER="editorav010-dev"
REPO="meme-capsule-sync"
BRANCH="main"

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

API_URL="https://api.github.com/repos/$OWNER/$REPO/contents/MEME_CAPSULE_KNOWLEDGE.md?ref=$BRANCH"
RESP=$(curl -s -f -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" "$API_URL" || true)

if [ -z "$RESP" ]; then
  echo "Error: Failed to fetch from GitHub API. Verify network and CAPSULE_TOKEN." >&2
  exit 1
fi

mkdir -p "$(dirname "$LOCAL_PATH")"
mkdir -p "$(dirname "$META_PATH")"

if command -v python3 >/dev/null 2>&1; then
  python3 -c '
import sys, json, base64
data = json.loads(sys.stdin.read())
content = base64.b64decode(data.get("content", "")).decode("utf-8")
with open("'"$LOCAL_PATH"'", "w", encoding="utf-8") as f:
    f.write(content)
with open("'"$META_PATH"'", "w", encoding="utf-8") as f:
    json.dump({"sha": data["sha"]}, f, indent=2)
sha_short = data["sha"][:7]
print(f"MEME_CAPSULE_KNOWLEDGE.md fetched successfully! (sha: {sha_short}) -> synced to '"$LOCAL_PATH"'")
' <<< "$RESP"
elif command -v node >/dev/null 2>&1; then
  node -e '
const fs = require("fs");
const data = JSON.parse(process.argv[1]);
fs.writeFileSync(process.argv[2], Buffer.from(data.content, "base64").toString("utf-8"), "utf-8");
fs.writeFileSync(process.argv[3], JSON.stringify({ sha: data.sha }, null, 2), "utf-8");
console.log(`MEME_CAPSULE_KNOWLEDGE.md fetched successfully! (sha: ${data.sha.slice(0, 7)}) -> synced to ${process.argv[2]}`);
' "$RESP" "$LOCAL_PATH" "$META_PATH"
else
  SHA=$(echo "$RESP" | grep -o '"sha": *"[^"]*"' | head -n 1 | cut -d'"' -f4)
  B64_CONTENT=$(echo "$RESP" | grep -o '"content": *"[^"]*"' | head -n 1 | cut -d'"' -f4)
  if echo "dGVzdA==" | base64 -D >/dev/null 2>&1; then
    echo "$B64_CONTENT" | base64 -D > "$LOCAL_PATH"
  else
    echo "$B64_CONTENT" | base64 -d > "$LOCAL_PATH"
  fi
  echo "{\"sha\": \"$SHA\"}" > "$META_PATH"
  echo "MEME_CAPSULE_KNOWLEDGE.md fetched successfully! (sha: ${SHA:0:7}) -> synced to $LOCAL_PATH"
fi
