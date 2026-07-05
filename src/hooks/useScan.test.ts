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

test('a stale scan does not overwrite a newer one', async () => {
  // First call resolves slowly, second resolves fast; the fast (newer) one wins.
  const slow: ScanResponse = { ...fakeResponse, score: { ...fakeResponse.score, total: 10 } };
  const fast: ScanResponse = { ...fakeResponse, score: { ...fakeResponse.score, total: 90 } };
  let resolveSlow!: (v: ScanResponse) => void;
  const request = vi
    .fn()
    .mockImplementationOnce(() => new Promise<ScanResponse>((r) => (resolveSlow = r)))
    .mockImplementationOnce(() => Promise.resolve(fast));

  const { result } = renderHook(() => useScan(request));

  await act(async () => {
    void result.current.start({ provider: 'anthropic', apiKey: 'sk-ant-x', model: 'm' });
    await result.current.start({ provider: 'anthropic', apiKey: 'sk-ant-x', model: 'm' });
    resolveSlow(slow); // stale response arrives last
  });

  expect(result.current.result?.score.total).toBe(90);
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
