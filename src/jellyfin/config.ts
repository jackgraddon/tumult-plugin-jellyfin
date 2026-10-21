/**
 * What the plugin remembers between visits.
 *
 * The password is **never** stored: it is exchanged for a token at sign-in
 * and then forgotten. What is kept is the server address, the token, the
 * account it belongs to, and a device id (so the server sees one device
 * rather than a new one on every visit).
 *
 * Storage is local storage, which is per-browser and readable by anything
 * running on this origin — the same trust the app itself runs under.
 */

/** Where the connection lives. */
const STORAGE_KEY = "cc.jackgraddon.tumult.jellyfin.config";

/** Where the device id lives (kept apart so it survives a re-auth). */
const DEVICE_KEY = "cc.jackgraddon.tumult.jellyfin.device";

export type JellyfinAuthMethod = "password" | "apiKey";

export interface JellyfinConfig {
    /** The server's root address, normalized. */
    baseUrl: string;
    /** The access token (a user token, or an API key). */
    token: string;
    /** The account the token belongs to. */
    userId: string;
    /** The account's name, for the sidebar. */
    userName: string;
    /** This installation's device id. */
    deviceId: string;
    /** How the token was obtained — shown in the sidebar. */
    authMethod: JellyfinAuthMethod;
}

/** Local storage, when the browser has it and it is usable. */
function storage(): Storage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        // Some privacy modes throw on access rather than returning null.
        return null;
    }
}

/** Read the saved connection, or null. */
export function loadConfig(): JellyfinConfig | null {
    const store = storage();
    if (!store) return null;
    try {
        const raw = store.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<JellyfinConfig>;
        if (typeof parsed.baseUrl !== "string" || typeof parsed.token !== "string") return null;
        return {
            baseUrl: parsed.baseUrl,
            token: parsed.token,
            userId: typeof parsed.userId === "string" ? parsed.userId : "",
            userName: typeof parsed.userName === "string" ? parsed.userName : "",
            deviceId: typeof parsed.deviceId === "string" ? parsed.deviceId : "",
            authMethod: parsed.authMethod === "apiKey" ? "apiKey" : "password",
        };
    } catch {
        return null;
    }
}

/** Save the connection. */
export function saveConfig(config: JellyfinConfig): void {
    const store = storage();
    if (!store) return;
    try {
        store.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
        // A full or blocked storage must not break playback.
    }
}

/** Forget the connection. */
export function clearConfig(): void {
    const store = storage();
    if (!store) return;
    try {
        store.removeItem(STORAGE_KEY);
    } catch {
        // Nothing to do — the session is still forgotten in memory.
    }
}

/** A stable id for this installation, so the server sees one device. */
export function deviceId(): string {
    const store = storage();
    if (store) {
        try {
            const existing = store.getItem(DEVICE_KEY);
            if (existing) return existing;
        } catch {
            // Fall through and make a fresh one.
        }
    }
    const generated =
        typeof globalThis.crypto?.randomUUID === "function"
            ? globalThis.crypto.randomUUID()
            : `tumult-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    if (store) {
        try {
            store.setItem(DEVICE_KEY, generated);
        } catch {
            // A device id that changes per visit is annoying, not fatal.
        }
    }
    return generated;
}
