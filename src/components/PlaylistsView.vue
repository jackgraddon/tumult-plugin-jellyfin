<script setup lang="ts">
/** The playlists in the library. */
import MediaGrid from "./MediaGrid.vue";
import { jellyfin } from "../jellyfin/store.ts";
import type { JellyfinBaseItemDto } from "../jellyfin/types.ts";

function open(item: JellyfinBaseItemDto): void {
    void jellyfin.openPlaylist(item);
}
</script>

<template>
    <MediaGrid
        :items="jellyfin.state.playlists"
        empty="No playlists in this library."
        @select="open"
    />
</template>
