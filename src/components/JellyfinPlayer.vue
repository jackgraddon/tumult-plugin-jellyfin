<script setup lang="ts">
/**
 * The player — the pane's bottom bar.
 *
 * Transport on the left, what is playing in the middle, the queue on the
 * right, and a seek bar underneath. The state lives in the player module, so
 * this component only draws it.
 */
import { computed } from "vue";
import { Icon } from "@tumult/ui";

import { formatTime, player } from "../jellyfin/audio.ts";
import { currentClient } from "../jellyfin/session.ts";
import { ticksToSeconds } from "../jellyfin/types.ts";

import JellyfinQueue from "./JellyfinQueue.vue";

const state = player.state;

const art = computed(() => {
    const client = currentClient();
    const item = state.current?.item;
    if (!client || !item) return "";
    return client.imageUrl(item, "Primary", 120);
});

const hasArt = computed(() => Boolean(state.current?.item.ImageTags?.Primary));

const title = computed(() => state.current?.item.Name ?? "Nothing playing");

const subtitle = computed(() => {
    const item = state.current?.item;
    if (!item) return "";
    return item.AlbumArtist ?? item.Artists?.[0] ?? item.Album ?? "";
});

/** The length of the track — from the element once it knows, else the item. */
const duration = computed(() => {
    if (state.duration > 0) return state.duration;
    return ticksToSeconds(state.current?.item.RunTimeTicks);
});

function onSeek(event: Event): void {
    const input = event.target as HTMLInputElement;
    player.seek(Number(input.value));
}

function onVolume(event: Event): void {
    const input = event.target as HTMLInputElement;
    player.setVolume(Number(input.value));
}
</script>

<template>
    <footer class="jf-player">
        <div class="jf-player-controls">
            <button
                type="button"
                class="jf-player-button"
                aria-label="Previous track"
                :disabled="!state.current"
                @click="player.previous()"
            >
                <span aria-hidden="true">
                    <Icon name="skip-previous" />
                </span>
            </button>
            <button
                type="button"
                class="jf-player-button jf-player-play"
                :aria-label="state.playing ? 'Pause' : 'Play'"
                @click="player.toggle()"
            >
                <span aria-hidden="true">
                    <Icon :name="state.playing ? 'pause' : 'play'" />
                </span>
            </button>
            <button
                type="button"
                class="jf-player-button"
                aria-label="Next track"
                :disabled="!state.current"
                @click="player.next()"
            >
                <span aria-hidden="true">
                    <Icon name="skip-next" />
                </span>
            </button>
        </div>

        <div class="jf-player-now">
            <span class="jf-player-art">
                <img v-if="hasArt" :src="art" alt="" decoding="async" />
                <span v-else aria-hidden="true">
                    <Icon name="music-note" />
                </span>
            </span>
            <span class="jf-player-text">
                <span class="jf-player-title">{{ title }}</span>
                <span class="jf-player-sub">{{ subtitle }}</span>
            </span>
        </div>

        <div class="jf-player-right">
            <span v-if="state.transcoding" class="jf-note">transcoding</span>
            <button
                type="button"
                class="jf-player-button"
                :aria-label="state.queueOpen ? 'Hide the queue' : 'Show the queue'"
                :aria-expanded="state.queueOpen"
                @click="state.queueOpen = !state.queueOpen"
            >
                <span aria-hidden="true">
                    <Icon name="menu" />
                </span>
            </button>
            <input
                class="jf-range jf-volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="state.volume"
                aria-label="Volume"
                @input="onVolume"
            />
        </div>

        <div class="jf-player-progress">
            <span class="jf-player-time">{{ formatTime(state.position) }}</span>
            <input
                class="jf-range"
                type="range"
                min="0"
                :max="duration || 0"
                step="1"
                :value="state.position"
                aria-label="Seek"
                :disabled="!state.current"
                @input="onSeek"
            />
            <span class="jf-player-time">{{ formatTime(duration) }}</span>
        </div>

        <JellyfinQueue v-if="state.queueOpen" />
    </footer>
</template>
