const TOTAL_ATTACKS = 20;

interface ScanProgressProps {
  /** Attacks in the library; drives the copy. */
  total?: number;
}

/**
 * Indeterminate scan indicator. The serverless scan is a single request, so we
 * show an animated sweep rather than per-attack counts (which would require
 * streaming). Copy names the number of probes for reassurance.
 */
export function ScanProgress({ total = TOTAL_ATTACKS }: ScanProgressProps) {
  return (
    <div className="scan-progress" role="status" aria-live="polite">
      <div className="sweep" aria-hidden="true" />
      <p>
        Firing <strong>{total}</strong> adversarial probes and judging each response…
      </p>
    </div>
  );
}
