import { createHash } from "node:crypto";
import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

/**
 * Minimal KV surface so callers never care which backend is live.
 * - Upstash REST client when UPSTASH_REDIS_REST_URL/TOKEN are set (serverless-friendly).
 * - Local ioredis (REDIS_URL) otherwise — same client BullMQ uses.
 */
export interface Kv {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

const globalForKv = globalThis as unknown as { __wbKv?: Kv };

function buildKv(): Kv {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    const client = new UpstashRedis({ url: upstashUrl, token: upstashToken });
    return {
      async get(key) {
        return (await client.get<string>(key)) ?? null;
      },
      async set(key, value, ttlSeconds) {
        if (ttlSeconds) await client.set(key, value, { ex: ttlSeconds });
        else await client.set(key, value);
      },
      async del(key) {
        await client.del(key);
      },
    };
  }

  const client = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  return {
    async get(key) {
      return client.get(key);
    },
    async set(key, value, ttlSeconds) {
      if (ttlSeconds) await client.set(key, value, "EX", ttlSeconds);
      else await client.set(key, value);
    },
    async del(key) {
      await client.del(key);
    },
  };
}

export function kv(): Kv {
  return (globalForKv.__wbKv ??= buildKv());
}

/** Stable cache key from any string (e.g. a URL). */
export function hashKey(prefix: string, raw: string): string {
  return `${prefix}:${createHash("sha1").update(raw).digest("hex")}`;
}

// ---------- JSON cache helpers ----------
export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await kv().get(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  await kv().set(key, JSON.stringify(value), ttlSeconds);
}

/** Read-through cache: return cached value or compute, store, and return it. */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGetJson<T>(key);
  if (cached != null) return cached;
  const fresh = await compute();
  await cacheSetJson(key, fresh, ttlSeconds);
  return fresh;
}

export const CACHE_TTL = {
  /** scrape result keyed by URL hash */
  scrape: 60 * 60, // 1h
  /** cross-retailer search keyed by normalizedModel:retailer */
  search: 2 * 60 * 60, // 2h
} as const;
