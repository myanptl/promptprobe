import { ATTACKS } from '../lib/attackLibrary';
import { CATEGORIES, CATEGORY_LABELS } from '../lib/types';

const GROUPS = CATEGORIES.map((cat) => {
  const attacks = ATTACKS.filter((a) => a.category === cat);
  return { cat, attacks, owasp: attacks[0]?.owaspId ?? '' };
});

interface ProbeListProps {
  /** Probes "fired" so far (0..ATTACKS.length), or null when idle. Cosmetic pacing only. */
  fired: number | null;
}

/** The probe library grouped by category; each bar fills as a scan works through it. */
export function ProbeList({ fired }: ProbeListProps) {
  let before = 0;
  return (
    <ol className="probes">
      {GROUPS.map(({ cat, attacks, owasp }) => {
        const start = before;
        before += attacks.length;
        const done = fired === null ? 0 : Math.min(Math.max(fired - start, 0), attacks.length);
        const state = fired === null ? 'idle' : done === attacks.length ? 'done' : done > 0 ? 'active' : 'pending';
        return (
          <li key={cat} className="probe" data-state={state}>
            <span className="id">{owasp}</span>
            <span className="name">{CATEGORY_LABELS[cat]}</span>
            <span className="n">{fired === null ? attacks.length : `${done}/${attacks.length}`}</span>
            {fired === null ? (
              <p className="sample" title={attacks[0]?.prompt}>“{attacks[0]?.prompt}”</p>
            ) : (
              <span className="bar" aria-hidden="true">
                <i style={{ '--p': done / attacks.length } as React.CSSProperties} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
