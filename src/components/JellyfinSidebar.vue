<script setup lang="ts">
/**
 * The pane's left nav — the slot the channel list normally occupies.
 */
import { Icon } from "@tumult/ui";
import { jellyfin } from "../jellyfin/store.ts";

const state = jellyfin.state;

const SECTIONS = [
    { view: "home", label: "Home", glyph: "home" },
    { view: "artists", label: "Artists", glyph: "microphone" },
    { view: "albums", label: "Albums", glyph: "album" },
    { view: "playlists", label: "Playlists", glyph: "playlist-music" },
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
                <Icon :name="section.glyph" />
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
                    <Icon name="cog" />
                </span>
                <span>Settings</span>
            </button>
            <p class="jf-nav-server">
                {{ state.serverName ?? "Jellyfin" }}<template v-if="state.userName"> · {{ state.userName }}</template>
            </p>
        </div>
    </nav>
</template>
