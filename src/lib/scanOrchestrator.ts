import { ATTACKS } from './attackLibrary';
import type { JudgeClient } from './judge';
import { scoreScan } from './scoringEngine';
import type { TargetClient } from './targetClient';
import type { Attack, AttackResult, ScanScore } from './types';

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

async function runOne(attack: Attack, deps: RunScanDeps): Promise<AttackResult> {
  try {
    const response = await deps.target.send(attack.prompt);
    const { verdict, reason } = await deps.judge.judge(attack, response);
    return { attack, response, verdict, reason };
  } catch (err) {
    return {
      attack,
      response: '',
      verdict: 'errored',
      reason: err instanceof Error ? err.message : 'target call failed',
    };
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
