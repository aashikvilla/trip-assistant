# Vibe Trip — Product Deck

---

## The One-Line Pitch

**Vibe Trip turns "where should we go?" into a day-by-day itinerary in minutes — built for groups, powered by AI, designed for the real world.**

---

## The Problem

Group travel is exciting in theory and painful in practice. Here's what actually happens:

### Pain Point 1: Planning paralysis

A friend group decides to go to Japan. Then: six WhatsApp threads, a Google Doc nobody keeps updated, three people want temples, two want nightlife, someone's vegan, someone else has a nut allergy, and the trip is in three months.

Nobody has the bandwidth to synthesize ten preferences, research five destinations, and produce a coherent 7-day plan. So they either spend 20+ hours planning, pay a travel agent $500, or just wing it and regret it.

### Pain Point 2: Coordination collapse

Once a trip is vaguely planned, coordination fragments across apps. WhatsApp for chat. Google Sheets for expenses. Tripadvisor for research. Email threads for bookings. A Notes app for the itinerary. Nobody's on the same page — literally.

When plans change (and they always do), updates get missed. Someone shows up at the wrong restaurant. Someone missed the group expense. Someone didn't know the tour was cancelled.

### Pain Point 3: The trip itself

The planning app is usually useless the moment you land. You're offline, roaming, or don't have data. The beautiful itinerary Google Doc doesn't load. Your expense split is somewhere in a thread nobody can find. The booking confirmation is buried in an email.

---

## The Solution: Vibe Trip

Vibe Trip is the first app that handles the *entire* group travel lifecycle in one place — from initial preferences to post-trip settlement — with AI doing the heavy lifting.

**Three things set us apart:**

1. **AI that actually plans** — Not a chatbot, not a recommendation feed. A multi-agent system that researches your destinations, learns your group's collective preferences, and produces a complete, editable day-by-day itinerary. In minutes, not hours.

2. **Built for groups, not solo travelers** — Every feature is designed around the reality of coordinating 2–10 people. Real-time chat, group polls, shared expenses, role-based access, multi-channel invitations. The group is a first-class citizen.

3. **Works offline** — The app works on the plane, in the mountains, with 1 bar of signal. Full itinerary, bookings, expenses, and chat — cached locally and syncing in the background when you reconnect.

---

## How It Works — End to End

### Step 1: Create Your Trip

Set the destination(s), dates, and travel style. Tell us the vibe: relaxed, adventure, cultural, romantic, party, luxury, or budget. Add must-do activities. Done in under 2 minutes.

### Step 2: Invite Your Group

Share a link, a 6-digit code, or send email invites. Members join and set their own preferences: dietary restrictions, interests, allergies, loyalty programs. The app aggregates everyone's constraints automatically.

### Step 3: Generate Your Itinerary

Click one button. Our AI pipeline:

1. **Researches your destinations** — Agents pull travel guides, dining recommendations, and local insights for each city.
2. **Plans day by day** — A planning agent crafts morning, afternoon, and evening itineraries for each day — meals, activities, logistics, hotel recommendations — informed by your group's preferences.
3. **Streams results live** — You watch the itinerary build in real-time, day by day, as each piece arrives. No waiting for a spinner to finish.

What would take hours of research and coordination takes 2–5 minutes.

### Step 4: Collaborate in Real-Time

Once the itinerary is generated, the group jumps in together:

- **Edit and reorganize** — Drag and drop activities, swap restaurants, remove things nobody wants.
- **Chat in the app** — Real-time group chat with replies, reactions, and typing indicators. No more jumping to WhatsApp.
- **Vote on decisions** — Create polls ("Nara or Osaka on Day 4?") with deadlines. The app nudges non-voters and surfaces the winner.
- **Manage bookings** — Store confirmation codes, links, and details for flights, hotels, tours, and cars — all linked to the itinerary.

### Step 5: Track Expenses Together

Every shared cost lives in one place. Add expenses, split them between any subset of the group, and track balances in real-time. The app tells you exactly who owes whom at any moment.

Scan a bill with your phone camera — AI extracts the total, line items, and tip. Assign portions to each person. Done.

When it's time to settle, record payments and balances zero out.

### Step 6: Use It On the Trip

Download your trip for offline access before you fly. The full itinerary, bookings, member info, and expenses are cached locally. When you're offline, messages queue automatically and sync when you reconnect.

Install Vibe Trip to your home screen and it runs like a native app — no browser chrome, fast load, custom navigation.

---

## Features

### AI Itinerary Generation

| Capability | Detail |
|---|---|
| Multi-agent pipeline | Research agent + planning agent + review agent working in sequence |
| Per-destination research | Agents pull travel guides and dining info for each city in your trip |
| Per-day generation | One focused LLM call per day — fast, reliable, independently retryable |
| Live streaming | Watch your itinerary build day by day, in real-time |
| Preference-aware | Respects dietary restrictions, interests, vibe, budget, must-dos |
| Editable output | Every activity, meal, and time slot is fully editable after generation |
| Regeneration | Can replan specific days or the entire trip |

### Group Coordination

| Feature | Detail |
|---|---|
| Real-time chat | Messages appear instantly across all devices; typing indicators |
| Message reactions | Emoji reactions on any message |
| Reply threads | Quote and reply to specific messages |
| Polls | Multiple choice, yes/no, rating scale; deadlines; nudge non-voters |
| Role-based access | Owner, editor, viewer roles — invite trusted members as editors |
| Multi-channel invites | Email link, shareable URL, 6-digit code, 4-character trip code |

### Expense Management

| Feature | Detail |
|---|---|
| Add expenses | Amount, currency, category, payer, split between any subset |
| Balance tracking | Real-time view of who owes whom and how much |
| Settlements | Record payments to zero out balances |
| Bill scanning | OCR bill photos — AI extracts totals, items, tax, and tip |
| Multi-currency | Track expenses in local currencies |

### Itinerary & Bookings

| Feature | Detail |
|---|---|
| Calendar view | Day and week views; morning / afternoon / evening time slots |
| Drag-and-drop | Reorder activities within and across days |
| Map view | See all activities on a map per day, or across the whole trip |
| Bookings | Store flights, hotels, cars, tours — confirmation codes, links, files |
| Link bookings | Attach a booking to its corresponding itinerary activity |

### PWA & Offline

| Feature | Detail |
|---|---|
| Offline access | Full trip cached in IndexedDB; readable with no connection |
| Background sync | Queued writes (messages, expenses) sync on reconnect |
| Pull-to-refresh | Touch gesture refreshes data when back online |
| Install to home screen | Runs as a native-style app; no browser chrome |
| Connectivity states | Online / offline / degraded — app adapts behavior per state |
| Update prompts | Non-disruptive "refresh available" banner for app updates |

### User Preferences

| Category | Options |
|---|---|
| Travel interests | Hiking, food & dining, beaches, adventure, culture, nightlife, wellness, and more |
| Dietary restrictions | Vegetarian, vegan, gluten-free, halal, kosher, dairy-free, nut-free, and more |
| Allergies | Free-text custom restrictions |
| Loyalty programs | Airlines, hotels, credit cards — stored per user, used in AI generation |

---

## Who It's For

**Primary audience: The group trip organizer.** The person who always ends up being the one to figure out logistics. They're 22–45, tech-savvy, have tried Google Docs + WhatsApp and want something better. They care about the experience but don't want to spend a weekend planning it.

**Secondary audience: Group members.** People who want visibility into the plan, a place to voice preferences, and a way to manage shared costs — without being the organizer.

**Use cases:**
- Friend groups: bachelor/bachelorette trips, annual reunions, 5-person international adventure
- Couples and families: honeymoons, family reunions, multi-generational trips
- Work offsites: team-building trips where someone has to organize 15 people

---

## The Market

Group travel is the fastest-growing segment of the travel industry. The average group trip involves 4–8 people and requires 20–40 hours of collective planning time. Yet the tools are unchanged: Google Docs, WhatsApp, and hope.

The travel technology market is worth over $800B globally. AI-powered planning is a greenfield opportunity — no incumbent owns this space. Existing tools (TripAdvisor, Google Travel, TripIt) are research and organization tools. None plan for you. None are built for groups. None work offline.

---

## Why Now

Three things are converging:

1. **LLMs can actually plan.** Two years ago, asking a language model to produce a structured, coherent 7-day travel itinerary that respects 6 people's dietary restrictions and two budgets would produce garbage. Today it doesn't.

2. **Groups want a single app.** Coordination overhead has hit a breaking point — people are exhausted by app switching and thread archaeology. The timing is right for a category-defining group collaboration tool in travel.

3. **PWA has matured.** Offline-capable, installable web apps are indistinguishable from native apps on modern devices. We can ship a single codebase that works everywhere without the App Store tax.

---

## Our Unfair Advantages

**Preference aggregation.** We collect individual preferences from every member and synthesize them at generation time. No other planning tool does this. We know Alice is vegan, Bob wants adventure activities, and Charlie has a nut allergy — and the AI plan reflects all three simultaneously.

**Streaming pipeline architecture.** Our per-day, multi-agent approach produces visible progress immediately. Users see Day 1 appear while Days 2-7 are being planned. This isn't cosmetic — it's faster to see, faster to edit, and recoverable on failure. Competitors who do a single LLM call for a full trip get timeouts and unhappy users.

**End-to-end ownership.** We're not a planning tab in a booking app, or a chat room with a shared doc. We own the full loop: plan → coordinate → execute → settle. Every feature reinforces the others.

**Offline-first from day one.** We built offline as a core feature, not an afterthought. When you're in rural Kyoto at 11pm looking for your dinner reservation, the app works.

---

## Product Vision

### Now (Current State)

The core planning and coordination loop is built. Create a trip, generate an AI itinerary, invite your group, chat, vote, track expenses, manage bookings, and access everything offline. The UI is complete and production-ready.

### Next 6 Months

**Booking integrations.** Direct hotel and activity booking inside the app via API partnerships (Booking.com, GetYourGuide, Viator). The gap between "planning" and "booking" disappears.

**Smarter re-planning.** Mid-trip replanning based on weather, closures, or just changed minds. "It's raining — what's a good indoor alternative for today?"

**Collaborative preference voting.** Before generation, let the group vote on destinations, vibes, and activities. The AI plan is built on consensus, not just the organizer's choices.

**AI trip assistant.** A persistent trip-specific AI that knows your full itinerary and can answer "what time does our tour tomorrow start?" or "what's the nearest pharmacy to our hotel?"

### 12–24 Months

**Social layer.** Share your completed trip as a public itinerary. Follow travelers whose style matches yours. Import a vetted community itinerary as your starting point instead of generating from scratch.

**Post-trip memory.** Auto-generate a trip summary from photos, expenses, and chat history. The app becomes a travel diary you never had to write.

**Flight and hotel price alerts.** Monitor prices for your trip dates and alert the group when they hit a target. Close the loop from research to purchase.

**Enterprise: corporate travel.** Team offsites, conference trips, and group travel for companies. Policy compliance baked into the AI generation layer.

---

## The Company

Vibe Trip was built on the premise that the best trip planning tool shouldn't require a travel agent, a spreadsheet genius, or 30 hours of your weekend. It should work the way good teams work — distributed decision-making, shared information, real-time coordination — with AI doing the synthesis that no human has time for.

Our goal is to become the default way groups plan and experience travel together. Not just the planning phase — the whole trip, from first message to last expense settled.

We're building for the group, always. Because the best trips aren't solo.

---

## Technical Snapshot

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| UI Components | shadcn/ui (Radix primitives) |
| Backend | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| AI | Multi-agent pipeline via OpenRouter (Claude 3.5 Sonnet default) |
| Offline | Workbox service worker + IndexedDB |
| Push Notifications | Web Push API + VAPID |
| Streaming | Server-Sent Events (SSE) for live itinerary generation |
| Deployment | Next.js standalone, deployable to Vercel / Railway / self-hosted |

---

*Vibe Trip — Plan together. Travel better.*
