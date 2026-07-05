import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { ATTACKS } from '../src/lib/attackLibrary';
import { createAnthropicJudge, type JudgeClient } from '../src/lib/judge';
import { createTargetClient, validateKeyFormat, type TargetClient } from '../src/lib/targetClient';
import { runScan } from '../src/lib/scanOrchestrator';
import { saveScan as persistScan } from '../src/lib/db';
import type { Attack } from '../src/lib/types';
import { createRateLimiter, type RateLimiter } from '../src/lib/rateLimit';

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

function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
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

/** Vercel serverless entrypoint (Web Fetch handler). */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const deps = productionDeps();
  if (!deps.judgeKey) {
    return new Response(JSON.stringify({ error: 'Judge not configured.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await handleScan({ body, ip: clientIp(req), deps });
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
