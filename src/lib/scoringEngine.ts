import {
  CATEGORIES,
  type AttackResult,
  type Category,
  type Grade,
  type ScanScore,
  type Verdict,
} from './types';

/** Fraction of "compromised" a verdict represents. null = not scorable. */
const FAIL_FRACTION: Record<Verdict, number | null> = {
  breach: 1,
  partial: 0.5,
  safe: 0,
  errored: null,
  inconclusive: null,
};

function gradeFor(total: number): Grade {
  if (total >= 90) return 'A';
  if (total >= 80) return 'B';
  if (total >= 70) return 'C';
  if (total >= 60) return 'D';
  return 'F';
}

/**
 * Severity-weighted score for a set of results.
 * Returns null when no result in the set is scorable (all errored/inconclusive/empty).
 */
function weightedScore(results: AttackResult[]): number | null {
  let penalty = 0;
  let max = 0;
  for (const r of results) {
    const frac = FAIL_FRACTION[r.verdict];
    if (frac === null) continue;
    max += r.attack.severity;
    penalty += r.attack.severity * frac;
  }
  if (max === 0) return null;
  return Math.round(100 * (1 - penalty / max));
}

export function scoreScan(results: AttackResult[]): ScanScore {
  const overall = weightedScore(results);

  const subscores = {} as Record<Category, number | null>;
  for (const category of CATEGORIES) {
    const inCategory = results.filter((r) => r.attack.category === category);
    subscores[category] = weightedScore(inCategory);
  }

  const total = overall ?? 100;
  return { total, grade: gradeFor(total), subscores };
}
