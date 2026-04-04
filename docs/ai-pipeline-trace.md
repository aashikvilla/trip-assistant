# AI Pipeline End-to-End Trace
**Date:** 2026-04-04T10:49:20.115Z
**Trip ID:** 5a1b1c3a-daf8-4624-85aa-80cf76c06fd2

## Step 0: Configuration
### OpenRouter Models
```json
{
  "WEB_SEARCH": "qwen/qwen3.6-plus:free",
  "ITINERARY_PLANNING": "meta-llama/llama-3.3-70b-instruct:free",
  "CHAT": "google/gemma-3-27b-it:free",
  "REVIEW": "openai/gpt-oss-120b:free"
}
```

- OPENROUTER_API_KEY: ***set***
- SUPABASE_URL: https://qexzncckglegwgbqhhve.supabase.co

## Step 1: DBContextTool — Load Trip Context

**FATAL:** TripNotFoundError: Trip not found: 5a1b1c3a-daf8-4624-85aa-80cf76c06fd2