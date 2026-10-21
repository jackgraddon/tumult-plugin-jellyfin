<script setup lang="ts">
/**
 * The tracks of an album or a playlist, as a table.
 *
 * A row is a button: clicking it plays the track and queues the rest of the
 * list, which is what a person means by "play this".
 */
import { computed } from "vue";

import { formatTime, player } from "../jellyfin/audio.ts";
import { ticksToSeconds, type JellyfinBaseItemDto } from "../jellyfin/types.ts";

const props = defineProps<{
    items: JellyfinBaseItemDto[];
}>();

const emit = defineEmits<{ play: [item: JellyfinBaseItemDto] }>();

const currentId = computed(() => player.state.current?.id ?? "");
</script>

<template>
    <p v-if="props.items.length === 0" class="jf-empty">No tracks here.</p>
    <table v-else class="jf-table">
        <thead>
            <tr>
                <th scope="col" class="jf-table-index">#</th>
                <th scope="col">Title</th>
                <th scope="col">Artist</th>
                <th scope="col">Album</th>
                <th scope="col" class="jf-table-length">Length</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(item, index) in props.items" :key="item.Id">
                <td class="jf-table-index">
                    <button
                        type="button"
                        class="jf-button jf-button-quiet jf-track-play"
                        :aria-label="`Play ${item.Name}`"
                        @click="emit('play', item)"
                    >
                        <span aria-hidden="true">▶</span>
                    </button>
                    <span class="jf-table-number">{{ index + 1 }}</span>
                </td>
                <td>
                    <span class="jf-track-name">
                        <span :class="{ 'jf-track-playing': currentId === item.Id }">{{ item.Name }}</span>
                    </span>
                </td>
                <td>{{ item.AlbumArtist ?? item.Artists?.[0] ?? "—" }}</td>
                <td>{{ item.Album ?? "—" }}</td>
                <td class="jf-table-length">{{ formatTime(ticksToSeconds(item.RunTimeTicks)) }}</td>
            </tr>
        </tbody>
    </table>
</template>
