import { useRef } from 'react';
import type { ScanResponse } from '../lib/scanClient';
import { CATEGORIES, CATEGORY_LABELS } from '../lib/types';
import { downloadJson, downloadPng } from '../lib/exportReport';
import { ScoreGauge } from './ScoreGauge';
import { AttackCard } from './AttackCard';

interface ResultsDashboardProps {
  response: ScanResponse;
  onReset: () => void;
}

function subscoreClass(value: number | null): string {
  if (value === null) return 'sub-null';
  if (value >= 80) return 'sub-good';
  if (value >= 50) return 'sub-warn';
  return 'sub-bad';
}

export function ResultsDashboard({ response, onReset }: ResultsDashboardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { score, results } = response;

  return (
    <section className="results">
      <div className="scorecard" ref={cardRef}>
        <ScoreGauge total={score.total} grade={score.grade} />
        <div className="scorecard-meta">
          <h2>Security score</h2>
          <div className="subscores">
            {CATEGORIES.map((cat) => {
              const value = score.subscores[cat];
              return (
                <div key={cat} className={`subscore ${subscoreClass(value)}`}>
                  <span className="subscore-label">{CATEGORY_LABELS[cat]}</span>
                  <span className="subscore-value">{value === null ? 'n/a' : value}</span>
                </div>
              );
            })}
          </div>
          <p className="scorecard-brand">PromptProbe · LLM security scan</p>
        </div>
      </div>

      <div className="results-actions">
        <button onClick={() => cardRef.current && downloadPng(cardRef.current)}>
          Download PNG
        </button>
        <button onClick={() => downloadJson(response)}>Download JSON</button>
        <button className="ghost" onClick={onReset}>
          New scan
        </button>
      </div>

      <div className="attack-list">
        {results.map((r) => (
          <AttackCard key={r.id} result={r} />
        ))}
      </div>
    </section>
  );
}
