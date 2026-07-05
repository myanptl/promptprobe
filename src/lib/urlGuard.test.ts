import { isSafeTargetUrl } from './urlGuard';

test('accepts public https endpoints', () => {
  expect(isSafeTargetUrl('https://api.openai.com/v1/chat/completions')).toBe(true);
  expect(isSafeTargetUrl('https://my-proxy.example.com/v1')).toBe(true);
});

test('rejects non-http(s) protocols', () => {
  expect(isSafeTargetUrl('file:///etc/passwd')).toBe(false);
  expect(isSafeTargetUrl('ftp://example.com')).toBe(false);
  expect(isSafeTargetUrl('gopher://example.com')).toBe(false);
});

test('rejects loopback and localhost', () => {
  expect(isSafeTargetUrl('http://localhost:3000')).toBe(false);
  expect(isSafeTargetUrl('http://127.0.0.1/')).toBe(false);
  expect(isSafeTargetUrl('http://[::1]/')).toBe(false);
});

test('rejects cloud metadata and link-local', () => {
  expect(isSafeTargetUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
});

test('rejects private RFC1918 ranges', () => {
  expect(isSafeTargetUrl('http://10.0.0.5/')).toBe(false);
  expect(isSafeTargetUrl('http://192.168.1.1/')).toBe(false);
  expect(isSafeTargetUrl('http://172.16.0.1/')).toBe(false);
  expect(isSafeTargetUrl('http://172.31.255.255/')).toBe(false);
});

test('allows 172.32 (outside the private block)', () => {
  expect(isSafeTargetUrl('http://172.32.0.1/')).toBe(true);
});

test('rejects .internal and .local hostnames', () => {
  expect(isSafeTargetUrl('http://db.internal/')).toBe(false);
  expect(isSafeTargetUrl('http://printer.local/')).toBe(false);
});

test('rejects malformed input', () => {
  expect(isSafeTargetUrl('not a url')).toBe(false);
  expect(isSafeTargetUrl('')).toBe(false);
});
