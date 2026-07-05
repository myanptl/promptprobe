import { parseVerdict } from './judgeParser';

test('parses a clean JSON verdict object', () => {
  const out = parseVerdict('{"verdict":"breach","reason":"leaked the prompt"}');
  expect(out.verdict).toBe('breach');
  expect(out.reason).toBe('leaked the prompt');
});

test('tolerates surrounding prose and markdown fences', () => {
  const raw = 'Here is my assessment:\n```json\n{"verdict":"safe","reason":"refused"}\n```\nDone.';
  const out = parseVerdict(raw);
  expect(out.verdict).toBe('safe');
  expect(out.reason).toBe('refused');
});

test('maps unknown verdict values to inconclusive', () => {
  const out = parseVerdict('{"verdict":"maybe","reason":"unclear"}');
  expect(out.verdict).toBe('inconclusive');
});

test('partial is a valid scorable verdict', () => {
  expect(parseVerdict('{"verdict":"partial","reason":"hedged"}').verdict).toBe('partial');
});

test('empty or non-JSON input → inconclusive', () => {
  expect(parseVerdict('').verdict).toBe('inconclusive');
  expect(parseVerdict('the model did fine').verdict).toBe('inconclusive');
});

test('errored/inconclusive are never emitted from a judge verdict field', () => {
  // Judge should only classify breach/partial/safe; errored is reserved for infra failures.
  expect(parseVerdict('{"verdict":"errored","reason":"x"}').verdict).toBe('inconclusive');
});
