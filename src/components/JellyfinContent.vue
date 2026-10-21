<script setup lang="ts">
/**
 * The pane's content — the library itself.
 *
 * Which view is showing is the store's business, not this component's: the
 * left nav and the player both read the same state.
 */
import { computed, onMounted } from "vue";

import { jellyfin } from "../jellyfin/store.ts";
import type { JellyfinBaseItemDto } from "../jellyfin/types.ts";

import AlbumsView from "./AlbumsView.vue";
import ArtistsView from "./ArtistsView.vue";
import ConnectView from "./ConnectView.vue";
import HomeView from "./HomeView.vue";
import PlaylistsView from "./PlaylistsView.vue";
import TrackTable from "./TrackTable.vue";

const state = jellyfin.state;

/** Whether an album or a playlist is open. */
const detail = computed(() => state.albumId !== null || state.playlistId !== null);

/** Whether there is somewhere to go back to. */
const canGoBack = computed(() => detail.value || state.artistId !== null);

onMounted(() => {
    // Reconnect from what was remembered, the first time the pane appears.
    void jellyfin.restore();
});

function play(item: JellyfinBaseItemDto): void {
    void jellyfin.play(item, state.tracks);
}
</script>

<template>
    <div class="jf-pane">
        <template v-if="state.connected">
            <header class="jf-header">
                <button
                    v-if="canGoBack"
                    type="button"
                    class="jf-button jf-button-quiet"
                    aria-label="Back"
                    @click="jellyfin.back()"
                >
                    ←
                </button>
                <h1 class="jf-header-title">{{ state.title }}</h1>
                <span class="jf-header-spacer" />
                <span v-if="state.busy" class="jf-note">Loading…</span>
            </header>

            <div class="jf-scroll">
                <p v-if="state.error" class="jf-error" role="alert">{{ state.error }}</p>

                <TrackTable v-if="detail" :items="state.tracks" @play="play" />
                <HomeView v-else-if="state.view === 'home'" />
                <ArtistsView v-else-if="state.view === 'artists'" />
                <AlbumsView v-else-if="state.view === 'albums'" />
                <PlaylistsView v-else-if="state.view === 'playlists'" />
            </div>
        </template>

        <div v-else class="jf-scroll">
            <ConnectView />
        </div>
    </div>
</template>
