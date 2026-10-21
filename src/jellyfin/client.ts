/**
 * The Jellyfin API client — the only place that knows about HTTP.
 *
 * Three things make Jellyfin awkward, and each has a fix here:
 *
 *   - **Two ways in.** A password sign-in (`POST /Users/AuthenticateByName`)
 *     exchanges a password for a token; an API key is a token already. Both
 *     end up as the same `Authorization: MediaBrowser …` header.
 *   - **The token has to ride in the URL** for anything a browser fetches on
 *     its own — `<img src>`, `<audio src>`. A header cannot be attached to
 *     those, so the key travels as a query parameter. Jellyfin has spelled
 *     that parameter both `api_key` (10.x) and `ApiKey` (12), so both are
 *     sent; the server ignores the one it does not know.
 *   - **Everything is PascalCase.** The DTOs keep the server's names so
 *     nothing has to be translated on the way through.
 */
import type {
    JellyfinAuthResponse,
    JellyfinBaseItemDto,
    JellyfinImageType,
    JellyfinItemsResponse,
    JellyfinPlaybackInfo,
    JellyfinPublicSystemInfo,
    JellyfinUserDto,
} from "./types.ts";

export interface JellyfinClientOptions {
    /** The server's root, without a trailing slash. */
    baseUrl: string;
    /** The access token — a user token or an API key. */
    token: string;
    /** The user the requests are made as. Empty for an API-key session. */
    userId: string;
    /** A stable id for this installation (device id). */
    deviceId: string;
    clientName?: string;
    deviceName?: string;
    version?: string;
}

/** The client name sent to the server, so it can show something sensible. */
const CLIENT_NAME = "Tumult Jellyfin";
const DEVICE_NAME = "Tumult";
const CLIENT_VERSION = "1.0.0";

/** Trim a user-typed server address into something a URL can be built on. */
export function normalizeBaseUrl(input: string): string {
    const trimmed = input.trim();
    if (trimmed === "") return "";
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    return withScheme.replace(/\/+$/, "");
}

export class JellyfinClient {
    public readonly baseUrl: string;
    public readonly userId: string;

    private readonly token: string;
    private readonly deviceId: string;
    private readonly clientName: string;
    private readonly deviceName: string;
    private readonly version: string;

    public constructor(options: JellyfinClientOptions) {
        this.baseUrl = normalizeBaseUrl(options.baseUrl);
        this.token = options.token;
        this.userId = options.userId;
        this.deviceId = options.deviceId;
        this.clientName = options.clientName ?? CLIENT_NAME;
        this.deviceName = options.deviceName ?? DEVICE_NAME;
        this.version = options.version ?? CLIENT_VERSION;
    }

    // ---------------------------------------------------------------- URLs

    /** Build an absolute URL for an API path, with query parameters. */
    public url(path: string, params?: Record<string, string | number | undefined>): string {
        const url = new URL(`${this.baseUrl}${path}`);
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value === undefined) continue;
                url.searchParams.set(key, String(value));
            }
        }
        return url.toString();
    }

    /**
     * The same URL, with the token in the query string — for the requests a
     * browser makes on its own (`<img>`, `<audio>`), which cannot carry a
     * header.
     */
    public tokenizedUrl(path: string, params?: Record<string, string | number | undefined>): string {
        const merged: Record<string, string | number | undefined> = { ...params };
        // Jellyfin 10.x reads `api_key`; 12 reads `ApiKey`. Send both.
        merged["api_key"] = this.token;
        merged["ApiKey"] = this.token;
        return this.url(path, merged);
    }

    /** The artwork URL for an item. */
    public imageUrl(item: JellyfinBaseItemDto, type: JellyfinImageType = "Primary", maxWidth = 400): string {
        const tag = item.ImageTags?.[type === "Thumb" ? "Thumb" : type] ?? item.ImageTags?.Primary;
        return this.tokenizedUrl(`/Items/${encodeURIComponent(item.Id)}/Images/${type}`, {
            maxWidth,
            tag: tag ?? undefined,
        });
    }

    /** The direct-play stream URL for an item. */
    public streamUrl(item: JellyfinBaseItemDto): string {
        const kind = item.Type === "Video" || item.Type === "Movie" ? "Videos" : "Audio";
        return this.tokenizedUrl(`/${kind}/${encodeURIComponent(item.Id)}/stream`, { static: "true" });
    }

    /**
     * Add the token to a URL the browser will fetch on its own — the server
     * hands out a transcoding URL that does not carry it.
     */
    public withToken(url: string): string {
        const parsed = new URL(url);
        parsed.searchParams.set("api_key", this.token);
        parsed.searchParams.set("ApiKey", this.token);
        return parsed.toString();
    }

    // ------------------------------------------------------------ requests

    /** The `Authorization` header Jellyfin expects. */
    private authorization(): string {
        return (
            `MediaBrowser Client="${this.clientName}", Device="${this.deviceName}", ` +
            `DeviceId="${this.deviceId}", Version="${this.version}", Token="${this.token}"`
        );
    }

    /** Perform an API request and parse the JSON body. */
    public async request<T>(path: string, init?: RequestInit): Promise<T> {
        const headers = new Headers(init?.headers);
        headers.set("authorization", this.authorization());
        headers.set("accept", "application/json");
        if (init?.body !== undefined && !headers.has("content-type")) {
            headers.set("content-type", "application/json");
        }

        const response = await fetch(this.url(path), { ...init, headers });
        if (!response.ok) {
            throw new Error(await describeFailure(response));
        }
        if (response.status === 204) return undefined as T;
        const text = await response.text();
        if (text === "") return undefined as T;
        return JSON.parse(text) as T;
    }

    // ---------------------------------------------------------------- auth

    /** Ask a server who it is. Works without a token. */
    public static async publicInfo(baseUrl: string): Promise<JellyfinPublicSystemInfo> {
        const response = await fetch(`${normalizeBaseUrl(baseUrl)}/System/Info/Public`, {
            headers: { accept: "application/json" },
        });
        if (!response.ok) {
            throw new Error(await describeFailure(response));
        }
        return (await response.json()) as JellyfinPublicSystemInfo;
    }

    /** Exchange a password for a token. */
    public static async authenticate(
        baseUrl: string,
        username: string,
        password: string,
        deviceId: string,
    ): Promise<JellyfinAuthResponse> {
        const response = await fetch(`${normalizeBaseUrl(baseUrl)}/Users/AuthenticateByName`, {
            method: "POST",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                authorization:
                    `MediaBrowser Client="${CLIENT_NAME}", Device="${DEVICE_NAME}", ` +
                    `DeviceId="${deviceId}", Version="${CLIENT_VERSION}"`,
            },
            body: JSON.stringify({ Username: username, Pw: password }),
        });
        if (!response.ok) {
            throw new Error(await describeFailure(response));
        }
        return (await response.json()) as JellyfinAuthResponse;
    }

    /** The accounts an API key can see. */
    public static async listUsers(baseUrl: string, apiKey: string, deviceId: string): Promise<JellyfinUserDto[]> {
        const response = await fetch(`${normalizeBaseUrl(baseUrl)}/Users`, {
            headers: {
                accept: "application/json",
                authorization:
                    `MediaBrowser Client="${CLIENT_NAME}", Device="${DEVICE_NAME}", ` +
                    `DeviceId="${deviceId}", Version="${CLIENT_VERSION}", Token="${apiKey}"`,
            },
        });
        if (!response.ok) {
            throw new Error(await describeFailure(response));
        }
        const payload = (await response.json()) as JellyfinUserDto[];
        return Array.isArray(payload) ? payload : [];
    }

    // --------------------------------------------------------------- items

    /** Every artist in the library. */
    public async getArtists(): Promise<JellyfinBaseItemDto[]> {
        const response = await this.request<JellyfinItemsResponse>(
            `/Artists?UserId=${encodeURIComponent(this.userId)}`,
        );
        return response.Items ?? [];
    }

    /** Every album in the library. */
    public async getAlbums(): Promise<JellyfinBaseItemDto[]> {
        const response = await this.request<JellyfinItemsResponse>(
            `/Users/${encodeURIComponent(this.userId)}/Items` +
                `?IncludeItemTypes=Album&Recursive=true&SortBy=SortName&SortOrder=Ascending`,
        );
        return response.Items ?? [];
    }

    /** The albums of one artist. */
    public async getArtistAlbums(artistId: string): Promise<JellyfinBaseItemDto[]> {
        const response = await this.request<JellyfinItemsResponse>(
            `/Artists/${encodeURIComponent(artistId)}/Albums` +
                `?UserId=${encodeURIComponent(this.userId)}&SortBy=SortName&SortOrder=Ascending`,
        );
        return response.Items ?? [];
    }

    /** Every playlist in the library. */
    public async getPlaylists(): Promise<JellyfinBaseItemDto[]> {
        const response = await this.request<JellyfinItemsResponse>(
            `/Users/${encodeURIComponent(this.userId)}/Items` +
                `?IncludeItemTypes=Playlist&Recursive=true&SortBy=SortName&SortOrder=Ascending`,
        );
        return response.Items ?? [];
    }

    /** The items of one playlist. */
    public async getPlaylistItems(playlistId: string): Promise<JellyfinBaseItemDto[]> {
        const response = await this.request<JellyfinItemsResponse>(
            `/Playlists/${encodeURIComponent(playlistId)}/Items` +
                `?UserId=${encodeURIComponent(this.userId)}`,
        );
        return response.Items ?? [];
    }

    /** The tracks of one album. */
    public async getAlbumTracks(albumId: string): Promise<JellyfinBaseItemDto[]> {
        const response = await this.request<JellyfinItemsResponse>(
            `/Users/${encodeURIComponent(this.userId)}/Items` +
                `?ParentId=${encodeURIComponent(albumId)}&IncludeItemTypes=Audio` +
                `&SortBy=ParentIndexNumber,IndexNumber&SortOrder=Ascending`,
        );
        return response.Items ?? [];
    }

    /** What the user played most recently. */
    public async getRecentlyPlayed(limit = 20): Promise<JellyfinBaseItemDto[]> {
        const response = await this.request<JellyfinItemsResponse>(
            `/Users/${encodeURIComponent(this.userId)}/Items` +
                `?Filters=IsPlayed&Recursive=true&SortBy=DatePlayed&SortOrder=Descending` +
                `&Fields=DatePlayed&Limit=${limit}`,
        );
        return response.Items ?? [];
    }

    /** What was added to the library most recently. */
    public async getRecentlyAdded(limit = 20): Promise<JellyfinBaseItemDto[]> {
        const response = await this.request<JellyfinBaseItemDto[]>(
            `/Items/Latest?UserId=${encodeURIComponent(this.userId)}&Limit=${limit}`,
        );
        return Array.isArray(response) ? response : [];
    }

    /** What the user marked as a favourite. */
    public async getFavourites(limit = 30): Promise<JellyfinBaseItemDto[]> {
        const response = await this.request<JellyfinItemsResponse>(
            `/Users/${encodeURIComponent(this.userId)}/Items` +
                `?Filters=IsFavorite&Recursive=true&Limit=${limit}`,
        );
        return response.Items ?? [];
    }

    /** One item, by id. */
    public async getItem(itemId: string): Promise<JellyfinBaseItemDto> {
        return await this.request<JellyfinBaseItemDto>(
            `/Users/${encodeURIComponent(this.userId)}/Items/${encodeURIComponent(itemId)}`,
        );
    }

    /** What the server can do with an item — direct play, or transcode. */
    public async getPlaybackInfo(itemId: string): Promise<JellyfinPlaybackInfo> {
        return await this.request<JellyfinPlaybackInfo>(
            `/Items/${encodeURIComponent(itemId)}/PlaybackInfo?UserId=${encodeURIComponent(this.userId)}`,
        );
    }

    // ----------------------------------------------------------- reporting

    /** Tell the server a track started. */
    public async reportPlaying(body: Record<string, unknown>): Promise<void> {
        await this.request<void>("/Sessions/Playing", {
            method: "POST",
            body: JSON.stringify(body),
        });
    }

    /** Tell the server where the track is now. */
    public async reportProgress(body: Record<string, unknown>): Promise<void> {
        await this.request<void>("/Sessions/Playing/Progress", {
            method: "POST",
            body: JSON.stringify(body),
        });
    }

    /** Tell the server the track stopped. */
    public async reportStopped(body: Record<string, unknown>): Promise<void> {
        await this.request<void>("/Sessions/Playing/Stopped", {
            method: "POST",
            body: JSON.stringify(body),
        });
    }
}

/** Turn a failed response into a sentence a person can act on. */
async function describeFailure(response: Response): Promise<string> {
    let detail = "";
    try {
        const text = await response.text();
        if (text !== "") {
            try {
                const parsed = JSON.parse(text) as { Message?: string; message?: string };
                detail = parsed.Message ?? parsed.message ?? "";
            } catch {
                detail = text.slice(0, 200);
            }
        }
    } catch {
        detail = "";
    }
    const suffix = detail === "" ? "" : `: ${detail}`;
    return `The server said ${response.status} ${response.statusText}${suffix}`;
}
