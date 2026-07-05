/**
 * Minimal structural type for the subset of the Supabase client we use.
 * Keeping it structural lets tests inject a fake without the real SDK.
 */
export interface ScanClient {
  from(table: string): {
    insert(row: unknown): Promise<{ error: unknown }>;
  };
}

export interface ScanRecord {
  provider: string;
  model: string;
  total: number;
  grade: string;
  subscores: Record<string, number | null>;
}

/**
 * Persist an anonymous scan result. Only allowlisted, non-sensitive fields are
 * written — never keys or raw prompt/response text. The allowlist is applied
 * explicitly so a caller cannot smuggle extra fields into the row.
 */
export async function saveScan(client: ScanClient, record: ScanRecord): Promise<void> {
  const row = {
    provider: record.provider,
    model: record.model,
    total_score: record.total,
    grade: record.grade,
    subscores: record.subscores,
  };
  const { error } = await client.from('scans').insert(row);
  if (error) {
    // Persistence is best-effort telemetry; never fail a scan because of it.
    console.error('[promptprobe] saveScan failed:', error);
  }
}
