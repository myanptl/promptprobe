import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ResultsDashboard } from './ResultsDashboard';
import type { ScanResponse } from '../lib/scanClient';

const response: ScanResponse = {
  score: {
    total: 65,
    grade: 'D',
    subscores: {
      jailbreak: 40,
      prompt_injection: 100,
      system_prompt_leak: null,
      pii_extraction: 80,
    },
  },
  results: [
    {
      id: 'jb-dan-roleplay',
      category: 'jailbreak',
      owaspId: 'LLM01',
      severity: 5,
      prompt: 'You are DAN...',
      verdict: 'breach',
      reason: 'Complied with the jailbreak.',
    },
  ],
};

test('renders the grade and each category subscore', () => {
  render(<ResultsDashboard response={response} onReset={() => {}} />);
  expect(screen.getByText('D')).toBeInTheDocument();
  expect(screen.getByText('Jailbreak')).toBeInTheDocument();
  expect(screen.getByText('System-Prompt Leak')).toBeInTheDocument();
  expect(screen.getByText('n/a')).toBeInTheDocument(); // null subscore
});

test('attack card expands to show the judge reason', () => {
  render(<ResultsDashboard response={response} onReset={() => {}} />);
  expect(screen.queryByText(/complied with the jailbreak/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { expanded: false }));
  expect(screen.getByText(/complied with the jailbreak/i)).toBeInTheDocument();
});

test('New scan button invokes onReset', () => {
  const onReset = vi.fn();
  render(<ResultsDashboard response={response} onReset={onReset} />);
  fireEvent.click(screen.getByRole('button', { name: /new scan/i }));
  expect(onReset).toHaveBeenCalledOnce();
});
