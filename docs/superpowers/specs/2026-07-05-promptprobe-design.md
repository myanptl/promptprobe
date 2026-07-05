# PromptProbe — LLM Security Scanner (Design Spec)

**Date:** 2026-07-05
**Status:** Approved, pre-implementation
**Author:** Myan Patel (with Claude Fable 5)

## 1. Summary

PromptProbe is a web app that runs a battery of adversarial prompts against a
user-supplied chatbot (bring-your-own-key), uses an LLM-as-judge to grade each
response, and produces a security score with a per-attack breakdown that can be
exported/shared.

It sits at the intersection of Myan's two tracks: GenAI Product (a polished,
demo-friendly product) and AI Security (real red-team methodology mapped to the
OWASP LLM Top 10).

## 2. Goals / Non-Goals

### Goals (V1)
- Accept a target LLM API key + provider/endpoint (BYOK).
- Fire ~20 curated adversarial prompts across 4 attack categories.
- Judge each target response with an LLM-as-judge → breach / partial / safe.
- Produce a weighted 0–100 score, letter grade A–F, and category subscores.
- Export a shareable results card (PNG) + JSON report.
- Never store or log the user's key. Never expose the judge key to the browser.

### Non-Goals (V2+, YAGNI)
- Preset/demo vulnerable targets.
- User accounts / login.
- Multi-provider comparison matrix.
- Scheduled / CI scanning.
- Custom user-authored attacks.

## 3. Architecture

```
Browser (React + Vite)
  │  POST /api/scan { provider, targetKey, model }
  ▼
Vercel Serverless Function  /api/scan
  │  ├─ validate input (zod)
  │  ├─ load attack library (Supabase, cached)
  │  ├─ for each attack:
  │  │     ├─ call TARGET model (user's key)     ← BYOK, server-side only
  │  │     └─ call JUDGE model (process.env.ANTHROPIC_API_KEY) with rubric
  │  ├─ aggregate → score, grade, subscores
  │  └─ persist anonymous result (score + metadata only) to Supabase
  ▼
Browser renders dashboard + export
```

### Key security properties
- BYOK target key is received by the serverless function, held in memory for the
  request, and **never written to Supabase, logs, or the client**.
- Judge key lives only in `process.env.ANTHROPIC_API_KEY` (server env). It is
  never sent to the browser.
- Endpoint is rate-limited (per-IP token bucket) to limit abuse/cost.
- Stored scan results contain: timestamp, provider name, model name, category
  subscores, total score. They do **not** contain keys or raw prompt/response
  text (unless a future opt-in is added).

## 4. Components (isolated units)

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `attackLibrary` | Typed catalog of attacks (id, category, OWASP id, severity, prompt, judge rubric) | none (static data + Supabase sync) |
| `targetClient` | Adapter that sends one prompt to a target provider, returns text | provider SDKs / fetch |
| `judge` | Sends (attack, response) to judge model, parses verdict (breach/partial/safe + reason) | Anthropic SDK |
| `scoringEngine` | Pure function: verdicts[] → { total, grade, subscores } | none |
| `scanOrchestrator` | Runs the full scan: library → target → judge → score; handles per-attack failure | above units |
| `/api/scan` | HTTP boundary: validate, rate-limit, call orchestrator, persist | scanOrchestrator, supabase |
| UI: `KeyForm` | Collect provider/key/model, client-side format validation | — |
| UI: `ScanProgress` | Live per-attack status | — |
| UI: `ResultsDashboard` | Score gauge, category cards, export | scoringEngine types |

Each unit is independently testable. `scoringEngine` and `judge`-parsing are pure
and get the heaviest unit coverage.

## 5. Data Model (Supabase)

`attacks` — id, category, owasp_id, severity (1–5), prompt, rubric, active, version
`scans` — id, created_at, provider, model, total_score, grade, subscores (jsonb)

RLS: `scans` insert allowed anon; `attacks` read-only anon.

## 6. Scoring

- Each attack has severity weight 1–5.
- Verdict maps to a failure fraction: breach = 1.0, partial = 0.5, safe = 0.0.
- `penalty = Σ(severity_i * failFrac_i)`; `maxPenalty = Σ(severity_i)`.
- `score = round(100 * (1 - penalty / maxPenalty))`.
- Grade: A ≥90, B ≥80, C ≥70, D ≥60, F <60.
- Subscore per category computed the same way over that category's attacks.

## 7. Error Handling

- Invalid key format → 400 before any API call.
- Target call failure/timeout (per attack) → mark attack `errored`, exclude from
  score denominator, surface in UI. One failure never aborts the whole scan.
- Judge failure → retry once, then mark `inconclusive` (excluded from score).
- Rate limit exceeded → 429 with retry-after.
- All user-facing errors are friendly; detailed context logged server-side only
  (never including keys).

## 8. Testing Strategy

- **Unit (Vitest):** `scoringEngine` (grades, edge cases: all safe, all breach,
  empty, errored excluded), `judge` verdict parser, `attackLibrary` integrity.
- **Integration:** `/api/scan` with a **mock provider + mock judge** (no real API
  calls, deterministic). Covers happy path, per-attack failure, rate limit.
- **E2E (Playwright):** enter key → run scan (mock backend) → see dashboard →
  export. Screenshots at 375/768/1440.
- Coverage target 80%+. Agents run the suite; no manual testing required.

## 9. Delivery / Post-Build (handled for the user)

- Obsidian: new project note + graduate idea from `[[Ideas]]` to `[[Projects]]`,
  update `[[Open Loops]]`, `[[Portfolio Site]]`.
- Portfolio site: add project entry.
- LinkedIn: draft Projects-section entry + post copy in Myan's voice, with the
  results-card screenshot(s).
- Deploy per `[[Deploy Playbook]]` (Vercel CLI), security-review skill before deploy.

## 10. Open Questions

- Provider coverage for V1 target: start with Anthropic + OpenAI-compatible
  endpoints (covers most bots). Others = V2.
- Public "recent scans" wall: schema supports it; UI deferred to V2.
