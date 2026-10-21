<script setup lang="ts">
/**
 * The albums — all of them, or the ones of the artist that was opened.
 */
import MediaGrid from "./MediaGrid.vue";
import { jellyfin } from "../jellyfin/store.ts";
import type { JellyfinBaseItemDto } from "../jellyfin/types.ts";

function open(item: JellyfinBaseItemDto): void {
    void jellyfin.openAlbum(item);
}
</script>

<template>
    <MediaGrid
        :items="jellyfin.state.albums"
        :empty="jellyfin.state.artistId ? 'No albums by this artist.' : 'No albums in this library.'"
        @select="open"
    />
</template>
