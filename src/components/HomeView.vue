<script setup lang="ts">
/**
 * The home page — three shelves of what the user has been listening to, what
 * arrived, and what they marked as a favourite.
 */
import MediaGrid from "./MediaGrid.vue";
import { jellyfin } from "../jellyfin/store.ts";
import type { JellyfinBaseItemDto } from "../jellyfin/types.ts";

const state = jellyfin.state;

/**
 * A card in a shelf. A song is played; an album or a playlist is opened,
 * because neither of those can be streamed on its own.
 */
function select(item: JellyfinBaseItemDto): void {
    if (item.Type === "MusicAlbum") {
        void jellyfin.openAlbum(item);
        return;
    }
    if (item.Type === "Playlist") {
        void jellyfin.openPlaylist(item);
        return;
    }
    void jellyfin.play(item, state.recentPlayed);
}
</script>

<template>
    <section class="jf-section">
        <h2 class="jf-section-heading">Recently played</h2>
        <MediaGrid
            variant="row"
            :items="state.recentPlayed"
            empty="Nothing played yet."
            @select="select"
        />
    </section>

    <section class="jf-section">
        <h2 class="jf-section-heading">Recently added</h2>
        <MediaGrid
            variant="row"
            :items="state.recentAdded"
            empty="Nothing new yet."
            @select="select"
        />
    </section>

    <section class="jf-section">
        <h2 class="jf-section-heading">Favourites</h2>
        <MediaGrid
            variant="row"
            :items="state.favourites"
            empty="No favourites yet."
            @select="select"
        />
    </section>
</template>
