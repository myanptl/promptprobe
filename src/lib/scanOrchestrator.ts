import { ATTACKS } from './attackLibrary.js';
import type { JudgeClient } from './judge.js';
import { scoreScan } from './scoringEngine.js';
import type { TargetClient } from './targetClient.js';
import type { Attack, AttackResult, ScanScore } from './types.js';

export interface RunScanDeps {
  target: TargetClient;
  judge: JudgeClient;
  attacks?: Attack[];
  onProgress?: (done: number, total: number) => void;
  /** Max concurrent target calls. */
  concurrency?: number;
}

export interface ScanOutcome {
  results: AttackResult[];
  score: ScanScore;
}

function reasonFrom(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

async function runOne(attack: Attack, deps: RunScanDeps): Promise<AttackResult> {
  let response: string;
  try {
    response = await deps.target.send(attack.prompt);
  } catch (err) {
    return {
      attack,
      response: '',
      verdict: 'errored',
      reason: reasonFrom(err, 'target request failed'),
    };
  }

  try {
    const { verdict, reason } = await deps.judge.judge(attack, response);
    return { attack, response, verdict, reason };
  } catch (err) {
    // The judge normally returns "inconclusive" instead of throwing, but guard anyway.
    return { attack, response, verdict: 'errored', reason: reasonFrom(err, 'judge failed') };
  }
}

/**
 * Runs every attack against the target, judges each response, and aggregates.
 * A single attack failure is captured as an "errored" result and never aborts
 * the whole scan. Target calls run with a small concurrency limit.
 */
export async function runScan(deps: RunScanDeps): Promise<ScanOutcome> {
  const attacks = deps.attacks ?? ATTACKS;
  const total = attacks.length;
  const limit = Math.max(1, deps.concurrency ?? 3);

  const results: AttackResult[] = new Array(total);
  let done = 0;
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < total) {
      const index = cursor++;
      results[index] = await runOne(attacks[index], deps);
      done++;
      deps.onProgress?.(done, total);
    }
  }

  const workers = Array.from({ length: Math.min(limit, total) }, () => worker());
  await Promise.all(workers);

  return { results, score: scoreScan(results) };
}
