import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ATTACKS } from '../src/lib/attackLibrary.js';
import { createAnthropicJudge, type JudgeClient } from '../src/lib/judge.js';
import { createTargetClient, validateKeyFormat, type TargetClient } from '../src/lib/targetClient.js';
import { isSafeTargetUrl } from '../src/lib/urlGuard.js';
import { runScan } from '../src/lib/scanOrchestrator.js';
import { saveScan as persistScan } from '../src/lib/db.js';
import type { Attack } from '../src/lib/types.js';
import { createRateLimiter, type RateLimiter } from '../src/lib/rateLimit.js';

const bodySchema = z.object({
  provider: z.enum(['anthropic', 'openai-compatible']),
  apiKey: z.string().min(8),
  model: z.string().min(1),
  baseUrl: z.string().url().optional(),
});

export interface ScanDeps {
  rateLimiter: RateLimiter;
  judgeKey: string;
  makeTarget: (cfg: z.infer<typeof bodySchema>) => TargetClient;
  makeJudge: (key: string) => JudgeClient;
  saveScan: (record: {
    provider: string;
    model: string;
    total: number;
    grade: string;
    subscores: Record<string, number | null>;
  }) => Promise<void>;
  attacks?: Attack[];
}

export interface HandleScanInput {
  body: unknown;
  ip: string;
  deps: ScanDeps;
}

export interface HandleScanResult {
  status: number;
  body: object;
}

/**
 * Pure request core: validate → rate-limit → scan → persist.
 * The target key is used only to build the target client; it is never returned
 * in the response or written to the database.
 */
export async function handleScan(input: HandleScanInput): Promise<HandleScanResult> {
  const { deps, ip } = input;

  const parsed = bodySchema.safeParse(input.body);
  if (!parsed.success) {
    return { status: 400, body: { error: 'Invalid request body.' } };
  }
  const cfg = parsed.data;

  if (!validateKeyFormat(cfg.provider, cfg.apiKey)) {
    return { status: 400, body: { error: 'API key format is invalid for this provider.' } };
  }

  // SSRF guard: a custom endpoint must be a public HTTP(S) host.
  if (cfg.baseUrl && !isSafeTargetUrl(cfg.baseUrl)) {
    return { status: 400, body: { error: 'baseUrl must be a public HTTP(S) endpoint.' } };
  }

  if (!deps.rateLimiter.take(ip)) {
    return { status: 429, body: { error: 'Rate limit exceeded. Try again shortly.' } };
  }

  const target = deps.makeTarget(cfg);
  const judge = deps.makeJudge(deps.judgeKey);

  const { results, score } = await runScan({
    target,
    judge,
    attacks: deps.attacks,
  });

  await deps.saveScan({
    provider: cfg.provider,
    model: cfg.model,
    total: score.total,
    grade: score.grade,
    subscores: score.subscores,
  });

  // Response includes attack metadata + verdicts, but never the key.
  const safeResults = results.map((r) => ({
    id: r.attack.id,
    category: r.attack.category,
    owaspId: r.attack.owaspId,
    severity: r.attack.severity,
    prompt: r.attack.prompt,
    verdict: r.verdict,
    reason: r.reason,
  }));

  return { status: 200, body: { score, results: safeResults } };
}

function headerValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function clientIp(headers: VercelRequest['headers']): string {
  // Prefer Vercel's platform-generated header, which clients cannot spoof.
  // Fall back to x-forwarded-for only when it is absent.
  return (
    headerValue(headers['x-vercel-forwarded-for'])?.split(',')[0]?.trim() ||
    headerValue(headers['x-real-ip'])?.split(',')[0]?.trim() ||
    headerValue(headers['x-forwarded-for'])?.split(',')[0]?.trim() ||
    'unknown'
  );
}

// Shared limiter across invocations on a warm instance.
const sharedLimiter = createRateLimiter(5, 5 / 60);

function productionDeps(): ScanDeps {
  return {
    rateLimiter: sharedLimiter,
    judgeKey: process.env.ANTHROPIC_API_KEY ?? '',
    makeTarget: (cfg) => createTargetClient(cfg),
    makeJudge: (key) => createAnthropicJudge(key),
    saveScan: async (record) => {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE;
      if (!url || !key) return;
      const client = createClient(url, key);
      await persistScan(client as unknown as Parameters<typeof persistScan>[0], record);
    },
    attacks: ATTACKS,
  };
}

/** Vercel serverless entrypoint (Node request/response handler). */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const deps = productionDeps();
  if (!deps.judgeKey) {
    res.status(500).json({ error: 'Judge not configured.' });
    return;
  }

  // Vercel parses JSON bodies (application/json) into req.body; handleScan validates it.
  const result = await handleScan({ body: req.body, ip: clientIp(req.headers), deps });
  res.status(result.status).json(result.body);
}
