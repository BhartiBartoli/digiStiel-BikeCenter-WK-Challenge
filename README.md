# Bike Center WK Challenge — V6 (Netlify + Airtable)

Production MVP. Static `index.html` + five Netlify Functions proxying Airtable. The Airtable API key is **server-side only** — never shipped to the browser.

## Structure
```
index.html                      full app (UI + client logic)
netlify.toml                    functions config, /api redirects, security headers
netlify/functions/
  _airtable.js                  shared Airtable REST helper (list/create/update)
  submit.js       POST /api/submit       create participant (+ dedupe) + prediction
  enrich.js       POST /api/enrich       add tie-breaker answers
  event.js        POST /api/event        fire-and-forget analytics logging
  leaderboard.js  GET  /api/leaderboard  read-only top N (no PII)
  ping.js         GET  /api/ping         validate creds + table access
```

## Environment variables (Netlify → Site settings → Environment variables)
```
AIRTABLE_BASE_ID = appXXXXXXXXXXXXXX
AIRTABLE_API_KEY = patXXXX...          (Airtable personal access token)
```
The token needs `data.records:read` and `data.records:write` scopes on this base.


## Deploy (GitHub, like before)
1. Push this folder to a GitHub repo.
2. Netlify → Add new site → Import from GitHub → pick the repo.
3. Build settings: publish dir `.`, functions dir auto-detected from `netlify.toml`.
4. Add the two env vars above. Deploy.
5. Visit `https://<site>.netlify.app/api/ping` — expect `"status":"ok"` with every table `"ok"`.

## Airtable expectations
Fields must match exactly (they do, per your setup):
- **Participants**: FirstName, LastName, Email, Mobile, WhatsAppConsent, WhatsAppConsentTS, MarketingConsent, MarketingConsentTS, Status, TieBreakerGoals, TieBreakerYellowCards, Source, TotalPoints (rollup)
- **Predictions**: Participant (link), PredictedBelgiumGoals, PredictedOpponentGoals + see note below
- **Matches**: Opponent, MatchDate, BelgiumGoals, OpponentGoals, Status
- **Events**: EventType, Source, Metadata

### One decision to make: how Predictions references the match
`submit.js` writes the match as a **text** field `MatchKey` (value `"BEL-EGY"`) to avoid a linked-record lookup on the hot path. Your spec modelled `Match` as a **link** to the Matches table. Two options:
- **Simplest (recommended for launch):** add a short-text field `MatchKey` to Predictions. No lookup needed; the ranking formula can match on the key.
- **Spec-faithful:** keep `Match` as a link. Then `submit.js` must first look up the Matches record id for `"BEL-EGY"` and pass `Match: [matchRecordId]`. Tell me and I'll switch it — it's a 5-line change.

Because `typecast:true` is set, a missing `MatchKey` field won't hard-fail the participant create, but the prediction won't store the match cleanly until one of the two options is in place.

## Notes
- **Duplicate prevention** is enforced in `submit.js` (Email OR Mobile). Airtable has no native unique constraint, so this is the only guard — keep it server-side.
- **Leaderboard** falls back to the seeded demo rows until real participants exist, so the page never looks empty at launch.
- **Images**: the three Batavus photos are inlined as base64 for the prototype. For production, move them to `/img/*.webp` and update the `<img src>`s so they cache independently and shrink the HTML.
- **Fixtures**: the opener is hard-coded `BEL-EGY 15 June 21:00`. Seed the real WK 2026 group-stage fixtures in Matches and update the UI's `NEXT_MATCH` + match label before launch.
