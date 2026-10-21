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
        empty="No artists in this library."
        @select="open"
    />
</template>
