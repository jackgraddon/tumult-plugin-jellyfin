<script setup lang="ts">
/**
 * The queue — what plays next.
 *
 * The queue is this device's own: Jellyfin streams one file at a time and has
 * no server-side queue to keep in step with.
 */
import { player } from "../jellyfin/audio.ts";

const state = player.state;

function jump(index: number): void {
    void player.playAt(index);
}
</script>

<template>
    <div class="jf-queue" role="dialog" aria-label="Play queue">
        <p class="jf-queue-heading">
            <span>Queue</span>
            <button type="button" class="jf-button jf-button-quiet" @click="player.clear()">Clear</button>
        </p>

        <p v-if="state.queue.length === 0" class="jf-note">Nothing queued.</p>

        <div
            v-for="(entry, index) in state.queue"
            :key="entry.id"
            class="jf-queue-item"
            :aria-current="index === state.index ? 'true' : undefined"
        >
            <button type="button" class="jf-queue-name" @click="jump(index)">
                {{ entry.item.Name }}
            </button>
            <button
                type="button"
                class="jf-queue-remove"
                :aria-label="`Remove ${entry.item.Name} from the queue`"
                @click="player.remove(entry.id)"
            >
                ✕
            </button>
        </div>
    </div>
</template>
