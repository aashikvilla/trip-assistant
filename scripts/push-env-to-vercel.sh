#!/usr/bin/env bash
# Push all env vars from .env.local to Vercel (production + preview + development)
# Usage: bash scripts/push-env-to-vercel.sh

set -e

if [ ! -f ".env.local" ]; then
  echo "Error: .env.local not found. Run from project root."
  exit 1
fi

ENVS=("production" "preview" "development")

while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip blank lines and comments
  [[ -z "$line" || "$line" =~ ^# ]] && continue

  # Split on first '='
  key="${line%%=*}"
  value="${line#*=}"

  # Strip surrounding quotes from value
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  [[ -z "$key" ]] && continue

  echo "→ Setting $key ..."
  for env in "${ENVS[@]}"; do
    # Remove existing value silently, then add fresh
    vercel env rm "$key" "$env" --yes 2>/dev/null || true
    printf '%s' "$value" | vercel env add "$key" "$env"
  done
done < .env.local

echo ""
echo "Done. All env vars pushed to Vercel."
