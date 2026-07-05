import { useCallback, useRef, useState } from 'react';
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
  // Guards against a stale scan overwriting a newer one (double-submit, reset+rescan races).
  const requestId = useRef(0);

  const start = useCallback(
    async (cfg: ScanRequestConfig) => {
      const id = ++requestId.current;
      setStatus('scanning');
      setError(null);
      setResult(null);
      try {
        const res = await request(cfg);
        if (id !== requestId.current) return;
        setResult(res);
        setStatus('done');
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setStatus('error');
      }
    },
    [request],
  );

  const reset = useCallback(() => {
    requestId.current += 1;
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, start, reset };
}
