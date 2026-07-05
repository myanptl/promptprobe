import { afterEach, vi } from 'vitest';
import { createTargetClient, validateKeyFormat } from './targetClient';

afterEach(() => {
  vi.restoreAllMocks();
});

test('validateKeyFormat accepts well-formed keys per provider', () => {
  expect(validateKeyFormat('anthropic', 'sk-ant-abc123456789')).toBe(true);
  expect(validateKeyFormat('openai-compatible', 'sk-abc123456789')).toBe(true);
});

test('validateKeyFormat rejects empty or malformed keys', () => {
  expect(validateKeyFormat('anthropic', '')).toBe(false);
  expect(validateKeyFormat('anthropic', 'nope')).toBe(false);
  expect(validateKeyFormat('openai-compatible', 'abc')).toBe(false);
});

test('anthropic send returns the text of the completion', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({ content: [{ type: 'text', text: 'hello from target' }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  );
  vi.stubGlobal('fetch', fetchMock);

  const client = createTargetClient({
    provider: 'anthropic',
    apiKey: 'sk-ant-x',
    model: 'claude-sonnet-5',
  });
  const text = await client.send('hi');
  expect(text).toBe('hello from target');
  expect(fetchMock).toHaveBeenCalledOnce();
});

test('openai-compatible send returns the assistant message content', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({ choices: [{ message: { content: 'oai reply' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  );
  vi.stubGlobal('fetch', fetchMock);

  const client = createTargetClient({
    provider: 'openai-compatible',
    apiKey: 'sk-x',
    model: 'gpt-4o-mini',
  });
  expect(await client.send('hi')).toBe('oai reply');
});

test('non-200 response throws a typed error', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response('rate limited', { status: 429 }),
  );
  vi.stubGlobal('fetch', fetchMock);

  const client = createTargetClient({
    provider: 'anthropic',
    apiKey: 'sk-ant-x',
    model: 'claude-sonnet-5',
  });
  await expect(client.send('hi')).rejects.toThrow(/429/);
});
