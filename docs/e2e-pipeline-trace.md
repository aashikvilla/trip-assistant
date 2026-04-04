
══════════════════════════════════════════════════════════════════════
  E2E PIPELINE TEST — Trip: 0bb5a13c-0673-4f31-aec5-2ca16841f689
══════════════════════════════════════════════════════════════════════
[2026-04-04T20:51:09.351Z] [MAIN] Starting full pipeline test
  {
  "openRouterKey": "set (sk-or-v1...)",
  "supabaseUrl": "set",
  "serviceRoleKey": "set"
}

══════════════════════════════════════════════════════════════════════
  STEP 1: Reset stuck jobs & load trip context
══════════════════════════════════════════════════════════════════════
[2026-04-04T20:51:10.648Z] [DB] Stuck jobs reset to 'failed'
[2026-04-04T20:51:11.089Z] [MAIN] ✓ Trip loaded
  {
  "name": "Mumbai",
  "destination": "Mumbai",
  "dates": "2026-04-05 → 2026-04-06",
  "currentStatus": "completed"
}
[2026-04-04T20:51:11.475Z] [CONTEXT] Members loaded
  {
  "count": 6,
  "interests": [
    "food",
    "culture",
    "museums",
    "beaches",
    "coffee",
    "art",
    "hiking",
    "adventure"
  ],
  "dietary": [
    "vegan",
    "vegetarian",
    "gluten-free"
  ],
  "names": [
    "Aashik",
    "Aryan",
    "Test",
    "Piyush",
    "Soumya",
    "Yash"
  ]
}
[2026-04-04T20:51:11.475Z] [CONTEXT] Trip length: 2 day(s)
  {
  "startDate": "2026-04-05",
  "endDate": "2026-04-06"
}

══════════════════════════════════════════════════════════════════════
  STEP 3: Create new job
══════════════════════════════════════════════════════════════════════
[2026-04-04T20:51:12.209Z] [DB] ✓ Job created: 0b56862d-2cf9-406d-849e-d5f0b022e91a

══════════════════════════════════════════════════════════════════════
  RESEARCH: Mumbai
══════════════════════════════════════════════════════════════════════
[2026-04-04T20:51:12.210Z] [RESEARCH] Running 3 parallel searches for Mumbai
[2026-04-04T20:51:12.210Z] [RESEARCH] Search 1/3: "Mumbai top tourist attractions sightseeing must-see places"
[2026-04-04T20:51:12.210Z] [PROVIDER] Trying model 1/4: google/gemma-3-12b-it:free for search-1
[2026-04-04T20:51:12.211Z] [LLM_CALL] → google/gemma-3-12b-it:free
  {
  "systemLength": 256,
  "userLength": 123,
  "systemPreview": "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful trav",
  "userPreview": "Search query: \"Mumbai top tourist attractions sightseeing must-see places\"\n\nReturn a JSON array of travel research results."
}
[2026-04-04T20:51:12.929Z] [LLM_CALL] ← google/gemma-3-12b-it:free [status=429] [717ms]
[2026-04-04T20:51:12.930Z] [LLM_CALL] ✗ google/gemma-3-12b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:51:12.930Z] [PROVIDER] ✗ Model google/gemma-3-12b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:51:12.931Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:51:20.940Z] [PROVIDER] → Falling back to google/gemma-3-4b-it:free
[2026-04-04T20:51:20.940Z] [PROVIDER] Trying model 2/4: google/gemma-3-4b-it:free for search-1
[2026-04-04T20:51:20.940Z] [LLM_CALL] → google/gemma-3-4b-it:free
  {
  "systemLength": 256,
  "userLength": 123,
  "systemPreview": "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful trav",
  "userPreview": "Search query: \"Mumbai top tourist attractions sightseeing must-see places\"\n\nReturn a JSON array of travel research results."
}
[2026-04-04T20:51:21.273Z] [LLM_CALL] ← google/gemma-3-4b-it:free [status=429] [332ms]
[2026-04-04T20:51:21.275Z] [LLM_CALL] ✗ google/gemma-3-4b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:51:21.276Z] [PROVIDER] ✗ Model google/gemma-3-4b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:51:21.276Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:51:29.280Z] [PROVIDER] → Falling back to google/gemma-3-27b-it:free
[2026-04-04T20:51:29.280Z] [PROVIDER] Trying model 3/4: google/gemma-3-27b-it:free for search-1
[2026-04-04T20:51:29.281Z] [LLM_CALL] → google/gemma-3-27b-it:free
  {
  "systemLength": 256,
  "userLength": 123,
  "systemPreview": "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful trav",
  "userPreview": "Search query: \"Mumbai top tourist attractions sightseeing must-see places\"\n\nReturn a JSON array of travel research results."
}
[2026-04-04T20:51:29.610Z] [LLM_CALL] ← google/gemma-3-27b-it:free [status=429] [329ms]
[2026-04-04T20:51:29.611Z] [LLM_CALL] ✗ google/gemma-3-27b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:51:29.611Z] [PROVIDER] ✗ Model google/gemma-3-27b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:51:29.612Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:51:37.627Z] [PROVIDER] → Falling back to meta-llama/llama-3.3-70b-instruct:free
[2026-04-04T20:51:37.627Z] [PROVIDER] Trying model 4/4: meta-llama/llama-3.3-70b-instruct:free for search-1
[2026-04-04T20:51:37.628Z] [LLM_CALL] → meta-llama/llama-3.3-70b-instruct:free
  {
  "systemLength": 256,
  "userLength": 123,
  "systemPreview": "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful trav",
  "userPreview": "Search query: \"Mumbai top tourist attractions sightseeing must-see places\"\n\nReturn a JSON array of travel research results."
}
[2026-04-04T20:51:38.303Z] [LLM_CALL] ← meta-llama/llama-3.3-70b-instruct:free [status=429] [675ms]
[2026-04-04T20:51:38.305Z] [LLM_CALL] ✗ meta-llama/llama-3.3-70b-instruct:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Provider returned error\",\"code\":429,\"metadata\":{\"raw\":\"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations\",\"provider_name\":\"Venice\",\"is"
}
[2026-04-04T20:51:38.305Z] [PROVIDER] ✗ Model meta-llama/llama-3.3-70b-instruct:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-ins
[2026-04-04T20:51:38.305Z] [RESEARCH] Search 1 FAILED: OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to ac
[2026-04-04T20:51:38.305Z] [RESEARCH] Search 2/3: "Mumbai best restaurants vegan vegetarian gluten-free food local cuisine"
[2026-04-04T20:51:38.305Z] [PROVIDER] Trying model 1/4: google/gemma-3-12b-it:free for search-2
[2026-04-04T20:51:38.306Z] [LLM_CALL] → google/gemma-3-12b-it:free
  {
  "systemLength": 256,
  "userLength": 136,
  "systemPreview": "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful trav",
  "userPreview": "Search query: \"Mumbai best restaurants vegan vegetarian gluten-free food local cuisine\"\n\nReturn a JSON array of travel research results."
}
[2026-04-04T20:51:38.658Z] [LLM_CALL] ← google/gemma-3-12b-it:free [status=429] [352ms]
[2026-04-04T20:51:38.659Z] [LLM_CALL] ✗ google/gemma-3-12b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:51:38.660Z] [PROVIDER] ✗ Model google/gemma-3-12b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:51:38.660Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:51:46.673Z] [PROVIDER] → Falling back to google/gemma-3-4b-it:free
[2026-04-04T20:51:46.675Z] [PROVIDER] Trying model 2/4: google/gemma-3-4b-it:free for search-2
[2026-04-04T20:51:46.676Z] [LLM_CALL] → google/gemma-3-4b-it:free
  {
  "systemLength": 256,
  "userLength": 136,
  "systemPreview": "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful trav",
  "userPreview": "Search query: \"Mumbai best restaurants vegan vegetarian gluten-free food local cuisine\"\n\nReturn a JSON array of travel research results."
}
[2026-04-04T20:51:47.009Z] [LLM_CALL] ← google/gemma-3-4b-it:free [status=429] [333ms]
[2026-04-04T20:51:47.010Z] [LLM_CALL] ✗ google/gemma-3-4b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:51:47.011Z] [PROVIDER] ✗ Model google/gemma-3-4b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:51:47.011Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:51:55.024Z] [PROVIDER] → Falling back to google/gemma-3-27b-it:free
[2026-04-04T20:51:55.024Z] [PROVIDER] Trying model 3/4: google/gemma-3-27b-it:free for search-2
[2026-04-04T20:51:55.024Z] [LLM_CALL] → google/gemma-3-27b-it:free
  {
  "systemLength": 256,
  "userLength": 136,
  "systemPreview": "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful trav",
  "userPreview": "Search query: \"Mumbai best restaurants vegan vegetarian gluten-free food local cuisine\"\n\nReturn a JSON array of travel research results."
}
[2026-04-04T20:51:55.349Z] [LLM_CALL] ← google/gemma-3-27b-it:free [status=429] [324ms]
[2026-04-04T20:51:55.349Z] [LLM_CALL] ✗ google/gemma-3-27b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:51:55.350Z] [PROVIDER] ✗ Model google/gemma-3-27b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:51:55.350Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:52:03.352Z] [PROVIDER] → Falling back to meta-llama/llama-3.3-70b-instruct:free
[2026-04-04T20:52:03.352Z] [PROVIDER] Trying model 4/4: meta-llama/llama-3.3-70b-instruct:free for search-2
[2026-04-04T20:52:03.352Z] [LLM_CALL] → meta-llama/llama-3.3-70b-instruct:free
  {
  "systemLength": 256,
  "userLength": 136,
  "systemPreview": "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful trav",
  "userPreview": "Search query: \"Mumbai best restaurants vegan vegetarian gluten-free food local cuisine\"\n\nReturn a JSON array of travel research results."
}
[2026-04-04T20:52:04.074Z] [LLM_CALL] ← meta-llama/llama-3.3-70b-instruct:free [status=429] [721ms]
[2026-04-04T20:52:04.075Z] [LLM_CALL] ✗ meta-llama/llama-3.3-70b-instruct:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Provider returned error\",\"code\":429,\"metadata\":{\"raw\":\"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations\",\"provider_name\":\"Venice\",\"is"
}
[2026-04-04T20:52:04.075Z] [PROVIDER] ✗ Model meta-llama/llama-3.3-70b-instruct:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-ins
[2026-04-04T20:52:04.075Z] [RESEARCH] Search 2 FAILED: OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to ac
[2026-04-04T20:52:04.075Z] [RESEARCH] Search 3/3: "Mumbai food culture museums beaches coffee art hiking adventure activities exper"
[2026-04-04T20:52:04.075Z] [PROVIDER] Trying model 1/4: google/gemma-3-12b-it:free for search-3
[2026-04-04T20:52:04.076Z] [LLM_CALL] → google/gemma-3-12b-it:free
  {
  "systemLength": 256,
  "userLength": 164,
  "systemPreview": "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful trav",
  "userPreview": "Search query: \"Mumbai food culture museums beaches coffee art hiking adventure activities experiences things to do\"\n\nReturn a JSON array of travel research results."
}
[2026-04-04T20:52:04.407Z] [LLM_CALL] ← google/gemma-3-12b-it:free [status=429] [331ms]
[2026-04-04T20:52:04.408Z] [LLM_CALL] ✗ google/gemma-3-12b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:52:04.409Z] [PROVIDER] ✗ Model google/gemma-3-12b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:52:04.409Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:52:12.410Z] [PROVIDER] → Falling back to google/gemma-3-4b-it:free
[2026-04-04T20:52:12.410Z] [PROVIDER] Trying model 2/4: google/gemma-3-4b-it:free for search-3
[2026-04-04T20:52:12.410Z] [LLM_CALL] → google/gemma-3-4b-it:free
  {
  "systemLength": 256,
  "userLength": 164,
  "systemPreview": "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful trav",
  "userPreview": "Search query: \"Mumbai food culture museums beaches coffee art hiking adventure activities experiences things to do\"\n\nReturn a JSON array of travel research results."
}
[2026-04-04T20:52:12.752Z] [LLM_CALL] ← google/gemma-3-4b-it:free [status=429] [342ms]
[2026-04-04T20:52:12.753Z] [LLM_CALL] ✗ google/gemma-3-4b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:52:12.753Z] [PROVIDER] ✗ Model google/gemma-3-4b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:52:12.753Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:52:20.767Z] [PROVIDER] → Falling back to google/gemma-3-27b-it:free
[2026-04-04T20:52:20.767Z] [PROVIDER] Trying model 3/4: google/gemma-3-27b-it:free for search-3
[2026-04-04T20:52:20.768Z] [LLM_CALL] → google/gemma-3-27b-it:free
  {
  "systemLength": 256,
  "userLength": 164,
  "systemPreview": "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful trav",
  "userPreview": "Search query: \"Mumbai food culture museums beaches coffee art hiking adventure activities experiences things to do\"\n\nReturn a JSON array of travel research results."
}
[2026-04-04T20:52:21.114Z] [LLM_CALL] ← google/gemma-3-27b-it:free [status=429] [345ms]
[2026-04-04T20:52:21.114Z] [LLM_CALL] ✗ google/gemma-3-27b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:52:21.115Z] [PROVIDER] ✗ Model google/gemma-3-27b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:52:21.115Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:52:29.120Z] [PROVIDER] → Falling back to meta-llama/llama-3.3-70b-instruct:free
[2026-04-04T20:52:29.120Z] [PROVIDER] Trying model 4/4: meta-llama/llama-3.3-70b-instruct:free for search-3
[2026-04-04T20:52:29.120Z] [LLM_CALL] → meta-llama/llama-3.3-70b-instruct:free
  {
  "systemLength": 256,
  "userLength": 164,
  "systemPreview": "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful trav",
  "userPreview": "Search query: \"Mumbai food culture museums beaches coffee art hiking adventure activities experiences things to do\"\n\nReturn a JSON array of travel research results."
}
[2026-04-04T20:52:29.787Z] [LLM_CALL] ← meta-llama/llama-3.3-70b-instruct:free [status=429] [666ms]
[2026-04-04T20:52:29.788Z] [LLM_CALL] ✗ meta-llama/llama-3.3-70b-instruct:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Provider returned error\",\"code\":429,\"metadata\":{\"raw\":\"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations\",\"provider_name\":\"Venice\",\"is"
}
[2026-04-04T20:52:29.788Z] [PROVIDER] ✗ Model meta-llama/llama-3.3-70b-instruct:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-ins
[2026-04-04T20:52:29.788Z] [RESEARCH] Search 3 FAILED: OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to ac
[2026-04-04T20:52:29.788Z] [RESEARCH] Total merged results: 0

══════════════════════════════════════════════════════════════════════
  STEP 5: Build system prompt
══════════════════════════════════════════════════════════════════════
[2026-04-04T20:52:29.789Z] [PROMPT] System prompt built
  {
  "length": 1366,
  "preview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Group interests (personalize to these): food, culture, museums, beaches, coffee, art, hiking, adventure"
}

══════════════════════════════════════════════════════════════════════
  STEP 6: Generate 2 day(s) in parallel
══════════════════════════════════════════════════════════════════════
[2026-04-04T20:52:29.789Z] [PLANNING] Generating Day 1/2
[2026-04-04T20:52:29.855Z] [PROVIDER] Trying model 1/4: google/gemma-3-12b-it:free for day-1
[2026-04-04T20:52:29.856Z] [LLM_CALL] → google/gemma-3-12b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 1 of 2 (Sunday, April 5).\n\nRespond with ONLY the JSON object for day 1. Set \"day\": 1."
}
[2026-04-04T20:52:30.229Z] [LLM_CALL] ← google/gemma-3-12b-it:free [status=429] [373ms]
[2026-04-04T20:52:30.230Z] [LLM_CALL] ✗ google/gemma-3-12b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:52:30.230Z] [PROVIDER] ✗ Model google/gemma-3-12b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:52:30.231Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:52:38.245Z] [PROVIDER] → Falling back to google/gemma-3-4b-it:free
[2026-04-04T20:52:38.245Z] [PROVIDER] Trying model 2/4: google/gemma-3-4b-it:free for day-1
[2026-04-04T20:52:38.245Z] [LLM_CALL] → google/gemma-3-4b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 1 of 2 (Sunday, April 5).\n\nRespond with ONLY the JSON object for day 1. Set \"day\": 1."
}
[2026-04-04T20:52:38.612Z] [LLM_CALL] ← google/gemma-3-4b-it:free [status=429] [367ms]
[2026-04-04T20:52:38.613Z] [LLM_CALL] ✗ google/gemma-3-4b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:52:38.613Z] [PROVIDER] ✗ Model google/gemma-3-4b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:52:38.613Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:52:46.626Z] [PROVIDER] → Falling back to google/gemma-3-27b-it:free
[2026-04-04T20:52:46.627Z] [PROVIDER] Trying model 3/4: google/gemma-3-27b-it:free for day-1
[2026-04-04T20:52:46.627Z] [LLM_CALL] → google/gemma-3-27b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 1 of 2 (Sunday, April 5).\n\nRespond with ONLY the JSON object for day 1. Set \"day\": 1."
}
[2026-04-04T20:52:46.981Z] [LLM_CALL] ← google/gemma-3-27b-it:free [status=429] [354ms]
[2026-04-04T20:52:46.981Z] [LLM_CALL] ✗ google/gemma-3-27b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:52:46.982Z] [PROVIDER] ✗ Model google/gemma-3-27b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:52:46.982Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:52:54.991Z] [PROVIDER] → Falling back to meta-llama/llama-3.3-70b-instruct:free
[2026-04-04T20:52:54.992Z] [PROVIDER] Trying model 4/4: meta-llama/llama-3.3-70b-instruct:free for day-1
[2026-04-04T20:52:54.992Z] [LLM_CALL] → meta-llama/llama-3.3-70b-instruct:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 1 of 2 (Sunday, April 5).\n\nRespond with ONLY the JSON object for day 1. Set \"day\": 1."
}
[2026-04-04T20:52:55.679Z] [LLM_CALL] ← meta-llama/llama-3.3-70b-instruct:free [status=429] [687ms]
[2026-04-04T20:52:55.680Z] [LLM_CALL] ✗ meta-llama/llama-3.3-70b-instruct:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Provider returned error\",\"code\":429,\"metadata\":{\"raw\":\"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations\",\"provider_name\":\"Venice\",\"is"
}
[2026-04-04T20:52:55.681Z] [PROVIDER] ✗ Model meta-llama/llama-3.3-70b-instruct:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-ins
[2026-04-04T20:52:55.681Z] [PLANNING] Day 1 attempt 1 error: OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to ac
[2026-04-04T20:52:55.681Z] [PROVIDER] Trying model 1/4: google/gemma-3-12b-it:free for day-1
[2026-04-04T20:52:55.681Z] [LLM_CALL] → google/gemma-3-12b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 1 of 2 (Sunday, April 5).\n\nRespond with ONLY the JSON object for day 1. Set \"day\": 1."
}
[2026-04-04T20:52:56.092Z] [LLM_CALL] ← google/gemma-3-12b-it:free [status=429] [411ms]
[2026-04-04T20:52:56.093Z] [LLM_CALL] ✗ google/gemma-3-12b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:52:56.093Z] [PROVIDER] ✗ Model google/gemma-3-12b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:52:56.093Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:53:04.099Z] [PROVIDER] → Falling back to google/gemma-3-4b-it:free
[2026-04-04T20:53:04.099Z] [PROVIDER] Trying model 2/4: google/gemma-3-4b-it:free for day-1
[2026-04-04T20:53:04.099Z] [LLM_CALL] → google/gemma-3-4b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 1 of 2 (Sunday, April 5).\n\nRespond with ONLY the JSON object for day 1. Set \"day\": 1."
}
[2026-04-04T20:53:04.456Z] [LLM_CALL] ← google/gemma-3-4b-it:free [status=429] [357ms]
[2026-04-04T20:53:04.457Z] [LLM_CALL] ✗ google/gemma-3-4b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:53:04.457Z] [PROVIDER] ✗ Model google/gemma-3-4b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:53:04.457Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:53:12.464Z] [PROVIDER] → Falling back to google/gemma-3-27b-it:free
[2026-04-04T20:53:12.465Z] [PROVIDER] Trying model 3/4: google/gemma-3-27b-it:free for day-1
[2026-04-04T20:53:12.465Z] [LLM_CALL] → google/gemma-3-27b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 1 of 2 (Sunday, April 5).\n\nRespond with ONLY the JSON object for day 1. Set \"day\": 1."
}
[2026-04-04T20:53:12.818Z] [LLM_CALL] ← google/gemma-3-27b-it:free [status=429] [352ms]
[2026-04-04T20:53:12.819Z] [LLM_CALL] ✗ google/gemma-3-27b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:53:12.819Z] [PROVIDER] ✗ Model google/gemma-3-27b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:53:12.819Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:53:20.823Z] [PROVIDER] → Falling back to meta-llama/llama-3.3-70b-instruct:free
[2026-04-04T20:53:20.823Z] [PROVIDER] Trying model 4/4: meta-llama/llama-3.3-70b-instruct:free for day-1
[2026-04-04T20:53:20.823Z] [LLM_CALL] → meta-llama/llama-3.3-70b-instruct:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 1 of 2 (Sunday, April 5).\n\nRespond with ONLY the JSON object for day 1. Set \"day\": 1."
}
[2026-04-04T20:53:21.476Z] [LLM_CALL] ← meta-llama/llama-3.3-70b-instruct:free [status=429] [653ms]
[2026-04-04T20:53:21.477Z] [LLM_CALL] ✗ meta-llama/llama-3.3-70b-instruct:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Provider returned error\",\"code\":429,\"metadata\":{\"raw\":\"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations\",\"provider_name\":\"Venice\",\"is"
}
[2026-04-04T20:53:21.477Z] [PROVIDER] ✗ Model meta-llama/llama-3.3-70b-instruct:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-ins
[2026-04-04T20:53:21.478Z] [PLANNING] Day 1 attempt 2 error: OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to ac
[2026-04-04T20:53:21.478Z] [PROVIDER] Trying model 1/4: google/gemma-3-12b-it:free for day-1
[2026-04-04T20:53:21.478Z] [LLM_CALL] → google/gemma-3-12b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 1 of 2 (Sunday, April 5).\n\nRespond with ONLY the JSON object for day 1. Set \"day\": 1."
}
[2026-04-04T20:53:21.806Z] [LLM_CALL] ← google/gemma-3-12b-it:free [status=429] [328ms]
[2026-04-04T20:53:21.807Z] [LLM_CALL] ✗ google/gemma-3-12b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:53:21.807Z] [PROVIDER] ✗ Model google/gemma-3-12b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:53:21.807Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:53:29.812Z] [PROVIDER] → Falling back to google/gemma-3-4b-it:free
[2026-04-04T20:53:29.812Z] [PROVIDER] Trying model 2/4: google/gemma-3-4b-it:free for day-1
[2026-04-04T20:53:29.812Z] [LLM_CALL] → google/gemma-3-4b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 1 of 2 (Sunday, April 5).\n\nRespond with ONLY the JSON object for day 1. Set \"day\": 1."
}
[2026-04-04T20:53:30.140Z] [LLM_CALL] ← google/gemma-3-4b-it:free [status=429] [328ms]
[2026-04-04T20:53:30.141Z] [LLM_CALL] ✗ google/gemma-3-4b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:53:30.141Z] [PROVIDER] ✗ Model google/gemma-3-4b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:53:30.141Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:53:38.151Z] [PROVIDER] → Falling back to google/gemma-3-27b-it:free
[2026-04-04T20:53:38.151Z] [PROVIDER] Trying model 3/4: google/gemma-3-27b-it:free for day-1
[2026-04-04T20:53:38.151Z] [LLM_CALL] → google/gemma-3-27b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 1 of 2 (Sunday, April 5).\n\nRespond with ONLY the JSON object for day 1. Set \"day\": 1."
}
[2026-04-04T20:53:38.515Z] [LLM_CALL] ← google/gemma-3-27b-it:free [status=429] [364ms]
[2026-04-04T20:53:38.516Z] [LLM_CALL] ✗ google/gemma-3-27b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:53:38.517Z] [PROVIDER] ✗ Model google/gemma-3-27b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:53:38.517Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:53:46.519Z] [PROVIDER] → Falling back to meta-llama/llama-3.3-70b-instruct:free
[2026-04-04T20:53:46.519Z] [PROVIDER] Trying model 4/4: meta-llama/llama-3.3-70b-instruct:free for day-1
[2026-04-04T20:53:46.519Z] [LLM_CALL] → meta-llama/llama-3.3-70b-instruct:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 1 of 2 (Sunday, April 5).\n\nRespond with ONLY the JSON object for day 1. Set \"day\": 1."
}
[2026-04-04T20:53:47.123Z] [LLM_CALL] ← meta-llama/llama-3.3-70b-instruct:free [status=429] [604ms]
[2026-04-04T20:53:47.124Z] [LLM_CALL] ✗ meta-llama/llama-3.3-70b-instruct:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Provider returned error\",\"code\":429,\"metadata\":{\"raw\":\"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations\",\"provider_name\":\"Venice\",\"is"
}
[2026-04-04T20:53:47.124Z] [PROVIDER] ✗ Model meta-llama/llama-3.3-70b-instruct:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-ins
[2026-04-04T20:53:47.124Z] [PLANNING] Day 1 attempt 3 error: OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to ac
[2026-04-04T20:53:47.124Z] [PLANNING] Day 1 using FALLBACK
[2026-04-04T20:53:47.125Z] [PLANNING] Generating Day 2/2
[2026-04-04T20:53:47.125Z] [PROVIDER] Trying model 1/4: google/gemma-3-12b-it:free for day-2
[2026-04-04T20:53:47.125Z] [LLM_CALL] → google/gemma-3-12b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 2 of 2 (Monday, April 6).\n\nRespond with ONLY the JSON object for day 2. Set \"day\": 2."
}
[2026-04-04T20:53:47.464Z] [LLM_CALL] ← google/gemma-3-12b-it:free [status=429] [339ms]
[2026-04-04T20:53:47.465Z] [LLM_CALL] ✗ google/gemma-3-12b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:53:47.465Z] [PROVIDER] ✗ Model google/gemma-3-12b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:53:47.465Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:53:55.469Z] [PROVIDER] → Falling back to google/gemma-3-4b-it:free
[2026-04-04T20:53:55.469Z] [PROVIDER] Trying model 2/4: google/gemma-3-4b-it:free for day-2
[2026-04-04T20:53:55.469Z] [LLM_CALL] → google/gemma-3-4b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 2 of 2 (Monday, April 6).\n\nRespond with ONLY the JSON object for day 2. Set \"day\": 2."
}
[2026-04-04T20:53:55.798Z] [LLM_CALL] ← google/gemma-3-4b-it:free [status=429] [329ms]
[2026-04-04T20:53:55.799Z] [LLM_CALL] ✗ google/gemma-3-4b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:53:55.799Z] [PROVIDER] ✗ Model google/gemma-3-4b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:53:55.799Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:54:03.808Z] [PROVIDER] → Falling back to google/gemma-3-27b-it:free
[2026-04-04T20:54:03.808Z] [PROVIDER] Trying model 3/4: google/gemma-3-27b-it:free for day-2
[2026-04-04T20:54:03.808Z] [LLM_CALL] → google/gemma-3-27b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 2 of 2 (Monday, April 6).\n\nRespond with ONLY the JSON object for day 2. Set \"day\": 2."
}
[2026-04-04T20:54:04.189Z] [LLM_CALL] ← google/gemma-3-27b-it:free [status=429] [381ms]
[2026-04-04T20:54:04.190Z] [LLM_CALL] ✗ google/gemma-3-27b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:54:04.190Z] [PROVIDER] ✗ Model google/gemma-3-27b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:54:04.190Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:54:12.191Z] [PROVIDER] → Falling back to meta-llama/llama-3.3-70b-instruct:free
[2026-04-04T20:54:12.192Z] [PROVIDER] Trying model 4/4: meta-llama/llama-3.3-70b-instruct:free for day-2
[2026-04-04T20:54:12.192Z] [LLM_CALL] → meta-llama/llama-3.3-70b-instruct:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 2 of 2 (Monday, April 6).\n\nRespond with ONLY the JSON object for day 2. Set \"day\": 2."
}
[2026-04-04T20:54:12.860Z] [LLM_CALL] ← meta-llama/llama-3.3-70b-instruct:free [status=429] [668ms]
[2026-04-04T20:54:12.861Z] [LLM_CALL] ✗ meta-llama/llama-3.3-70b-instruct:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Provider returned error\",\"code\":429,\"metadata\":{\"raw\":\"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations\",\"provider_name\":\"Venice\",\"is"
}
[2026-04-04T20:54:12.861Z] [PROVIDER] ✗ Model meta-llama/llama-3.3-70b-instruct:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-ins
[2026-04-04T20:54:12.861Z] [PLANNING] Day 2 attempt 1 error: OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to ac
[2026-04-04T20:54:12.861Z] [PROVIDER] Trying model 1/4: google/gemma-3-12b-it:free for day-2
[2026-04-04T20:54:12.861Z] [LLM_CALL] → google/gemma-3-12b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 2 of 2 (Monday, April 6).\n\nRespond with ONLY the JSON object for day 2. Set \"day\": 2."
}
[2026-04-04T20:54:13.199Z] [LLM_CALL] ← google/gemma-3-12b-it:free [status=429] [338ms]
[2026-04-04T20:54:13.200Z] [LLM_CALL] ✗ google/gemma-3-12b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:54:13.200Z] [PROVIDER] ✗ Model google/gemma-3-12b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:54:13.201Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:54:21.204Z] [PROVIDER] → Falling back to google/gemma-3-4b-it:free
[2026-04-04T20:54:21.205Z] [PROVIDER] Trying model 2/4: google/gemma-3-4b-it:free for day-2
[2026-04-04T20:54:21.205Z] [LLM_CALL] → google/gemma-3-4b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 2 of 2 (Monday, April 6).\n\nRespond with ONLY the JSON object for day 2. Set \"day\": 2."
}
[2026-04-04T20:54:21.558Z] [LLM_CALL] ← google/gemma-3-4b-it:free [status=429] [353ms]
[2026-04-04T20:54:21.559Z] [LLM_CALL] ✗ google/gemma-3-4b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:54:21.559Z] [PROVIDER] ✗ Model google/gemma-3-4b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:54:21.559Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:54:29.567Z] [PROVIDER] → Falling back to google/gemma-3-27b-it:free
[2026-04-04T20:54:29.568Z] [PROVIDER] Trying model 3/4: google/gemma-3-27b-it:free for day-2
[2026-04-04T20:54:29.568Z] [LLM_CALL] → google/gemma-3-27b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 2 of 2 (Monday, April 6).\n\nRespond with ONLY the JSON object for day 2. Set \"day\": 2."
}
[2026-04-04T20:54:29.903Z] [LLM_CALL] ← google/gemma-3-27b-it:free [status=429] [335ms]
[2026-04-04T20:54:29.904Z] [LLM_CALL] ✗ google/gemma-3-27b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:54:29.904Z] [PROVIDER] ✗ Model google/gemma-3-27b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:54:29.905Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:54:37.911Z] [PROVIDER] → Falling back to meta-llama/llama-3.3-70b-instruct:free
[2026-04-04T20:54:37.911Z] [PROVIDER] Trying model 4/4: meta-llama/llama-3.3-70b-instruct:free for day-2
[2026-04-04T20:54:37.912Z] [LLM_CALL] → meta-llama/llama-3.3-70b-instruct:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 2 of 2 (Monday, April 6).\n\nRespond with ONLY the JSON object for day 2. Set \"day\": 2."
}
[2026-04-04T20:54:38.555Z] [LLM_CALL] ← meta-llama/llama-3.3-70b-instruct:free [status=429] [643ms]
[2026-04-04T20:54:38.556Z] [LLM_CALL] ✗ meta-llama/llama-3.3-70b-instruct:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Provider returned error\",\"code\":429,\"metadata\":{\"raw\":\"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations\",\"provider_name\":\"Venice\",\"is"
}
[2026-04-04T20:54:38.557Z] [PROVIDER] ✗ Model meta-llama/llama-3.3-70b-instruct:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-ins
[2026-04-04T20:54:38.560Z] [PLANNING] Day 2 attempt 2 error: OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to ac
[2026-04-04T20:54:38.560Z] [PROVIDER] Trying model 1/4: google/gemma-3-12b-it:free for day-2
[2026-04-04T20:54:38.561Z] [LLM_CALL] → google/gemma-3-12b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 2 of 2 (Monday, April 6).\n\nRespond with ONLY the JSON object for day 2. Set \"day\": 2."
}
[2026-04-04T20:54:38.885Z] [LLM_CALL] ← google/gemma-3-12b-it:free [status=429] [324ms]
[2026-04-04T20:54:38.886Z] [LLM_CALL] ✗ google/gemma-3-12b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:54:38.886Z] [PROVIDER] ✗ Model google/gemma-3-12b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:54:38.886Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:54:46.888Z] [PROVIDER] → Falling back to google/gemma-3-4b-it:free
[2026-04-04T20:54:46.888Z] [PROVIDER] Trying model 2/4: google/gemma-3-4b-it:free for day-2
[2026-04-04T20:54:46.889Z] [LLM_CALL] → google/gemma-3-4b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 2 of 2 (Monday, April 6).\n\nRespond with ONLY the JSON object for day 2. Set \"day\": 2."
}
[2026-04-04T20:54:47.906Z] [LLM_CALL] ← google/gemma-3-4b-it:free [status=429] [1017ms]
[2026-04-04T20:54:47.907Z] [LLM_CALL] ✗ google/gemma-3-4b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:54:47.907Z] [PROVIDER] ✗ Model google/gemma-3-4b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:54:47.907Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:54:55.907Z] [PROVIDER] → Falling back to google/gemma-3-27b-it:free
[2026-04-04T20:54:55.908Z] [PROVIDER] Trying model 3/4: google/gemma-3-27b-it:free for day-2
[2026-04-04T20:54:55.908Z] [LLM_CALL] → google/gemma-3-27b-it:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 2 of 2 (Monday, April 6).\n\nRespond with ONLY the JSON object for day 2. Set \"day\": 2."
}
[2026-04-04T20:54:56.265Z] [LLM_CALL] ← google/gemma-3-27b-it:free [status=429] [357ms]
[2026-04-04T20:54:56.266Z] [LLM_CALL] ✗ google/gemma-3-27b-it:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day\",\"code\":429,\"metadata\":{\"headers\":{\"X-RateLimit-Limit\":\"50\",\"X-RateLimit-Remaining\":\"0\",\"X-RateLimit-Reset\":\"1775347200000\"},\"provider_name\":null}},\"user_id\":\"user_3214Sv8FRMvHOKD"
}
[2026-04-04T20:54:56.266Z] [PROVIDER] ✗ Model google/gemma-3-27b-it:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model 
[2026-04-04T20:54:56.266Z] [PROVIDER] Waiting 8s before trying next model...
[2026-04-04T20:55:04.277Z] [PROVIDER] → Falling back to meta-llama/llama-3.3-70b-instruct:free
[2026-04-04T20:55:04.278Z] [PROVIDER] Trying model 4/4: meta-llama/llama-3.3-70b-instruct:free for day-2
[2026-04-04T20:55:04.283Z] [LLM_CALL] → meta-llama/llama-3.3-70b-instruct:free
  {
  "systemLength": 1366,
  "userLength": 116,
  "systemPreview": "You are an expert travel planner for Mumbai. Generate a single day's itinerary as valid JSON.\n\nTRIP CONTEXT:\n- Destination: Mumbai\n- Travel style: friends\n- Budget: mid\n- Group size: 6 travelers\n- Gro",
  "userPreview": "Generate the itinerary for Day 2 of 2 (Monday, April 6).\n\nRespond with ONLY the JSON object for day 2. Set \"day\": 2."
}
[2026-04-04T20:55:05.059Z] [LLM_CALL] ← meta-llama/llama-3.3-70b-instruct:free [status=429] [776ms]
[2026-04-04T20:55:05.061Z] [LLM_CALL] ✗ meta-llama/llama-3.3-70b-instruct:free error
  {
  "status": 429,
  "body": "{\"error\":{\"message\":\"Provider returned error\",\"code\":429,\"metadata\":{\"raw\":\"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations\",\"provider_name\":\"Venice\",\"is"
}
[2026-04-04T20:55:05.061Z] [PROVIDER] ✗ Model meta-llama/llama-3.3-70b-instruct:free failed (429 rate-limited): OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-ins
[2026-04-04T20:55:05.061Z] [PLANNING] Day 2 attempt 3 error: OpenRouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"meta-llama/llama-3.3-70b-instruct:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to ac
[2026-04-04T20:55:05.062Z] [PLANNING] Day 2 using FALLBACK
[2026-04-04T20:55:05.062Z] [PLANNING] ✓ All 2 days generated
[2026-04-04T20:55:05.063Z] [QUALITY] ⚠ Day 1 contains generic fallback: explore the local area, visit a local attraction
[2026-04-04T20:55:05.063Z] [QUALITY] ⚠ Day 2 contains generic fallback: explore the local area, visit a local attraction

══════════════════════════════════════════════════════════════════════
  PERSIST TO DATABASE
══════════════════════════════════════════════════════════════════════
[2026-04-04T20:55:06.208Z] [DB] Deleted old AI-generated items
[2026-04-04T20:55:06.209Z] [DB] Inserting 12 itinerary items
[2026-04-04T20:55:06.697Z] [DB] ✓ Inserted 12 items
[2026-04-04T20:55:07.208Z] [DB] ✓ Trip status set to 'completed'
[2026-04-04T20:55:07.776Z] [DB] ✓ Job 0b56862d-2cf9-406d-849e-d5f0b022e91a marked completed

══════════════════════════════════════════════════════════════════════
  STEP 8: Verify database
══════════════════════════════════════════════════════════════════════
[2026-04-04T20:55:08.181Z] [VERIFY] ✓ Found 12 AI-generated items in DB
[2026-04-04T20:55:08.182Z] [VERIFY]   Day 1 [morning]: Explore the local area
[2026-04-04T20:55:08.182Z] [VERIFY]   Day 1 [morning]: Local breakfast cafe
[2026-04-04T20:55:08.182Z] [VERIFY]   Day 1 [afternoon]: Visit a local attraction
[2026-04-04T20:55:08.182Z] [VERIFY]   Day 1 [afternoon]: Local restaurant
[2026-04-04T20:55:08.182Z] [VERIFY]   Day 1 [evening]: Evening stroll
[2026-04-04T20:55:08.182Z] [VERIFY]   Day 1 [evening]: Local dinner
[2026-04-04T20:55:08.182Z] [VERIFY]   Day 2 [morning]: Explore the local area
[2026-04-04T20:55:08.182Z] [VERIFY]   Day 2 [morning]: Local breakfast cafe
[2026-04-04T20:55:08.182Z] [VERIFY]   Day 2 [afternoon]: Visit a local attraction
[2026-04-04T20:55:08.182Z] [VERIFY]   Day 2 [afternoon]: Local restaurant
[2026-04-04T20:55:08.604Z] [VERIFY] Trip status
  {
  "itinerary_status": "completed",
  "itinerary_generated_at": "2026-04-04T20:55:06.698+00:00"
}

══════════════════════════════════════════════════════════════════════
  COMPLETE — 239254ms total
══════════════════════════════════════════════════════════════════════
[2026-04-04T20:55:08.605Z] [MAIN] ✓ Pipeline complete
  {
  "tripId": "0bb5a13c-0673-4f31-aec5-2ca16841f689",
  "jobId": "0b56862d-2cf9-406d-849e-d5f0b022e91a",
  "daysGenerated": 2,
  "itemsInserted": 12,
  "totalMs": 239254,
  "success": true
}