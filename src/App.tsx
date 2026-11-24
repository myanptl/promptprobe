import { useEffect, useState } from 'react';
import { useScan } from './hooks/useScan';
import { ATTACKS } from './lib/attackLibrary';
import { KeyForm } from './components/KeyForm';
import { ProbeList } from './components/ProbeList';
import { ResultsDashboard } from './components/ResultsDashboard';

const TICK_MS = 650; // pacing for the probe bars while the single scan request runs

// A caret probing into a speech bubble.
function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.5 3.5h13v8.5H8l-3.5 3v-3h-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6.5 6.5 8.5 8l-2 1.5M10 9.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function App() {
  const scan = useScan();
  const scanning = scan.status === 'scanning';
  const [fired, setFired] = useState(0);

  // Advance the bars while scanning; hold one short of the end until the result lands.
  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(() => setFired((n) => Math.min(n + 1, ATTACKS.length - 1)), TICK_MS);
    return () => clearInterval(id);
  }, [scanning]);

  function start(cfg: Parameters<typeof scan.start>[0]) {
    setFired(0);
    void scan.start(cfg);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1 className="wordmark"><Mark />PromptProbe</h1>
        <span className="end">OWASP LLM Top 10</span>
      </header>

      <main>
        {scan.status === 'done' && scan.result ? (
          <ResultsDashboard response={scan.result} onReset={scan.reset} />
        ) : (
          <>
            <div className="hero">
              <h2>Find out if your chatbot can be talked into things.</h2>
              <p>
                PromptProbe sends {ATTACKS.length} known attack prompts to your model. A second model
                grades each reply, and you get a score out of 100 you can share.
              </p>
            </div>

            <div className="setup">
              <section className="panel" aria-label="Scan setup">
                <div className="panel-head">Target</div>
                <KeyForm onScan={start} disabled={scanning} />
                {scan.status === 'error' && (
                  <p className="scan-error" role="alert">{scan.error}</p>
                )}
              </section>

              <section className="panel" aria-live="polite">
                <div className="panel-head">
                  {scanning ? 'Probing…' : 'What it sends'}
                  <span className="end">{ATTACKS.length} probes</span>
                </div>
                <ProbeList fired={scanning ? fired : null} />
              </section>
            </div>
          </>
        )}
      </main>

      <footer className="site-footer">
        <span>Keys are used server-side for one scan and never stored.</span>
        <span>Only test bots you own.</span>
      </footer>
    </div>
  );
}
