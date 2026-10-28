<script setup lang="ts">
/**
 * The pane's left nav — the slot the channel list normally occupies.
 */
import { mdiAlbum, mdiCog, mdiHome, mdiMicrophone, mdiPlaylistMusic } from "@mdi/js";

import Icon from "./Icon.vue";
import { jellyfin } from "../jellyfin/store.ts";

const state = jellyfin.state;

const SECTIONS = [
    { view: "home", label: "Home", glyph: mdiHome },
    { view: "artists", label: "Artists", glyph: mdiMicrophone },
    { view: "albums", label: "Albums", glyph: mdiAlbum },
    { view: "playlists", label: "Playlists", glyph: mdiPlaylistMusic },
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
            <span class="jf-nav-glyph" aria-hidden="true">
                <Icon :path="section.glyph" />
            </span>
            <span>{{ section.label }}</span>
        </button>

        <div class="jf-nav-footer">
            <button
                v-if="state.connected"
                type="button"
                class="jf-nav-item"
                :aria-current="state.view === 'settings' ? 'page' : undefined"
                @click="jellyfin.setView('settings')"
            >
                <span class="jf-nav-glyph" aria-hidden="true">
                    <Icon :path="mdiCog" />
                </span>
                <span>Settings</span>
            </button>
            <p class="jf-nav-server">
                {{ state.serverName ?? "Jellyfin" }}<template v-if="state.userName"> · {{ state.userName }}</template>
            </p>
        </div>
    </nav>
</template>
