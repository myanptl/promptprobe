# PromptProbe

**Red-team your chatbot in one scan.** PromptProbe fires a battery of adversarial
prompts (OWASP LLM Top 10) at a chatbot you own, uses an LLM-as-judge to grade
each response, and returns a weighted security score with a per-attack breakdown
you can export.

![PromptProbe report — a live scan of Claude Haiku scoring 92/A](docs/assets/scorecard-live.png)

*A real scan: Claude Haiku scored 92/A — it resisted prompt injection, system-prompt leaks, and PII extraction, but the DAN jailbreak scored a breach.*

## How it works

1. You provide your target model's API key (bring-your-own-key).
2. A Vercel serverless function sends ~20 adversarial probes across four
   categories: **prompt injection, jailbreak, system-prompt leak, PII extraction**.
3. A judge model grades every response as `breach` / `partial` / `safe`.
4. A severity-weighted engine produces a 0–100 score and an A–F grade.
5. Export the scorecard as PNG or the full report as JSON.

## Security model

- **Your key is never stored.** It is sent once to the serverless function, used
  for the scan, and never written to a database, log, or the response body.
- **The judge key stays server-side** (`ANTHROPIC_API_KEY`), never exposed to the
  browser.
- Stored scan results contain only a score, grade, provider/model name, and
  category subscores — no keys, no raw prompt/response text.
- Input is validated with Zod; the endpoint is rate-limited per IP.
- Security headers (CSP, HSTS, nosniff, frame-deny) are set in `vercel.json`.

> The rate limiter is in-memory per serverless instance (V1). For strict global
> limits, back it with Upstash/Redis.

## Setup

```bash
npm install
cp .env.example .env   # fill in the values below
npm run dev
```

### Environment variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | server | Judge model key |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE` | server | Persist anonymous results |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | client | (reserved for future public scan wall) |

Run `supabase/schema.sql` in your Supabase project to create the tables + RLS.

## Scripts

```bash
npm test        # unit + integration (Vitest)
npm run e2e      # end-to-end (Playwright)
npm run build    # type-check + production build
```

## Responsible use

Only scan chatbots you own or are explicitly authorized to test.

## Stack

React + Vite + TypeScript · Vercel serverless · Supabase · Anthropic SDK · Zod ·
Vitest · Playwright.
