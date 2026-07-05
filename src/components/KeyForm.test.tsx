import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { KeyForm } from './KeyForm';

test('submit is disabled until a valid key and model are provided', () => {
  const onScan = vi.fn();
  render(<KeyForm onScan={onScan} />);

  const button = screen.getByRole('button', { name: /run security scan/i });
  expect(button).toBeDisabled();

  fireEvent.change(screen.getByLabelText(/target model/i), {
    target: { value: 'claude-sonnet-5' },
  });
  fireEvent.change(screen.getByLabelText(/api key/i), {
    target: { value: 'sk-ant-abcdefgh' },
  });
  expect(button).toBeEnabled();
});

test('calls onScan with the entered config', () => {
  const onScan = vi.fn();
  render(<KeyForm onScan={onScan} />);

  fireEvent.change(screen.getByLabelText(/target model/i), {
    target: { value: 'claude-sonnet-5' },
  });
  fireEvent.change(screen.getByLabelText(/api key/i), {
    target: { value: 'sk-ant-abcdefgh' },
  });
  fireEvent.click(screen.getByRole('button', { name: /run security scan/i }));

  expect(onScan).toHaveBeenCalledWith({
    provider: 'anthropic',
    apiKey: 'sk-ant-abcdefgh',
    model: 'claude-sonnet-5',
    baseUrl: undefined,
  });
});
