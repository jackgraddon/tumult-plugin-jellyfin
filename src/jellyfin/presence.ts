/**
 * The Matrix status line — "Listening to …" while a track plays.
 *
 * Tumult hands a plugin the shell's `ChatClient`, and that client can set our
 * own presence status (`client.setOwnPresence`). The status is a user-level
 * line — other Matrix clients show it beside our name — so this is how the
 * music leaks out of the pane: start a track and the room sees
 * "Listening to <song>"; stop, and the line goes away.
 *
 * The line is **derived** from the player's state rather than pushed at it:
 * one watcher, one truth. Whatever the transport does — play, pause, end, fail
 * — the status follows, because the status is a function of what is playing.
 * That way there is no second, drifting copy of "what is playing" to keep in
 * step with the player.
 */
import { watch } from "vue";

import type { ChatClient } from "@tumult/ui";

import { player } from "./audio.ts";

/** A status longer than this is a wall of text, not a status. */
const MAX_STATUS = 120;

/** The shell's client, once the plugin is installed. */
let client: ChatClient | null = null;

/** The line we last published — so we only speak when it changes. */
let published: string | null = null;

/**
 * Start publishing the status. Returns the teardown: it stops watching and
 * takes the line down.
 */
export function startPresence(shell: ChatClient): () => void {
    client = shell;
    published = null;
    const stop = watch(
        () => [player.state.playing, player.state.current?.id ?? null] as const,
        () => {
            void publish(statusFor());
        },
        // Sync: the line should follow the transport immediately, not a tick
        // later — the watcher is the only thing standing between "play" and
        // "the room sees it".
        { flush: "sync" },
    );
    return () => {
        stop();
        // Take the line down before letting go of the client: a
        // "Listening to …" left behind after the plugin is gone would be a
        // lie about what we are doing.
        void publish(null);
        client = null;
    };
}

/** The line for what is playing right now, or `null` when nothing is. */
function statusFor(): string | null {
    if (!player.state.playing) return null;
    const current = player.state.current;
    if (!current) return null;
    const name = current.item.Name.trim();
    if (name === "") return null;
    return clip(`Listening to ${name}`);
}

/** Cut a line down to something a status can carry. */
function clip(text: string): string {
    if (text.length <= MAX_STATUS) return text;
    return `${text.slice(0, MAX_STATUS - 1)}…`;
}

/** Say it to the homeserver. A failure is not worth surfacing. */
async function publish(next: string | null): Promise<void> {
    const shell = client;
    if (!shell) return;
    if (next === published) return;
    const previous = published;
    published = next;
    try {
        // No status text clears the status: the contract says so, and the
        // homeserver reads a presence without one as "no status".
        if (next === null) await shell.setOwnPresence("online");
        else await shell.setOwnPresence("online", next);
    } catch {
        // The homeserver may refuse presence (disabled, rate-limited, no
        // session yet). A missing status line must never stop the music — but
        // the line counts as unpublished, so the next change tries again.
        published = previous;
    }
}
