import type { Grade } from '../lib/types';

interface ScoreGaugeProps {
  total: number;
  grade: Grade;
}

const GRADE_COLOR: Record<Grade, string> = {
  A: '#6f9f74',
  B: '#84a06e',
  C: '#c9a86a',
  D: '#c48a63',
  F: '#c76b63',
};

/** Radial gauge that reads as a security grade, not a generic progress ring. */
export function ScoreGauge({ total, grade }: ScoreGaugeProps) {
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const dash = (total / 100) * circumference;
  const color = GRADE_COLOR[grade];

  return (
    <div className="score-gauge" style={{ '--gauge-color': color } as React.CSSProperties}>
      <svg viewBox="0 0 200 200" role="img" aria-label={`Security score ${total} out of 100, grade ${grade}`}>
        <circle cx="100" cy="100" r={radius} className="gauge-track" />
        <circle
          cx="100"
          cy="100"
          r={radius}
          className="gauge-fill"
          stroke={color}
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 100 100)"
        />
        <text x="100" y="92" className="gauge-grade" fill={color}>
          {grade}
        </text>
        <text x="100" y="126" className="gauge-number">
          {total}
          <tspan className="gauge-outof">/100</tspan>
        </text>
      </svg>
    </div>
  );
}
