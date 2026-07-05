import { createRateLimiter } from './rateLimit';

test('allows up to capacity then blocks', () => {
  const rl = createRateLimiter(3, 0); // no refill
  expect(rl.take('ip')).toBe(true);
  expect(rl.take('ip')).toBe(true);
  expect(rl.take('ip')).toBe(true);
  expect(rl.take('ip')).toBe(false);
});

test('separate keys have independent buckets', () => {
  const rl = createRateLimiter(1, 0);
  expect(rl.take('a')).toBe(true);
  expect(rl.take('a')).toBe(false);
  expect(rl.take('b')).toBe(true);
});

test('refills over time', () => {
  let now = 0;
  const rl = createRateLimiter(1, 1, () => now); // 1 token/sec
  expect(rl.take('a')).toBe(true);
  expect(rl.take('a')).toBe(false);
  now = 1000; // 1 second later → +1 token
  expect(rl.take('a')).toBe(true);
});
