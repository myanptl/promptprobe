import ipaddr from 'ipaddr.js';

/**
 * SSRF guard for user-supplied target endpoints. Rejects anything that isn't a
 * public HTTP(S) URL: blocks loopback, private, link-local, unique-local,
 * unspecified, reserved, and cloud-metadata hosts — including IPv4-mapped IPv6
 * (`::ffff:a.b.c.d`) and the `::` wildcard.
 *
 * This does not defeat DNS rebinding (a public name resolving to a private IP).
 * Combine with `redirect: 'manual'` and, ideally, resolved-IP pinning at the
 * network layer for defense in depth.
 */

// Only these IP ranges are treated as safe to reach.
const SAFE_IPV4_RANGES = new Set(['unicast']);
const SAFE_IPV6_RANGES = new Set(['unicast']);

function isSafeIp(host: string): boolean {
  if (!ipaddr.isValid(host)) return false;
  let addr = ipaddr.parse(host);

  // Collapse IPv4-mapped IPv6 (::ffff:1.2.3.4) down to the embedded IPv4.
  if (addr.kind() === 'ipv6') {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      addr = v6.toIPv4Address();
    }
  }

  return addr.kind() === 'ipv4'
    ? SAFE_IPV4_RANGES.has(addr.range())
    : SAFE_IPV6_RANGES.has(addr.range());
}

export function isSafeTargetUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  // url.hostname keeps brackets for IPv6 literals; strip them for parsing.
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host) return false;

  // IP literal → validate its range.
  if (ipaddr.isValid(host)) return isSafeIp(host);

  // Hostname → block obvious internal names. (Public names that resolve to
  // private IPs are out of scope here; see the module doc on DNS rebinding.)
  if (host === 'localhost') return false;
  if (host.endsWith('.local') || host.endsWith('.internal')) return false;

  return true;
}
