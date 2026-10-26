/**
 * What the plugin remembers of a library between requests.
 *
 * Navigating between Home, Artists, Albums and Playlists should not re-download
 * what a request a moment ago already returned, and a large library should not
 * be re-fetched on every page. This module is the single place that decides
 * "have we fetched this already, and may we hand back the copy we keep?" so the
 * client itself stays a thin wrapper over the network.
 *
 * It is an **LRU, capped in bytes** — a full library is large, and
 * `localStorage` is a per-origin bucket *shared with the host app*, so an
 * unbounded cache would crowd it out. It is **cleared when the connection is**
 * (a forgotten server should not leave its lists behind), and the Settings
 * surface can read its size and empty it.
 *
 * What it holds is *library metadata* — the shape of the user's own library —
 * nothing that leaves this browser on its own: not the password (exchanged once
 * for a token, which `config.ts` keeps) and not the queue.
 */

/** Where the cache lives. */
const CACHE_KEY = "cc.jackgraddon.tumult.jellyfin.cache";

/** The cap, in bytes. A fifth of a 5 MB origin, shared with the host app. */
const MAX_BYTES = 2 * 1024 * 1024;

/** How long in-memory edits wait before being flushed to disk. */
const FLUSH_DELAY_MS = 500;

/** One cached response, with the timestamp that drives the LRU. */
interface Entry {
    ts: number;
    value: unknown;
    bytes: number;
}

/** The on-disk shape: the in-memory timestamps, kept for the LRU on reload. */
interface Persisted {
    [key: string]: { ts: number; value: unknown };
}

let entries = new Map<string, Entry>();
let totalBytes = 0;
let hydrated = false;

/** A request the same URL is already in flight, so a duplicate can ride it. */
const inflight = new Map<string, Promise<unknown>>();

/** The timer backing the debounced write to disk. */
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Local storage, when the browser has it and it is usable. */
function storage(): Storage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        // Some privacy modes throw on access rather than returning null.
        return null;
    }
}

/** The byte size of a value, for the cap — the size it takes on disk. */
function byteSize(value: unknown): number {
    try {
        return new Blob([JSON.stringify(value)]).size;
    } catch {
        // A value that will not serialize is one we cannot cache.
        return JSON.stringify(value ?? null)?.length ?? 0;
    }
}

/** Pull the on-disk cache back into memory, once. */
function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    const store = storage();
    if (!store) return;
    try {
        const raw = store.getItem(CACHE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Persisted;
        for (const key of Object.keys(parsed)) {
            const stored = parsed[key];
            if (!stored || stored.value === undefined) continue;
            // Re-measure from the value on reload: the disk holds no size.
            totalBytes += 0;
            place(key, stored.ts ?? 0, stored.value, byteSize(stored.value));
        }
    } catch {
        // A corrupt or oversized cache is not worth keeping.
        entries = new Map();
        totalBytes = 0;
    }
}

/** Put an entry, evicting the least-recently-used until it fits. */
function place(key: string, ts: number, value: unknown, bytes: number): boolean {
    const existing = entries.get(key);
    if (existing) {
        totalBytes -= existing.bytes;
        entries.delete(key);
    }
    // Free the least-recently-used entries until this one fits. A value larger
    // than the whole cap simply is not cacheable, and that is the limit.
    while (totalBytes + bytes > MAX_BYTES) {
        const old = oldestKey();
        if (old === null) return false;
        totalBytes -= entries.get(old)!.bytes;
        entries.delete(old);
    }
    entries.set(key, { ts, value, bytes });
    totalBytes += bytes;
    scheduleFlush();
    return true;
}

/** The key to evict next — the one most long-ago accessed. */
function oldestKey(): string | null {
    let key: string | null = null;
    let oldest = Infinity;
    for (const [k, entry] of entries) {
        if (entry.ts < oldest) {
            oldest = entry.ts;
            key = k;
        }
    }
    return key;
}

/** Defer the write to disk until the flurry of edits settles. */
function scheduleFlush(): void {
    if (flushTimer !== null) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
        flushTimer = null;
        flush();
    }, FLUSH_DELAY_MS);
}

/** Write the in-memory cache to disk. Failures are not worth surfacing. */
function flush(): void {
    const store = storage();
    if (!store) return;
    try {
        const payload: Persisted = {};
        for (const [key, entry] of entries) {
            payload[key] = { ts: entry.ts, value: entry.value };
        }
        store.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
        // Quota, or a store that blocks writes: the in-memory copy still
        // serves this session.
    }
}

/** Flush at once, before the tab goes away. */
if (typeof globalThis.addEventListener === "function") {
    try {
        globalThis.addEventListener("beforeunload", flush, { once: true });
    } catch {
        // Some contexts forbid the listener; the debounce already fired.
    }
}

/** The cache the client talks to. */
export const cache = {
    /** A previously fetched response for this key, or undefined. */
    get<T>(key: string): T | undefined {
        hydrate();
        const found = entries.get(key);
        if (!found) return undefined;
        // A read makes this the most-recently-used. Not flushed here — the next
        // write persists the new order, and a read that stands alone is worth
        // far less than a 2 MB stringify on every one.
        found.ts = Date.now();
        return found.value as T;
    },

    /** Remember a response for this key. */
    set<T>(key: string, value: T): void {
        hydrate();
        place(key, Date.now(), value, byteSize(value));
    },

    /** The in-memory cache, in bytes — what the Settings surface shows. */
    bytes(): number {
        hydrate();
        return totalBytes;
    },

    /** Drop everything: the in-memory copy and what is on disk. */
    clear(): void {
        entries = new Map();
        totalBytes = 0;
        hydrated = false;
        const store = storage();
        if (store) {
            try {
                store.removeItem(CACHE_KEY);
            } catch {
                // Nothing to do — the in-memory copy is already emptied.
            }
        }
    },

    /** The in-flight promise for this key, if a request for it is racing in. */
    inflight<T>(key: string): Promise<T> | undefined {
        return inflight.get(key) as Promise<T> | undefined;
    },

    /** Note a request for this key as in flight, so a duplicate can ride it. */
    setInflight<T>(key: string, promise: Promise<T>): void {
        inflight.set(key, promise);
    },

    /** Release the in-flight slot once the request settles. */
    dropInflight(key: string): void {
        inflight.delete(key);
    },

    /** Human-readable size, for the Settings surface. */
    humanBytes(): string {
        return formatBytes(this.bytes());
    },
};

/**
 * Format a byte count for the screen. A standalone function because the cache's
 * own number is not reactive; the Settings surface feeds it a reactive copy so
 * the figure moves when the cache changes.
 */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
