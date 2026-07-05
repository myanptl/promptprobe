import type { Category, ScanScore, Severity, Verdict } from './types';
import type { Provider } from './targetClient';

export interface UiAttackResult {
  id: string;
  category: Category;
  owaspId: string;
  severity: Severity;
  prompt: string;
  verdict: Verdict;
  reason: string;
}

export interface ScanResponse {
  score: ScanScore;
  results: UiAttackResult[];
}

export interface ScanRequestConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/** Calls the serverless endpoint. Throws with a friendly message on failure. */
export async function requestScan(cfg: ScanRequestConfig): Promise<ScanResponse> {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Scan failed (${res.status}).`);
  }
  return (await res.json()) as ScanResponse;
}
