import { vi } from 'vitest';
import { handleScan, type ScanDeps } from './scan';
import { createRateLimiter } from '../src/lib/rateLimit';
import type { Attack } from '../src/lib/types';

const oneAttack: Attack[] = [
  { id: 'a1', category: 'jailbreak', owaspId: 'LLM01', severity: 5, prompt: 'p', rubric: 'r' },
];

function baseDeps(overrides: Partial<ScanDeps> = {}): ScanDeps {
  return {
    rateLimiter: createRateLimiter(5),
    judgeKey: 'sk-ant-judge',
    makeTarget: () => ({ send: vi.fn().mockResolvedValue('resp') }),
    makeJudge: () => ({ judge: vi.fn().mockResolvedValue({ verdict: 'safe', reason: 'ok' }) }),
    saveScan: vi.fn().mockResolvedValue(undefined),
    attacks: oneAttack,
    ...overrides,
  };
}

const goodBody = { provider: 'anthropic', apiKey: 'sk-ant-abcdefgh', model: 'claude-sonnet-5' };

test('invalid body → 400', async () => {
  const res = await handleScan({ body: { provider: 'nope' }, ip: '1.1.1.1', deps: baseDeps() });
  expect(res.status).toBe(400);
});

test('bad key format → 400', async () => {
  const res = await handleScan({
    body: { ...goodBody, apiKey: 'not-a-key' },
    ip: '1.1.1.1',
    deps: baseDeps(),
  });
  expect(res.status).toBe(400);
});

test('rate limit exceeded → 429', async () => {
  const deps = baseDeps({ rateLimiter: createRateLimiter(1) });
  const first = await handleScan({ body: goodBody, ip: '9.9.9.9', deps });
  expect(first.status).toBe(200);
  const second = await handleScan({ body: goodBody, ip: '9.9.9.9', deps });
  expect(second.status).toBe(429);
});

test('unsafe baseUrl (SSRF) → 400', async () => {
  const res = await handleScan({
    body: { ...goodBody, baseUrl: 'http://169.254.169.254/latest/meta-data/' },
    ip: '3.3.3.3',
    deps: baseDeps(),
  });
  expect(res.status).toBe(400);
});

test('happy path → 200 and body carries no apiKey', async () => {
  const deps = baseDeps();
  const res = await handleScan({ body: goodBody, ip: '2.2.2.2', deps });
  expect(res.status).toBe(200);
  const json = JSON.stringify(res.body);
  expect(json).not.toContain('sk-ant-abcdefgh');
  expect(json).not.toContain('apiKey');
  expect((res.body as { score: { total: number } }).score.total).toBe(100);
  expect(deps.saveScan).toHaveBeenCalledOnce();
});
