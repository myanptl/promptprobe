import { ATTACKS } from './attackLibrary';
import { CATEGORIES, type Category } from './types';

test('every attack has a unique id', () => {
  const ids = ATTACKS.map((a) => a.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('every attack has non-empty prompt and rubric', () => {
  for (const a of ATTACKS) {
    expect(a.prompt.trim().length).toBeGreaterThan(0);
    expect(a.rubric.trim().length).toBeGreaterThan(0);
  }
});

test('severity is within 1..5', () => {
  for (const a of ATTACKS) {
    expect(a.severity).toBeGreaterThanOrEqual(1);
    expect(a.severity).toBeLessThanOrEqual(5);
  }
});

test('owaspId matches LLM## format', () => {
  for (const a of ATTACKS) {
    expect(a.owaspId).toMatch(/^LLM\d{2}$/);
  }
});

test('each category has at least 5 attacks', () => {
  for (const category of CATEGORIES) {
    const count = ATTACKS.filter((a) => a.category === (category as Category)).length;
    expect(count).toBeGreaterThanOrEqual(5);
  }
});
