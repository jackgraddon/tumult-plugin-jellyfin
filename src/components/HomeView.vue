<script setup lang="ts">
/**
 * The home page — three shelves of what the user has been listening to, what
 * arrived, and what they marked as a favourite.
 */
import MediaGrid from "./MediaGrid.vue";
import { jellyfin } from "../jellyfin/store.ts";
import type { JellyfinBaseItemDto } from "../jellyfin/types.ts";

const state = jellyfin.state;

function play(item: JellyfinBaseItemDto): void {
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
            @select="play"
        />
    </section>

    <section class="jf-section">
        <h2 class="jf-section-heading">Recently added</h2>
        <MediaGrid
            variant="row"
            :items="state.recentAdded"
            empty="Nothing new yet."
            @select="play"
        />
    </section>

    <section class="jf-section">
        <h2 class="jf-section-heading">Favourites</h2>
        <MediaGrid
            variant="row"
            :items="state.favourites"
            empty="No favourites yet."
            @select="play"
        />
    </section>
</template>
