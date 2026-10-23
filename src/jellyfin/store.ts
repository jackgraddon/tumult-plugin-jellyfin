/**
 * The plugin's state — what is connected, what is loaded, where the user is.
 *
 * A module singleton, like the player: the pane's components mount and
 * unmount as the user walks around, but the connection and the library must
 * not. Everything here is reactive, so a component only has to read what it
 * draws.
 */
import { reactive } from "vue";

import { player } from "./audio.ts";
import { JellyfinClient, normalizeBaseUrl, schemeProblem } from "./client.ts";
import {
    clearConfig,
    deviceId,
    loadConfig,
    saveConfig,
    type JellyfinAuthMethod,
} from "./config.ts";
import { clearSession, currentClient, setSession } from "./session.ts";
import type { JellyfinBaseItemDto, JellyfinUserDto } from "./types.ts";

/** The sections of the left nav. */
export type JellyfinView = "home" | "artists" | "albums" | "playlists";

export interface JellyfinState {
    /** Which section the content area is showing. */
    view: JellyfinView;
    /** Whether a server is connected. */
    connected: boolean;
    /** Whether something is loading right now. */
    busy: boolean;
    /** The last failure, in a sentence. */
    error: string | null;
    /** The address the connect form starts with (a saved one, or the last tried). */
    address: string;
    /** The server's name, once we know it. */
    serverName: string | null;
    /** The account in use. */
    userName: string | null;
    /** How the token was obtained. */
    authMethod: JellyfinAuthMethod | null;
    /** Accounts an API key can see, when there is more than one. */
    availableUsers: JellyfinUserDto[];
    /** The artist whose albums are being shown, if any. */
    artistId: string | null;
    /** The album whose tracks are being shown, if any. */
    albumId: string | null;
    /** The playlist whose tracks are being shown, if any. */
    playlistId: string | null;
    /** The heading of the content area. */
    title: string;
    /** The shelves on the home page. */
    recentPlayed: JellyfinBaseItemDto[];
    recentAdded: JellyfinBaseItemDto[];
    favourites: JellyfinBaseItemDto[];
    /** The artists. */
    artists: JellyfinBaseItemDto[];
    /** The albums (all of them, or the ones of the selected artist). */
    albums: JellyfinBaseItemDto[];
    /** The playlists. */
    playlists: JellyfinBaseItemDto[];
    /** The tracks of the open album or playlist. */
    tracks: JellyfinBaseItemDto[];
}

const state = reactive<JellyfinState>({
    view: "home",
    connected: false,
    busy: false,
    error: null,
    address: "",
    serverName: null,
    userName: null,
    authMethod: null,
    availableUsers: [],
    artistId: null,
    albumId: null,
    playlistId: null,
    title: "Home",
    recentPlayed: [],
    recentAdded: [],
    favourites: [],
    artists: [],
    albums: [],
    playlists: [],
    tracks: [],
});

/** The headings the sections use. */
const TITLES: Record<JellyfinView, string> = {
    home: "Home",
    artists: "Artists",
    albums: "Albums",
    playlists: "Playlists",
};

/** An API key waiting for the user to say which account it should be. */
let pendingApiKey: { baseUrl: string; token: string; deviceId: string } | null = null;

/** Whether the remembered connection has already been tried. */
let restored = false;

/** The plugin's public surface, shared by every component. */
export const jellyfin = {
    /** The reactive state. */
    state,

    /**
     * Reconnect from what was remembered. Called once, when the pane first
     * appears; a failure is not an error the user needs to see — the connect
     * form is the answer either way.
     */
    async restore(): Promise<void> {
        if (restored) return;
        restored = true;
        const config = loadConfig();
        if (!config) return;
        const problem = schemeProblem(config.baseUrl);
        if (problem) {
            // The saved address cannot be reached from this page (an HTTPS
            // app cannot talk to plain HTTP). Keep it in the form so switching
            // to https:// is one edit, and say why instead of failing silently.
            state.address = config.baseUrl;
            state.error = problem;
            return;
        }
        try {
            const client = new JellyfinClient({
                baseUrl: config.baseUrl,
                token: config.token,
                userId: config.userId,
                deviceId: config.deviceId || deviceId(),
            });
            setSession(client, {
                Id: config.userId,
                Name: config.userName,
            });
            state.connected = true;
            state.userName = config.userName;
            state.authMethod = config.authMethod;
            state.serverName = await serverName(config.baseUrl);
            await loadHome();
        } catch {
            // The server moved, the token expired, the network is down — the
            // connect form says so.
            resetConnection();
        }
    },

    /** Sign in with a password. */
    async connectWithPassword(baseUrl: string, username: string, password: string): Promise<void> {
        const normalized = normalizeBaseUrl(baseUrl);
        state.address = normalized;
        if (normalized === "") {
            state.error = "Enter the address of your Jellyfin server.";
            return;
        }
        const problem = schemeProblem(normalized);
        if (problem) {
            state.error = problem;
            return;
        }
        state.busy = true;
        state.error = null;
        try {
            const id = deviceId();
            const auth = await JellyfinClient.authenticate(normalized, username, password, id);
            const client = new JellyfinClient({
                baseUrl: normalized,
                token: auth.AccessToken,
                userId: auth.User.Id,
                deviceId: id,
            });
            setSession(client, auth.User);
            await finish(client, auth.User, normalized, auth.AccessToken, id, "password");
        } catch (error) {
            state.error = describe(error, "Could not sign in.");
        } finally {
            state.busy = false;
        }
    },

    /** Sign in with an API key. */
    async connectWithApiKey(baseUrl: string, apiKey: string): Promise<void> {
        const normalized = normalizeBaseUrl(baseUrl);
        state.address = normalized;
        if (normalized === "") {
            state.error = "Enter the address of your Jellyfin server.";
            return;
        }
        const problem = schemeProblem(normalized);
        if (problem) {
            state.error = problem;
            return;
        }
        state.busy = true;
        state.error = null;
        try {
            const id = deviceId();
            const users = await JellyfinClient.listUsers(normalized, apiKey.trim(), id);
            if (users.length === 0) {
                state.error = "That API key cannot see any account on this server.";
                return;
            }
            state.availableUsers = users;
            if (users.length > 1) {
                // More than one account: ask which one, rather than guessing.
                pendingApiKey = { baseUrl: normalized, token: apiKey.trim(), deviceId: id };
                return;
            }
            const user = users[0];
            if (!user) return;
            const client = new JellyfinClient({
                baseUrl: normalized,
                token: apiKey.trim(),
                userId: user.Id,
                deviceId: id,
            });
            setSession(client, user);
            await finish(client, user, normalized, apiKey.trim(), id, "apiKey");
        } catch (error) {
            state.error = describe(error, "Could not use that API key.");
        } finally {
            state.busy = false;
        }
    },

    /** Finish an API-key sign-in by choosing the account. */
    async connectAsUser(user: JellyfinUserDto): Promise<void> {
        if (!pendingApiKey) return;
        const { baseUrl, token, deviceId: id } = pendingApiKey;
        state.busy = true;
        state.error = null;
        try {
            const client = new JellyfinClient({
                baseUrl,
                token,
                userId: user.Id,
                deviceId: id,
            });
            setSession(client, user);
            pendingApiKey = null;
            state.availableUsers = [];
            await finish(client, user, baseUrl, token, id, "apiKey");
        } catch (error) {
            state.error = describe(error, "Could not sign in.");
        } finally {
            state.busy = false;
        }
    },

    /** Forget the server. */
    disconnect(): void {
        resetConnection();
    },

    /** Switch section. */
    async setView(view: JellyfinView): Promise<void> {
        state.view = view;
        state.artistId = null;
        state.albumId = null;
        state.playlistId = null;
        state.title = TITLES[view];
        if (view === "home") await loadHome();
        else if (view === "artists") await loadArtists();
        else if (view === "albums") await loadAlbums();
        else if (view === "playlists") await loadPlaylists();
    },

    /** Show one artist's albums. */
    async openArtist(artist: JellyfinBaseItemDto): Promise<void> {
        state.view = "albums";
        state.artistId = artist.Id;
        state.albumId = null;
        state.playlistId = null;
        state.title = artist.Name;
        state.busy = true;
        state.error = null;
        try {
            state.albums = (await client()?.getArtistAlbums(artist.Id)) ?? [];
        } catch (error) {
            state.error = describe(error, "Could not load that artist's albums.");
        } finally {
            state.busy = false;
        }
    },

    /** Show one album's tracks. */
    async openAlbum(album: JellyfinBaseItemDto): Promise<void> {
        state.albumId = album.Id;
        state.playlistId = null;
        state.title = album.Name;
        state.busy = true;
        state.error = null;
        try {
            state.tracks = (await client()?.getAlbumTracks(album.Id)) ?? [];
        } catch (error) {
            state.error = describe(error, "Could not load that album.");
        } finally {
            state.busy = false;
        }
    },

    /** Show one playlist's tracks. */
    async openPlaylist(playlist: JellyfinBaseItemDto): Promise<void> {
        state.playlistId = playlist.Id;
        state.albumId = null;
        state.title = playlist.Name;
        state.busy = true;
        state.error = null;
        try {
            state.tracks = (await client()?.getPlaylistItems(playlist.Id)) ?? [];
        } catch (error) {
            state.error = describe(error, "Could not load that playlist.");
        } finally {
            state.busy = false;
        }
    },

    /** Step back out of a detail view. */
    async back(): Promise<void> {
        if (state.albumId !== null || state.playlistId !== null) {
            state.albumId = null;
            state.playlistId = null;
            const artist = state.artistId === null ? undefined : findArtist(state.artistId);
            state.title = artist?.Name ?? TITLES[state.view];
            return;
        }
        if (state.artistId !== null) {
            state.artistId = null;
            state.title = TITLES.albums;
            await loadAlbums();
        }
    },

    /** Play a track, queueing the album or playlist it came from. */
    async play(item: JellyfinBaseItemDto, context: JellyfinBaseItemDto[] = []): Promise<void> {
        const queue = context.length > 0 ? context : state.tracks.length > 0 ? state.tracks : [item];
        const index = Math.max(
            0,
            queue.findIndex((entry) => entry.Id === item.Id),
        );
        await player.setQueue(queue, index);
    },
};

/** The connected client, or null. */
function client(): JellyfinClient | null {
    return currentClient();
}

/** Forget the server — the token, the library, the way back in. */
function resetConnection(): void {
    player.clear();
    clearSession();
    clearConfig();
    pendingApiKey = null;
    state.connected = false;
    state.userName = null;
    state.serverName = null;
    state.authMethod = null;
    state.address = "";
    state.availableUsers = [];
    state.artistId = null;
    state.albumId = null;
    state.playlistId = null;
    state.recentPlayed = [];
    state.recentAdded = [];
    state.favourites = [];
    state.artists = [];
    state.albums = [];
    state.playlists = [];
    state.tracks = [];
    state.view = "home";
    state.title = TITLES.home;
}

/** The artist with this id, if it has been loaded. */
function findArtist(id: string): JellyfinBaseItemDto | undefined {
    return state.artists.find((entry) => entry.Id === id);
}

/** Finish a sign-in: remember it, and load the first shelf. */
async function finish(
    client: JellyfinClient,
    user: JellyfinUserDto,
    baseUrl: string,
    token: string,
    id: string,
    method: JellyfinAuthMethod,
): Promise<void> {
    saveConfig({
        baseUrl,
        token,
        userId: user.Id,
        userName: user.Name,
        deviceId: id,
        authMethod: method,
    });
    state.connected = true;
    state.userName = user.Name;
    state.authMethod = method;
    state.error = null;
    try {
        state.serverName = await serverName(baseUrl);
    } catch {
        state.serverName = null;
    }
    await loadHome();
}

/** Ask the server its name. */
async function serverName(baseUrl: string): Promise<string | null> {
    try {
        const info = await JellyfinClient.publicInfo(baseUrl);
        return info.ServerName ?? info.ProductName ?? null;
    } catch {
        return null;
    }
}

/** Load the home shelves. */
async function loadHome(): Promise<void> {
    const api = client();
    if (!api) return;
    state.busy = true;
    state.error = null;
    try {
        const [played, added, favourites] = await Promise.all([
            api.getRecentlyPlayed(),
            api.getRecentlyAdded(),
            api.getFavourites(),
        ]);
        state.recentPlayed = played;
        state.recentAdded = added;
        state.favourites = favourites;
    } catch (error) {
        state.error = describe(error, "Could not load your library.");
    } finally {
        state.busy = false;
    }
}

/** Load the artists. */
async function loadArtists(): Promise<void> {
    const api = client();
    if (!api) return;
    state.busy = true;
    state.error = null;
    try {
        state.artists = await api.getArtists();
    } catch (error) {
        state.error = describe(error, "Could not load your artists.");
    } finally {
        state.busy = false;
    }
}

/** Load the albums. */
async function loadAlbums(): Promise<void> {
    const api = client();
    if (!api) return;
    state.busy = true;
    state.error = null;
    try {
        state.albums = await api.getAlbums();
    } catch (error) {
        state.error = describe(error, "Could not load your albums.");
    } finally {
        state.busy = false;
    }
}

/** Load the playlists. */
async function loadPlaylists(): Promise<void> {
    const api = client();
    if (!api) return;
    state.busy = true;
    state.error = null;
    try {
        state.playlists = await api.getPlaylists();
    } catch (error) {
        state.error = describe(error, "Could not load your playlists.");
    } finally {
        state.busy = false;
    }
}

/** Turn an unknown failure into a sentence. */
function describe(error: unknown, fallback: string): string {
    if (error instanceof TypeError) {
        // What `fetch` throws when the request never reached an answer: a
        // wrong address, a server that is down, or a network that cannot see
        // it. Name the likely cause without guessing at the browser's reason.
        return "Could not reach the server. Check the address, and that this device can reach it.";
    }
    if (error instanceof Error && error.message !== "") return error.message;
    return fallback;
}
