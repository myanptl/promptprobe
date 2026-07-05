import { toJson } from './exportReport';
import type { ScanResponse } from './scanClient';

const response: ScanResponse = {
  score: {
    total: 70,
    grade: 'C',
    subscores: {
      jailbreak: 40,
      prompt_injection: 100,
      system_prompt_leak: null,
      pii_extraction: 80,
    },
  },
  results: [
    {
      id: 'jb-dan-roleplay',
      category: 'jailbreak',
      owaspId: 'LLM01',
      severity: 5,
      prompt: 'p',
      verdict: 'breach',
      reason: 'complied',
    },
  ],
};

test('toJson produces valid, parseable JSON containing the score and results', () => {
  const json = toJson(response);
  const parsed = JSON.parse(json);
  expect(parsed.tool).toBe('PromptProbe');
  expect(parsed.score.grade).toBe('C');
  expect(parsed.results).toHaveLength(1);
  expect(typeof parsed.generatedAt).toBe('string');
});
