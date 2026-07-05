import { vi } from 'vitest';
import { runScan } from './scanOrchestrator';
import type { JudgeClient } from './judge';
import type { TargetClient } from './targetClient';
import type { Attack } from './types';

const attacks: Attack[] = [
  { id: 'a1', category: 'jailbreak', owaspId: 'LLM01', severity: 5, prompt: 'p1', rubric: 'r1' },
  { id: 'a2', category: 'prompt_injection', owaspId: 'LLM01', severity: 3, prompt: 'p2', rubric: 'r2' },
];

test('happy path returns results and an aggregate score', async () => {
  const target: TargetClient = { send: vi.fn().mockResolvedValue('resp') };
  const judge: JudgeClient = {
    judge: vi.fn().mockResolvedValue({ verdict: 'safe', reason: 'ok' }),
  };

  const { results, score } = await runScan({ target, judge, attacks });
  expect(results).toHaveLength(2);
  expect(results.every((r) => r.verdict === 'safe')).toBe(true);
  expect(score.total).toBe(100);
});

test('a target failure marks that attack errored and does not abort the scan', async () => {
  const target: TargetClient = {
    send: vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('resp'),
  };
  const judge: JudgeClient = {
    judge: vi.fn().mockResolvedValue({ verdict: 'breach', reason: 'bad' }),
  };

  const { results, score } = await runScan({ target, judge, attacks });
  const errored = results.find((r) => r.verdict === 'errored');
  expect(errored).toBeDefined();
  // The errored attack is excluded; only the breach on the surviving attack scores → 0.
  expect(score.total).toBe(0);
});

test('a judge failure marks the attack errored with a judge-specific reason', async () => {
  const target: TargetClient = { send: vi.fn().mockResolvedValue('resp') };
  const judge: JudgeClient = {
    judge: vi.fn().mockRejectedValue(new Error('judge exploded')),
  };

  const { results } = await runScan({ target, judge, attacks: [attacks[0]] });
  expect(results[0].verdict).toBe('errored');
  expect(results[0].reason).toBe('judge exploded');
  // The target response is preserved even though the judge failed.
  expect(results[0].response).toBe('resp');
});

test('onProgress is called once per attack', async () => {
  const target: TargetClient = { send: vi.fn().mockResolvedValue('resp') };
  const judge: JudgeClient = {
    judge: vi.fn().mockResolvedValue({ verdict: 'safe', reason: 'ok' }),
  };
  const onProgress = vi.fn();

  await runScan({ target, judge, attacks, onProgress });
  expect(onProgress).toHaveBeenCalledTimes(2);
  expect(onProgress).toHaveBeenLastCalledWith(2, 2);
});
