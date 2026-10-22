/**
 * What counts as music.
 *
 * A Jellyfin library holds films and music side by side, and the API will
 * hand back either one unless it is told which to leave out. Every item
 * carries a `Type` — the kind of thing it is: `MusicAlbum` for an album of
 * music, `Audio` for a song, `Movie` for a film, `Playlist` for a playlist —
 * and that is what these questions are asked about.
 *
 * The rules live here, in one place, rather than scattered through the views.
 * The client filters what it fetches, so nothing downstream has to wonder
 * whether a film wandered in.
 */
import type { JellyfinBaseItemDto } from "./types.ts";

/** A song: an audio file. */
export function isSong(item: JellyfinBaseItemDto): boolean {
    if (item.Type) return item.Type === "Audio";
    // No type: a folder of audio is an album, anything else is a song.
    return item.MediaType === "Audio" && item.IsFolder !== true;
}

/** An album of music. */
export function isMusicAlbum(item: JellyfinBaseItemDto): boolean {
    if (item.Type) return item.Type === "MusicAlbum";
    return item.MediaType === "Audio" && item.IsFolder === true;
}

/** A music artist. */
export function isMusicArtist(item: JellyfinBaseItemDto): boolean {
    return item.Type === "MusicArtist";
}

/**
 * Anything that is music, or holds it: a song, an album, a playlist.
 *
 * This is the test for the home shelves, where a card is offered to the
 * player — so it leaves out the kinds that cannot be played, such as an
 * artist or a genre.
 */
export function isMusic(item: JellyfinBaseItemDto): boolean {
    if (item.Type) {
        return item.Type === "Audio" || item.Type === "MusicAlbum" || item.Type === "Playlist";
    }
    return item.MediaType === "Audio";
}
