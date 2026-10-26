<script setup lang="ts">
/**
 * A shelf of items — a grid, or a horizontal row for the home page.
 *
 * A row is a home shelf and is small, so it is drawn whole. A grid is the
 * library: it is virtualized (only the visible rows are drawn) and it loads
 * more as the user nears the bottom, so a large library neither downloads whole
 * nor mounts a card for every album.
 */
import MediaCard from "./MediaCard.vue";
import VirtualGrid from "./VirtualGrid.vue";
import type { JellyfinBaseItemDto } from "../jellyfin/types.ts";

withDefaults(
    defineProps<{
        items: JellyfinBaseItemDto[];
        /** "grid" fills the width; "row" scrolls sideways. */
        variant?: "grid" | "row";
        /** What to say when there is nothing to show. */
        empty?: string;
        /** That the server keeps more than the loaded window. */
        hasMore?: boolean;
        /** Whether the next page is fetching. */
        loadingMore?: boolean;
        /** Fetch the next page. */
        onLoadMore?: (() => void) | undefined;
    }>(),
    {
        variant: "grid",
        empty: "Nothing here yet.",
        hasMore: false,
        loadingMore: false,
        onLoadMore: undefined,
    },
);

const emit = defineEmits<{ select: [item: JellyfinBaseItemDto] }>();
</script>

<template>
    <!-- A horizontal row, for a home shelf: small, always drawn whole. -->
    <template v-if="variant === 'row'">
        <p v-if="items.length === 0" class="jf-empty">{{ empty }}</p>
        <div v-else class="jf-row-scroll">
            <MediaCard v-for="item in items" :key="item.Id" :item="item" @select="emit('select', $event)" />
        </div>
    </template>

    <!-- A full-width grid: virtualized, loading more as the user scrolls. -->
    <VirtualGrid
        v-else
        :items="items"
        :empty="empty"
        :has-more="hasMore"
        :loading-more="loadingMore"
        :on-load-more="onLoadMore"
        @select="emit('select', $event)"
    />
</template>
