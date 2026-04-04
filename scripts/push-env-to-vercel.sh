#!/usr/bin/env bash
# Push all env vars from .env.local to Vercel (production + preview + development)
# Uses the Vercel REST API to avoid CLI interactive prompts.
# Usage: bash scripts/push-env-to-vercel.sh

set -e

if [ ! -f ".env.local" ]; then
  echo "Error: .env.local not found. Run from project root."
  exit 1
fi

AUTH_FILE="$APPDATA/com.vercel.cli/Data/auth.json"
if [ ! -f "$AUTH_FILE" ]; then
  echo "Error: Vercel auth not found. Run 'vercel login' first."
  exit 1
fi

node - <<'EOF'
const fs = require('fs');
const https = require('https');

const authFile = process.env.APPDATA + '/com.vercel.cli/Data/auth.json';
const TOKEN = JSON.parse(fs.readFileSync(authFile, 'utf8')).token;
const PROJECT_ID = 'prj_7PnZFvWcXCESmbJ7ZuFnX3LcDpYm';
const TEAM_ID   = 'team_yceEa2nj02sd6FQdnQpGdbft';

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.vercel.com',
      path: `${path}?teamId=${TEAM_ID}&upsert=true`,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const raw = fs.readFileSync('.env.local', 'utf8');
  const lines = raw.split(/\r?\n/);
  const vars = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key   = trimmed.slice(0, eqIdx).trim();
    let   value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) vars.push({ key, value });
  }

  console.log(`Found ${vars.length} variables. Pushing to Vercel...`);

  for (const { key, value } of vars) {
    process.stdout.write(`  → ${key} ... `);
    const res = await apiRequest('POST', `/v10/projects/${PROJECT_ID}/env`, {
      key,
      value,
      type: 'encrypted',
      target: ['production', 'preview', 'development'],
    });
    if (res.status === 200 || res.status === 201) {
      console.log('✓');
    } else if (res.body?.error?.code === 'ENV_ALREADY_EXISTS') {
      // Upsert should handle this, but just in case
      console.log('already set ✓');
    } else {
      console.log(`FAILED (${res.status}): ${res.body?.error?.message || JSON.stringify(res.body)}`);
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
EOF
