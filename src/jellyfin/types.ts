/**
 * The shapes Jellyfin's API speaks — only the fields this plugin reads.
 *
 * Jellyfin's DTOs are PascalCase and enormous; typing the whole thing would
 * be a lie about what we depend on. These are the fields the plugin actually
 * touches, with the server's names kept verbatim so a response can be used
 * without a translation layer (and so a typo in a field name is a type error
 * rather than an `undefined` at runtime).
 */

/** A Jellyfin user account. */
export interface JellyfinUserDto {
    Id: string;
    Name: string;
    ServerId?: string;
    PrimaryImageTag?: string | null;
}

/** What the server knows about *this* user's relationship with an item. */
export interface JellyfinUserItemDataDto {
    PlayCount?: number;
    Played?: boolean;
    IsFavorite?: boolean;
    PlaybackPositionTicks?: number;
    LastPlayedDate?: string | null;
    Key?: string;
}

/** The image tags an item carries — the tag is part of the image URL. */
export interface JellyfinItemImageTags {
    Primary?: string | null;
    Thumb?: string | null;
    Backdrop?: string | null;
    Banner?: string | null;
    Logo?: string | null;
}

/** One library item: an album, an artist, a song, a playlist. */
export interface JellyfinBaseItemDto {
    Id: string;
    Name: string;
    Type?: string;
    Album?: string | null;
    AlbumArtist?: string | null;
    AlbumId?: string | null;
    AlbumArtistId?: string | null;
    Artists?: string[];
    ArtistItems?: { Id: string; Name: string }[];
    Container?: string | null;
    ProductionYear?: number | null;
    IndexNumber?: number | null;
    ParentIndexNumber?: number | null;
    RunTimeTicks?: number | null;
    ChildCount?: number | null;
    IsFolder?: boolean;
    ImageTags?: JellyfinItemImageTags;
    BackdropImageTags?: string[];
    UserData?: JellyfinUserItemDataDto;
    MediaTags?: { Channels?: number | null; Bitrate?: number | null };
}

/** A paged list of items. */
export interface JellyfinItemsResponse {
    Items: JellyfinBaseItemDto[];
    TotalRecordCount?: number;
    StartIndex?: number;
}

/** The result of a password sign-in. */
export interface JellyfinAuthResponse {
    AccessToken: string;
    ServerId?: string;
    User: JellyfinUserDto;
}

/** One playable source of an item. */
export interface JellyfinMediaSource {
    Id?: string;
    Path?: string | null;
    Container?: string | null;
    Size?: number | null;
    Bitrate?: number | null;
    SupportsDirectPlay?: boolean;
    SupportsDirectStream?: boolean;
    SupportsTranscoding?: boolean;
    TranscodingUrl?: string | null;
    TranscodingSubProtocol?: string | null;
    DirectStreamUrl?: string | null;
    RunTimeTicks?: number | null;
}

/** What the server says it can do with an item. */
export interface JellyfinPlaybackInfo {
    MediaSources: JellyfinMediaSource[];
    PlaySessionId?: string;
    ErrorCode?: string;
}

/** The public description of a server. */
export interface JellyfinPublicSystemInfo {
    Id?: string;
    ServerName?: string;
    Version?: string;
    ProductName?: string;
    StartupWizardCompleted?: boolean;
}

/** The image kinds Jellyfin can serve for an item. */
export type JellyfinImageType = "Primary" | "Thumb" | "Backdrop" | "Banner" | "Logo";

/** One entry in the play queue. */
export interface JellyfinQueueEntry {
    /** The item id — unique inside the queue. */
    id: string;
    /** The item itself, for the title and the artwork. */
    item: JellyfinBaseItemDto;
}

/** Jellyfin counts time in 100-nanosecond ticks. */
export const TICKS_PER_MILLISECOND = 10_000;

/** Ticks → seconds. */
export function ticksToSeconds(ticks: number | null | undefined): number {
    if (!ticks) return 0;
    return ticks / 10_000_000;
}

/** Seconds → ticks. */
export function secondsToTicks(seconds: number): number {
    return Math.round(seconds * 10_000_000);
}
