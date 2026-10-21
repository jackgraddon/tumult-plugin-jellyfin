<script setup lang="ts">
/**
 * The pane's left nav — the slot the channel list normally occupies.
 */
import { jellyfin } from "../jellyfin/store.ts";

const state = jellyfin.state;

const SECTIONS = [
    { view: "home", label: "Home", glyph: "🏠" },
    { view: "artists", label: "Artists", glyph: "🎤" },
    { view: "albums", label: "Albums", glyph: "💿" },
    { view: "playlists", label: "Playlists", glyph: "🎧" },
] as const;
</script>

<template>
    <nav class="jf-nav" aria-label="Jellyfin library">
        <p class="jf-nav-heading">Library</p>
        <button
            v-for="section in SECTIONS"
            :key="section.view"
            type="button"
            class="jf-nav-item"
            :aria-current="state.view === section.view ? 'page' : undefined"
            @click="jellyfin.setView(section.view)"
        >
            <span class="jf-nav-glyph" aria-hidden="true">{{ section.glyph }}</span>
            <span>{{ section.label }}</span>
        </button>

        <div class="jf-nav-footer">
            <p class="jf-nav-server">
                {{ state.serverName ?? "Jellyfin" }}<template v-if="state.userName"> · {{ state.userName }}</template>
            </p>
            <button
                v-if="state.connected"
                type="button"
                class="jf-button jf-button-quiet"
                @click="jellyfin.disconnect()"
            >
                Disconnect
            </button>
        </div>
    </nav>
</template>
