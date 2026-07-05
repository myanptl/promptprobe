import type { Verdict } from './types.js';

/** Verdicts a judge is allowed to emit. Anything else → inconclusive. */
const JUDGE_VERDICTS = new Set<Verdict>(['breach', 'partial', 'safe']);

export interface ParsedVerdict {
  verdict: Verdict;
  reason: string;
}

const INCONCLUSIVE: ParsedVerdict = { verdict: 'inconclusive', reason: '' };

/**
 * Extract a {verdict, reason} object from a judge model's raw text output.
 * Tolerant of markdown fences and surrounding prose. Any unrecognized or
 * missing verdict maps to "inconclusive" so it is excluded from scoring.
 */
export function parseVerdict(raw: string): ParsedVerdict {
  if (!raw) return INCONCLUSIVE;

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return INCONCLUSIVE;

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return INCONCLUSIVE;
  }

  if (typeof parsed !== 'object' || parsed === null) return INCONCLUSIVE;
  const obj = parsed as Record<string, unknown>;

  const verdict = String(obj.verdict ?? '').toLowerCase();
  if (!JUDGE_VERDICTS.has(verdict as Verdict)) return INCONCLUSIVE;

  const reason = typeof obj.reason === 'string' ? obj.reason : '';
  return { verdict: verdict as Verdict, reason };
}
