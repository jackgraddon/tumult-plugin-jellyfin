/**
 * Where the connection lives.
 *
 * A small module of its own so the player and the store can both reach the
 * server without importing each other: the store talks to the player, and the
 * player reports playback back to the server.
 *
 * The token lives here and in `config.ts` (local storage) — never the
 * password. A password is used once, to exchange for a token, and then
 * forgotten.
 */
import type { JellyfinClient } from "./client.ts";
import type { JellyfinUserDto } from "./types.ts";

let client: JellyfinClient | null = null;
let user: JellyfinUserDto | null = null;

/** The connected client, or null. */
export function currentClient(): JellyfinClient | null {
    return client;
}

/** The signed-in user, or null. */
export function currentUser(): JellyfinUserDto | null {
    return user;
}

/** Remember the connection. */
export function setSession(nextClient: JellyfinClient, nextUser: JellyfinUserDto | null): void {
    client = nextClient;
    user = nextUser;
}

/** Forget the connection (and the token it carried). */
export function clearSession(): void {
    client = null;
    user = null;
}
