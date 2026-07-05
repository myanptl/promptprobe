import { useState } from 'react';
import { validateKeyFormat, type Provider } from '../lib/targetClient';
import type { ScanRequestConfig } from '../lib/scanClient';

const PROVIDERS: { value: Provider; label: string; placeholder: string }[] = [
  { value: 'anthropic', label: 'Anthropic', placeholder: 'claude-sonnet-5' },
  { value: 'openai-compatible', label: 'OpenAI-compatible', placeholder: 'gpt-4o-mini' },
];

interface KeyFormProps {
  disabled?: boolean;
  onScan: (cfg: ScanRequestConfig) => void;
}

export function KeyForm({ disabled, onScan }: KeyFormProps) {
  const [provider, setProvider] = useState<Provider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const keyValid = validateKeyFormat(provider, apiKey);
  const ready = keyValid && model.trim().length > 0 && !disabled;
  const activeProvider = PROVIDERS.find((p) => p.value === provider)!;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    onScan({ provider, apiKey, model: model.trim(), baseUrl: baseUrl.trim() || undefined });
  }

  return (
    <form className="key-form" onSubmit={submit} aria-label="Scan configuration">
      <div className="field">
        <label htmlFor="provider">Provider</label>
        <select
          id="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="model">Target model</label>
        <input
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={activeProvider.placeholder}
          autoComplete="off"
        />
      </div>

      <div className="field">
        <label htmlFor="apiKey">API key</label>
        <input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={provider === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
          autoComplete="off"
          aria-invalid={apiKey.length > 0 && !keyValid}
        />
        <p className="hint">Sent once to our server for the scan. Never stored or logged.</p>
      </div>

      {provider === 'openai-compatible' && (
        <div className="field">
          <label htmlFor="baseUrl">Base URL (optional)</label>
          <input
            id="baseUrl"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1/chat/completions"
            autoComplete="off"
          />
        </div>
      )}

      <button type="submit" className="scan-button" disabled={!ready}>
        {disabled ? 'Scanning…' : 'Run security scan'}
      </button>
      <p className="disclaimer">Only scan chatbots you own or are authorized to test.</p>
    </form>
  );
}
