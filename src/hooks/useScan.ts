import { useCallback, useState } from 'react';
import { requestScan, type ScanRequestConfig, type ScanResponse } from '../lib/scanClient';

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

export interface UseScan {
  status: ScanStatus;
  result: ScanResponse | null;
  error: string | null;
  start: (cfg: ScanRequestConfig) => Promise<void>;
  reset: () => void;
}

export function useScan(
  request: (cfg: ScanRequestConfig) => Promise<ScanResponse> = requestScan,
): UseScan {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (cfg: ScanRequestConfig) => {
      setStatus('scanning');
      setError(null);
      setResult(null);
      try {
        const res = await request(cfg);
        setResult(res);
        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setStatus('error');
      }
    },
    [request],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, start, reset };
}
