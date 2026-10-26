<script setup lang="ts">
/** The artists in the library. */
import MediaGrid from "./MediaGrid.vue";
import { jellyfin } from "../jellyfin/store.ts";
import type { JellyfinBaseItemDto } from "../jellyfin/types.ts";

function open(item: JellyfinBaseItemDto): void {
    void jellyfin.openArtist(item);
}
</script>

<template>
    <MediaGrid
        :items="jellyfin.state.artists"
        :has-more="jellyfin.state.artists.length < jellyfin.state.artistsTotal"
        :loading-more="jellyfin.state.artistsLoadingMore"
        empty="No artists in this library."
        @select="open"
        @load-more="jellyfin.loadMoreArtists()"
    />
</template>
