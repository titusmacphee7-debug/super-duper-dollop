import { lookup } from "node:dns/promises";
import net from "node:net";
import { BadRequestError } from "@/lib/core/errors";

/**
 * SSRF guard for user-supplied scrape URLs. The fetcher is the only code that touches the
 * network, and `POST /api/wishlist/scrape` hands it an arbitrary pasted URL — so before we
 * fetch one, reject anything that points at the loopback, link-local (cloud metadata at
 * 169.254.169.254), or private/reserved address space.
 *
 * NOTE: this checks the host's resolved addresses at call time; it does not defend against
 * DNS-rebinding (TOCTOU) between this check and the actual fetch. For that, route through a
 * vetted egress proxy (SCRAPER_PROVIDER) in production.
 */
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true; // this-host, private, loopback
    if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
    if (lower === "::1" || lower === "::") return true; // loopback / unspecified
    if (lower.startsWith("fe80")) return true; // link-local
    if (/^f[cd]/.test(lower)) return true; // unique-local fc00::/7
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  return false;
}

/** Throws BadRequestError (-> HTTP 400) when `raw` is not a fetchable public http(s) URL. */
export async function assertPublicHttpUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestError("invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BadRequestError("only http(s) URLs are supported");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new BadRequestError("URL host is not allowed");
    return;
  }
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new BadRequestError("URL host is not allowed");
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new BadRequestError("could not resolve URL host");
  }
  if (addresses.some((a) => isPrivateIp(a.address))) {
    throw new BadRequestError("URL resolves to a private address");
  }
}
