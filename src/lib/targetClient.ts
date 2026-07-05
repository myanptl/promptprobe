export type Provider = 'anthropic' | 'openai-compatible';

export interface TargetConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  /** Override the API base URL (openai-compatible endpoints). */
  baseUrl?: string;
}

export interface TargetClient {
  send(prompt: string): Promise<string>;
}

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_TOKENS = 512;

/** Lightweight sanity check so we fail fast before spending an API call. */
export function validateKeyFormat(provider: string, key: string): boolean {
  if (!key || key.trim().length < 8) return false;
  if (provider === 'anthropic') return key.startsWith('sk-ant-');
  if (provider === 'openai-compatible') return key.startsWith('sk-');
  return false;
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
      // Do not follow redirects into a possibly-internal host (SSRF guard).
      redirect: 'manual',
    });
  } finally {
    clearTimeout(timer);
  }
}

async function anthropicSend(cfg: TargetConfig, prompt: string): Promise<string> {
  // baseUrl overrides are not honored for Anthropic — no legitimate reason, and
  // it removes an SSRF vector. Always use the official endpoint.
  const res = await postJson(
    'https://api.anthropic.com/v1/messages',
    {
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    },
    {
      model: cfg.model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    },
  );
  if (!res.ok) throw new Error(`Target request failed (${res.status})`);
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n');
}

async function openAiSend(cfg: TargetConfig, prompt: string): Promise<string> {
  const res = await postJson(
    cfg.baseUrl ?? 'https://api.openai.com/v1/chat/completions',
    { Authorization: `Bearer ${cfg.apiKey}` },
    {
      model: cfg.model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    },
  );
  if (!res.ok) throw new Error(`Target request failed (${res.status})`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? '';
}

export function createTargetClient(cfg: TargetConfig): TargetClient {
  return {
    send(prompt: string) {
      return cfg.provider === 'anthropic'
        ? anthropicSend(cfg, prompt)
        : openAiSend(cfg, prompt);
    },
  };
}
