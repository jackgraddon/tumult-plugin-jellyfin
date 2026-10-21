/**
 * The player — one `<audio>` element, a queue, and a report to the server.
 *
 * The element lives in a **module singleton**, not in a component: playback
 * must survive the user walking between the library views (or in and out of
 * the pane), and a component's element dies with the component. The state is
 * reactive, so any view can draw the transport without owning it.
 *
 * The queue is **client-side**. Jellyfin has no server-side queue: playback is
 * a stream from the server, and the list of what comes next is this device's
 * business.
 */
import { reactive } from "vue";

import type { JellyfinClient } from "./client.ts";
import { currentClient } from "./session.ts";
import {
    secondsToTicks,
    type JellyfinBaseItemDto,
    type JellyfinQueueEntry,
} from "./types.ts";

export interface PlayerState {
    /** The track that is loaded. */
    current: JellyfinQueueEntry | null;
    /** Whether the element is playing right now. */
    playing: boolean;
    /** Position in the current track, in seconds. */
    position: number;
    /** Duration of the current track, in seconds. */
    duration: number;
    /** Volume, 0–1. */
    volume: number;
    /** What is queued. */
    queue: JellyfinQueueEntry[];
    /** Where in the queue the current track sits. */
    index: number;
    /** The last failure, in a sentence. */
    error: string | null;
    /** Whether the server is transcoding the stream. */
    transcoding: boolean;
    /** Whether the queue panel is open (the footer owns the flag). */
    queueOpen: boolean;
}

const state = reactive<PlayerState>({
    current: null,
    playing: false,
    position: 0,
    duration: 0,
    volume: 1,
    queue: [],
    index: -1,
    error: null,
    transcoding: false,
    queueOpen: false,
});

/** The element, created on first use. */
let audio: HTMLAudioElement | null = null;

/** The reporting timer, while a track is playing. */
let reportTimer: ReturnType<typeof setInterval> | null = null;

/** The play session the server gave us for the current track. */
let playSessionId: string | undefined;

/** How often the server is told where we are. */
const REPORT_INTERVAL_MS = 10_000;

/** The element, created on first use and wired once. */
function element(): HTMLAudioElement {
    if (audio) return audio;
    const created = document.createElement("audio");
    created.preload = "none";
    created.addEventListener("timeupdate", () => {
        state.position = created.currentTime;
    });
    created.addEventListener("durationchange", () => {
        state.duration = Number.isFinite(created.duration) ? created.duration : 0;
    });
    created.addEventListener("play", () => {
        state.playing = true;
        startReporting();
    });
    created.addEventListener("pause", () => {
        state.playing = false;
        stopReporting();
        void report("Progress");
    });
    created.addEventListener("ended", () => {
        state.playing = false;
        stopReporting();
        void report("Stopped");
        void player.playAt(state.index + 1);
    });
    created.addEventListener("error", () => {
        state.playing = false;
        state.error = "Playback failed. The server may not be able to play this file.";
    });
    audio = created;
    return created;
}

/** The playable state of the player. */
export const player = {
    /** The reactive state. */
    state,
    /** Replace the queue and start at `index`. */
    async setQueue(items: JellyfinBaseItemDto[], index = 0): Promise<void> {
        state.queue = items.map((item) => ({ id: item.Id, item }));
        state.index = -1;
        await this.playAt(index);
    },
    /** Add items to the end of the queue. */
    enqueue(items: JellyfinBaseItemDto[]): void {
        for (const item of items) {
            state.queue.push({ id: item.Id, item });
        }
    },
    /** Remove one item from the queue. */
    remove(id: string): void {
        const at = state.queue.findIndex((entry) => entry.id === id);
        if (at < 0) return;
        const isCurrent = at === state.index;
        state.queue.splice(at, 1);
        if (isCurrent) {
            state.index = Math.min(state.index, state.queue.length - 1);
            void this.playAt(state.index);
        } else if (at < state.index) {
            state.index -= 1;
        }
    },
    /** Empty the queue and stop. */
    clear(): void {
        this.stop();
        state.queue = [];
        state.index = -1;
        state.current = null;
    },
    /** Play the track at `index` in the queue. */
    async playAt(index: number): Promise<void> {
        const entry = state.queue[index];
        if (!entry) {
            this.stop();
            return;
        }
        state.index = index;
        state.current = entry;
        state.position = 0;
        state.duration = 0;
        state.error = null;

        const client = currentClient();
        if (!client) {
            state.error = "Not connected to a server.";
            return;
        }

        let url: string;
        try {
            const resolved = await resolveStream(client, entry.item);
            url = resolved.url;
            state.transcoding = resolved.transcoding;
            playSessionId = resolved.playSessionId;
        } catch (error) {
            state.error = error instanceof Error ? error.message : String(error);
            return;
        }

        const el = element();
        el.src = url;
        el.volume = state.volume;
        try {
            await el.play();
            await report("Playing");
        } catch (error) {
            state.error = error instanceof Error ? error.message : String(error);
        }
    },
    /** Play or pause. */
    async toggle(): Promise<void> {
        const el = element();
        if (!state.current) {
            if (state.queue.length > 0) await this.playAt(0);
            return;
        }
        if (el.paused) {
            try {
                await el.play();
            } catch (error) {
                state.error = error instanceof Error ? error.message : String(error);
            }
        } else {
            el.pause();
        }
    },
    /** The next track in the queue. */
    async next(): Promise<void> {
        await this.playAt(state.index + 1);
    },
    /** The previous track in the queue. */
    async previous(): Promise<void> {
        // Restart the track first, like every other player does.
        if (state.position > 3) {
            const el = element();
            el.currentTime = 0;
            state.position = 0;
            return;
        }
        await this.playAt(Math.max(0, state.index - 1));
    },
    /** Jump to a position, in seconds. */
    seek(seconds: number): void {
        const el = element();
        el.currentTime = Math.max(0, Math.min(seconds, state.duration || seconds));
        state.position = el.currentTime;
    },
    /** Set the volume, 0–1. */
    setVolume(volume: number): void {
        state.volume = Math.max(0, Math.min(1, volume));
        if (audio) audio.volume = state.volume;
    },
    /** Stop and unload. */
    stop(): void {
        stopReporting();
        if (audio) {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
        }
        state.playing = false;
        state.position = 0;
        state.duration = 0;
    },
};

/** Ask the server how to play this item: direct play, or a transcode. */
async function resolveStream(
    client: JellyfinClient,
    item: JellyfinBaseItemDto,
): Promise<{ url: string; transcoding: boolean; playSessionId: string | undefined }> {
    let direct = true;
    let transcodingUrl: string | null = null;
    let session: string | undefined;

    try {
        const info = await client.getPlaybackInfo(item.Id);
        const source = info.MediaSources?.[0];
        session = info.PlaySessionId;
        if (source && source.SupportsDirectPlay === false) {
            direct = false;
            transcodingUrl = source.TranscodingUrl ?? null;
        }
    } catch {
        // A server that will not answer still often serves a direct stream.
        direct = true;
    }

    if (direct) return { url: client.streamUrl(item), transcoding: false, playSessionId: session };
    if (!transcodingUrl) {
        throw new Error("The server cannot play this file, directly or by transcoding it.");
    }

    // The transcoding URL is server-relative and does not carry the token
    // (our request used a header, not a query parameter).
    const absolute = /^https?:\/\//i.test(transcodingUrl)
        ? transcodingUrl
        : `${client.baseUrl}${transcodingUrl.startsWith("/") ? "" : "/"}${transcodingUrl}`;
    return { url: client.withToken(absolute), transcoding: true, playSessionId: session };
}

/** The body every playback report carries. */
function reportBody(): Record<string, unknown> {
    const client = currentClient();
    return {
        ItemId: state.current?.id ?? "",
        MediaSourceId: state.current?.id ?? "",
        PlaySessionId: playSessionId ?? state.current?.id ?? "",
        PositionTicks: secondsToTicks(state.position),
        IsPaused: !state.playing,
        IsMuted: state.volume === 0,
        PlayMethod: state.transcoding ? "Transcode" : "DirectPlay",
        RepeatMode: "RepeatNone",
        VolumeLevel: Math.round(state.volume * 100),
        CanSeek: true,
        AudioStreamIndex: 1,
        NowPlayingQueueLength: state.queue.length,
        NowPlayingQueueIndex: state.index,
    };
}

/** Tell the server where playback is. Failures are not worth surfacing. */
async function report(kind: "Playing" | "Progress" | "Stopped"): Promise<void> {
    const client = currentClient();
    if (!client || !state.current) return;
    const body = reportBody();
    try {
        if (kind === "Playing") await client.reportPlaying(body);
        else if (kind === "Progress") await client.reportProgress(body);
        else await client.reportStopped(body);
    } catch {
        // The server not hearing about playback must not stop playback.
    }
}

/** Start telling the server where we are. */
function startReporting(): void {
    stopReporting();
    reportTimer = setInterval(() => {
        void report("Progress");
    }, REPORT_INTERVAL_MS);
}

/** Stop telling the server where we are. */
function stopReporting(): void {
    if (reportTimer !== null) {
        clearInterval(reportTimer);
        reportTimer = null;
    }
}

/** Seconds → `m:ss` (or `h:mm:ss`). */
export function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
}
