import { vi } from 'vitest';
import { saveScan, type ScanClient } from './db';

function fakeClient() {
  const inserted: unknown[] = [];
  const client: ScanClient = {
    from() {
      return {
        insert(row: unknown) {
          inserted.push(row);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { client, inserted };
}

test('saveScan inserts into the scans table with only allowlisted fields', async () => {
  const { client, inserted } = fakeClient();
  const fromSpy = vi.spyOn(client, 'from');

  await saveScan(client, {
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    total: 82,
    grade: 'B',
    subscores: { jailbreak: 60 },
  });

  expect(fromSpy).toHaveBeenCalledWith('scans');
  expect(inserted).toHaveLength(1);
  const row = inserted[0] as Record<string, unknown>;
  expect(Object.keys(row).sort()).toEqual(
    ['grade', 'model', 'provider', 'subscores', 'total_score'].sort(),
  );
});

test('saveScan never persists a key even if one is passed in the object', async () => {
  const { client, inserted } = fakeClient();
  await saveScan(client, {
    provider: 'anthropic',
    model: 'm',
    total: 10,
    grade: 'F',
    subscores: {},
    // @ts-expect-error — deliberately smuggling a forbidden field
    apiKey: 'sk-ant-secret',
  });
  const row = inserted[0] as Record<string, unknown>;
  expect(JSON.stringify(row)).not.toContain('sk-ant-secret');
  expect(row.apiKey).toBeUndefined();
});
