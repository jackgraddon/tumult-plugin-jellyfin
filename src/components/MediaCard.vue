<script setup lang="ts">
/**
 * One item in the library — a card with artwork, a name and a subtitle.
 *
 * The artwork comes from the server with the token in the query string (a
 * browser cannot attach a header to an `<img>`), and only when the item
 * actually has an image: otherwise the card shows a glyph rather than a
 * broken picture.
 */
import { computed } from "vue";

import { currentClient } from "../jellyfin/session.ts";
import type { JellyfinBaseItemDto } from "../jellyfin/types.ts";

const props = defineProps<{
    item: JellyfinBaseItemDto;
    /** Shown under the name. Defaults to the album or the artist. */
    subtitle?: string | undefined;
}>();

const emit = defineEmits<{ select: [item: JellyfinBaseItemDto] }>();

const art = computed(() => {
    const client = currentClient();
    if (!client) return "";
    return client.imageUrl(props.item, "Primary", 320);
});

const hasArt = computed(() => Boolean(props.item.ImageTags?.Primary));

const caption = computed(() => {
    if (props.subtitle !== undefined) return props.subtitle;
    if (props.item.AlbumArtist) return props.item.AlbumArtist;
    if (props.item.Album) return props.item.Album;
    if (props.item.Type === "MusicArtist") {
        const count = props.item.ChildCount;
        return count === null || count === undefined ? "Artist" : `${count} albums`;
    }
    return props.item.Type ?? "";
});
</script>

<template>
    <button type="button" class="jf-card" @click="emit('select', item)">
        <span class="jf-card-art">
            <img v-if="hasArt" :src="art" :alt="item.Name" loading="lazy" decoding="async" />
            <span v-else aria-hidden="true">♪</span>
        </span>
        <span class="jf-card-title">{{ item.Name }}</span>
        <span v-if="caption" class="jf-card-sub">{{ caption }}</span>
    </button>
</template>
