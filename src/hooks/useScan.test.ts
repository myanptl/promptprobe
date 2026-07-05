import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useScan } from './useScan';
import type { ScanResponse } from '../lib/scanClient';

const fakeResponse: ScanResponse = {
  score: { total: 80, grade: 'B', subscores: { jailbreak: 60, prompt_injection: null, system_prompt_leak: null, pii_extraction: null } },
  results: [],
};

test('transitions idle → scanning → done on success', async () => {
  const request = vi.fn().mockResolvedValue(fakeResponse);
  const { result } = renderHook(() => useScan(request));

  expect(result.current.status).toBe('idle');
  act(() => {
    void result.current.start({ provider: 'anthropic', apiKey: 'sk-ant-x', model: 'm' });
  });
  await waitFor(() => expect(result.current.status).toBe('done'));
  expect(result.current.result).toEqual(fakeResponse);
});

test('captures a friendly error on failure', async () => {
  const request = vi.fn().mockRejectedValue(new Error('Rate limit exceeded.'));
  const { result } = renderHook(() => useScan(request));

  await act(async () => {
    await result.current.start({ provider: 'anthropic', apiKey: 'sk-ant-x', model: 'm' });
  });
  expect(result.current.status).toBe('error');
  expect(result.current.error).toBe('Rate limit exceeded.');
});
