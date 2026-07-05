/**
 * SSRF guard for user-supplied target endpoints. Rejects anything that isn't a
 * public HTTP(S) URL: blocks loopback, private, link-local, and metadata hosts
 * by literal. This does not defeat DNS rebinding (a public name resolving to a
 * private IP) — for that, combine with `redirect: 'manual'` and, ideally,
 * resolved-IP pinning at the network layer.
 */

const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0', '[::1]', '::1']);

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 0) return true; // 0.0.0.0/8
  return false;
}

export function isSafeTargetUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (isPrivateIpv4(host)) return false;
  // IPv6 unique-local / link-local literals.
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return false;

  return true;
}
