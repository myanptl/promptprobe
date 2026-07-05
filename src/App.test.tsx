import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the PromptProbe masthead', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /promptprobe/i })).toBeInTheDocument();
});
