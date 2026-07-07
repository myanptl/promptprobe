import { KeyForm } from './components/KeyForm';
import { ScanProgress } from './components/ScanProgress';
import { ResultsDashboard } from './components/ResultsDashboard';
import { useScan } from './hooks/useScan';
import { ATTACKS } from './lib/attackLibrary';

export default function App() {
  const scan = useScan();

  return (
    <div className="app-shell">
      <header className="masthead">
        <p className="eyebrow">OWASP LLM Top 10 · one-click red team</p>
        <h1>PromptProbe</h1>
        <p className="tagline">
          Point it at your chatbot. It fires {ATTACKS.length} adversarial probes, an AI judge
          grades every response, and you get a security score you can share.
        </p>
      </header>

      <main className="stage">
        {scan.status === 'idle' && <KeyForm onScan={scan.start} />}
        {scan.status === 'scanning' && <ScanProgress total={ATTACKS.length} />}
        {scan.status === 'error' && (
          <div className="scan-error" role="alert">
            <p>{scan.error}</p>
            <button onClick={scan.reset}>Try again</button>
          </div>
        )}
        {scan.status === 'done' && scan.result && (
          <ResultsDashboard response={scan.result} onReset={scan.reset} />
        )}
      </main>

      <footer className="site-footer">
        <span>Keys are used server-side for one scan and never stored.</span>
        <span>Only test bots you own.</span>
      </footer>
    </div>
  );
}
