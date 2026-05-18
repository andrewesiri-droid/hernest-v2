# HerNest V2 — Full App Audit
Date: May 17, 2026 | Version: v2.4

---

## OVERALL STATUS: 🟡 Solid Foundation, Some Gaps

The app is live, login works, all 16 screens load, AI is responding, and both calendars are connected. The core architecture is sound. There are no critical crashes. The main gaps are data (most modules empty for new users) and some AI tone/quality issues.

---

## SCREEN BY SCREEN

### ✅ HOME
- Household Pulse Card present
- Morning snapshot loads
- Briefing link works
- Insights show when data exists
- **Gap:** Insights are empty for new users with no budget data

### ✅ BRIEFING
- Generates successfully
- focusWord, greeting, priorities, calendar, budget, energy, affirmation all parsed
- Tone adapts (thriving/steady/tired/struggling)
- Weather integrated
- **Gap:** Nora's voice sounds corporate ("I don't have visibility") when no data — needs warmer fallback language

### ✅ NORA
- Chat works
- Household context passed
- Memory writeback working
- **Gap:** Tone too formal/jargon-heavy ("I don't have visibility into your tasks"). Needs warmth audit.
- **Gap:** No data = generic responses. Needs better "I'm just getting to know you" framing.

### ✅ PLAN (Tasks)
- Tasks create, complete, delete
- School calendar upload working
- AI task extraction from newsletter
- **Gap:** Recurring tasks not yet implemented

### ✅ BUDGET (Financial Hub)
- Overview, Goals, Debt, Insights, CFO tabs
- CFO scenario analysis working (household_cfo feature)
- Spending trends visible
- **Gap:** No data entered yet for test accounts — all zeros
- **Gap:** Plaid not connected (manual entry only)

### ✅ CALENDAR
- Month and List views working
- Google Calendar connected — ALL calendars fetching (fixed today)
- Apple Calendar connected — events showing
- Timezone fix deployed (America/Chicago)
- Manual event add working
- School calendar import working
- Birthday, Family, Trip event sources
- **Gap:** Outlook not tested
- **Gap:** Apple events only show if iCloud calendar has events

### ✅ TRIPS (Rebuilt today)
- Trip State System (dreaming → recovery)
- Readiness Ring with % score
- Travellers pre-populated from profile
- Traveller checkboxes (select who's coming)
- Add partner/parent/friend/child guests
- Itinerary up to 7 days
- Single budget tab with breakdown
- Edit tab (destination, dates, budget, delete)
- Ask CFO tab
- Pre-departure checklist
- Documents per traveller
- Packing list (fix deployed — rate limited tonight)
- **Gap:** Rate limited — AI features untested
- **Gap:** Affiliate links not built
- **Gap:** Travel Stress Forecast not built
- **Gap:** Calendar Compression Intelligence not built

### ✅ FAMILY HQ
- Members, tasks, meals
- Loads and saves
- **Gap:** Needs kids added to enable school calendar upload
- **Gap:** Meal planning AI untested

### ✅ THRIVE (Wellness)
- Mood logging
- Sleep tracking
- Habit tracking
- **Gap:** Wellness score not connected to household snapshot
- **Gap:** AI wellness coach untested

### ✅ CIRCLE
- Contacts list
- Birthday tracking
- Companion chat
- **Gap:** Birthday → budget connection not built
- **Gap:** Gift advisor AI untested

### ✅ STYLE
- Outfit generation
- **Gap:** No intelligence connection to rest of app
- **Gap:** Deprioritized per roadmap

### ✅ PROFILE
- Name, photo, kids, partner
- Updates propagate to Trips (traveller pre-population)

### ✅ SETTINGS
- Nora Memory viewer
- Calendar connections
- Account settings

### ✅ AUTH / LOGIN
- Google, Apple, email login all working
- Onboarding flow present

---

## DATA FLOWS

### Briefing (most complex)
```
BriefingScreen
  → buildAppContext() [contextBuilder.ts]
    → loadData(budget_v2, tasks, thrive, calendar, trips, circle, school)
    → buildHouseholdSnapshot()
    → buildMemoryContext()
  → ai(sys, context, "morning_briefing") [ai.ts]
    → POST /api/claude [Anthropic Claude Sonnet, 2000 tokens]
  → parse JSON → render
```

### Google Calendar
```
Connect button → /api/auth/google?uid=XXX
  → Google OAuth consent
  → /api/auth/google/callback
    → Exchange code for tokens
    → Save to Firestore users/uid/integrations/google_calendar
  → App detects ?calendar_connected=google → toast
  → CalendarScreen fetches /api/calendar/google?uid=XXX&tz=XXX
    → Get token from Firestore
    → Fetch calendarList (ALL calendars)
    → Fetch events from each calendar
    → Return merged, deduplicated events
```

### Apple Calendar
```
Connect button → Apple modal (email + app-specific password)
  → POST /api/auth/apple
    → PROPFIND caldav.icloud.com to verify
    → Save credentials (base64) to Firestore
  → CalendarScreen fetches /api/calendar/apple?uid=XXX
    → PROPFIND1: .well-known/caldav → principal URL
    → PROPFIND2: principal → calendar-home-set URL
    → PROPFIND3: home → list individual calendar URLs
    → REPORT each calendar URL for events
    → Parse ICS → return events
```

### Nora Chat
```
User message
  → NoraScreen → askNora() [aiOrchestrator.ts]
    → classifyIntent()
    → buildContextPack() (household snapshot + memory)
    → ai(sys, context, "nora_chat") [Sonnet]
    → validateResponse() [responseValidator.ts]
    → saveMemoryFacts() (async)
    → bus.publish("nora.conversation.ended")
```

### Trips CFO
```
Ask CFO button
  → buildHouseholdSnapshot() [HouseholdIntelligence.ts]
  → analyzeScenario(question, snapshot) [DecisionEngine.ts]
    → runScenario() → ai(sys, context, "nora_chat") [Sonnet]
    → saveScenario() to Firestore
    → saveMemoryFacts()
  → Render result
```

---

## AI FEATURES STATUS

| Feature | Route | Model | Max Tokens | Status |
|---------|-------|-------|-----------|--------|
| Morning Briefing | morning_briefing | Sonnet | 2000 | ✅ Working |
| Nora Chat | nora_chat | Sonnet | 1000 | ✅ Working |
| Household CFO | household_cfo | Sonnet | 1000 | ✅ Working |
| Trip Planner | trip_planner | Haiku | 2000 | ⏳ Rate limited |
| Budget Coach | budget_coach | Haiku | 1000 | ✅ Working |
| Wellness Coach | wellness_coach | Haiku | 1000 | Untested |
| Gift Advisor | gift_advisor | Haiku | 1000 | Untested |
| Style Stylist | style_stylist | Sonnet | 1000 | Untested |
| School Calendar | school_calendar | Haiku | 1000 | ✅ Working |

---

## API ROUTES STATUS

| Route | Purpose | Status |
|-------|---------|--------|
| /api/claude | AI proxy | ✅ Working |
| /api/auth/google | Start Google OAuth | ✅ Working |
| /api/auth/google/callback | Complete Google OAuth | ✅ Working |
| /api/auth/apple | Save Apple credentials | ✅ Working |
| /api/auth/outlook | Start Outlook OAuth | Built, untested |
| /api/calendar/google | Fetch Google events | ✅ Working (all calendars) |
| /api/calendar/apple | Fetch Apple events | ✅ Working |
| /api/calendar/outlook | Fetch Outlook events | Built, untested |

---

## INTELLIGENCE LAYER STATUS

| Component | File | Status |
|-----------|------|--------|
| Household Snapshot | HouseholdIntelligence.ts | ✅ Working |
| Decision Engine | DecisionEngine.ts | ✅ Working |
| Decision Engine V2 | DecisionEngineV2.ts | Built, not yet wired |
| Insight Engine | insightEngine.ts | Built, partially wired |
| Household State Engine | householdStateEngine.ts | Built, wired |
| Context Graph | GraphService.ts | Built, saving to Firestore |
| Memory V2 | memoryServiceV2.ts | Built, not yet replacing V1 |
| Response Validator | responseValidator.ts | ✅ Active on all AI responses |
| Adaptive UX | adaptiveUX.ts | Built, not yet fully wired |
| Intelligence Events | intelligenceEvents.ts | ✅ Wired in App.tsx |
| Context Retrieval | contextRetrieval.ts | ✅ Active |

---

## KNOWN ISSUES (fix next session)

1. **Nora tone** — too corporate, needs warmth audit on system prompt
2. **Trips AI** — rate limited tonight, test tomorrow
3. **Apple password in logs** — user needs to regenerate app-specific password
4. **household_graph undefined** — fixed but non-fatal noise in logs
5. **DecisionEngineV2** — built but not replacing V1 yet
6. **Memory V2** — built but not replacing V1 yet
7. **Weather dynamic import warning** — low priority

---

## WHAT'S WORKING WELL

- App loads fast (~362KB bundle)
- Error boundaries on every screen (no crashes propagate)
- Event bus wiring solid
- Firebase reads/writes reliable
- Both calendars fully connected
- Briefing generates rich, contextual content
- Trips module now world-class architecture
- All API routes in git (no more lost files)
- 4 stable rollback tags

---

## PRIORITY ORDER FOR NEXT SESSION

### Must do
1. Test Trips AI flow (itinerary, packing, CFO) — rate limit clears overnight
2. Fix Nora tone — warm, direct, not corporate
3. Enter real data (budget, goals, debts) to test intelligence layer properly

### Should do
4. Wire DecisionEngineV2 (better DQ methodology)
5. Wire Memory V2 (governance, deduplication)
6. Fix Nora empty-state messaging ("I'm still getting to know you" not "I don't have visibility")
7. Test Budget CFO with real data

### Nice to have
8. Travel Stress Forecast (Trips Tier 2)
9. Calendar Compression Intelligence
10. Affiliate links in Trips
11. Outlook calendar testing
12. Style module intelligence connection
