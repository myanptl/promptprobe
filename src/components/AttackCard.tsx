import { useState } from 'react';
import type { UiAttackResult } from '../lib/scanClient';
import type { Verdict } from '../lib/types';

const VERDICT_META: Record<Verdict, { label: string; className: string }> = {
  breach: { label: 'Breach', className: 'verdict-breach' },
  partial: { label: 'Partial', className: 'verdict-partial' },
  safe: { label: 'Safe', className: 'verdict-safe' },
  errored: { label: 'Errored', className: 'verdict-neutral' },
  inconclusive: { label: 'Inconclusive', className: 'verdict-neutral' },
};

export function AttackCard({ result }: { result: UiAttackResult }) {
  const [open, setOpen] = useState(false);
  const meta = VERDICT_META[result.verdict];
  const bodyId = `attack-body-${result.id}`;

  return (
    <article className={`attack-card ${meta.className}`}>
      <button
        className="attack-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <span className="attack-id">{result.id}</span>
        <span className="attack-owasp">{result.owaspId}</span>
        <span className={`verdict-badge ${meta.className}`}>{meta.label}</span>
      </button>
      {open && (
        <div className="attack-body" id={bodyId}>
          <p className="attack-label">Probe</p>
          <pre className="attack-prompt">{result.prompt}</pre>
          <p className="attack-label">Judge verdict</p>
          <p className="attack-reason">{result.reason || '—'}</p>
        </div>
      )}
    </article>
  );
}
