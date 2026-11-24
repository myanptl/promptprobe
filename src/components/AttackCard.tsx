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
        <span className="attack-dot" aria-hidden="true" />
        <span className="attack-id">{result.id}</span>
        <span className="attack-owasp">{result.owaspId}</span>
        <span className="verdict-badge">{meta.label}</span>
        <svg className="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div className="attack-body" id={bodyId}>
          <div>
            <p className="attack-label">Probe sent</p>
            <pre className="attack-prompt">{result.prompt}</pre>
          </div>
          <div>
            <p className="attack-label">Why the judge said {meta.label.toLowerCase()}</p>
            <p className="attack-reason">{result.reason || 'No reason given.'}</p>
          </div>
        </div>
      )}
    </article>
  );
}
