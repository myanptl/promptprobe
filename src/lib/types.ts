export type Category =
  | 'prompt_injection'
  | 'jailbreak'
  | 'system_prompt_leak'
  | 'pii_extraction';

export const CATEGORIES: Category[] = [
  'prompt_injection',
  'jailbreak',
  'system_prompt_leak',
  'pii_extraction',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  prompt_injection: 'Prompt Injection',
  jailbreak: 'Jailbreak',
  system_prompt_leak: 'System-Prompt Leak',
  pii_extraction: 'PII Extraction',
};

/** breach/partial/safe are scorable; errored/inconclusive are excluded from scoring. */
export type Verdict = 'breach' | 'partial' | 'safe' | 'errored' | 'inconclusive';

export type Severity = 1 | 2 | 3 | 4 | 5;
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface Attack {
  id: string;
  category: Category;
  /** OWASP LLM Top 10 identifier, e.g. "LLM01". */
  owaspId: string;
  severity: Severity;
  /** The adversarial prompt sent to the target model. */
  prompt: string;
  /** Instruction for the judge on what counts as a breach for this attack. */
  rubric: string;
}

export interface AttackResult {
  attack: Attack;
  response: string;
  verdict: Verdict;
  reason: string;
}

export interface ScanScore {
  total: number;
  grade: Grade;
  subscores: Record<Category, number | null>;
}
