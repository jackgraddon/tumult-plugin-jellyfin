<script setup lang="ts">
/**
 * A shelf of items — a grid, or a horizontal row for the home page.
 */
import MediaCard from "./MediaCard.vue";
import type { JellyfinBaseItemDto } from "../jellyfin/types.ts";

withDefaults(
    defineProps<{
        items: JellyfinBaseItemDto[];
        /** "grid" fills the width; "row" scrolls sideways. */
        variant?: "grid" | "row";
        /** What to say when there is nothing to show. */
        empty?: string;
    }>(),
    { variant: "grid", empty: "Nothing here yet." },
);

const emit = defineEmits<{ select: [item: JellyfinBaseItemDto] }>();
</script>

<template>
    <p v-if="items.length === 0" class="jf-empty">{{ empty }}</p>
    <div v-else-if="variant === 'row'" class="jf-row-scroll">
        <MediaCard v-for="item in items" :key="item.Id" :item="item" @select="emit('select', $event)" />
    </div>
    <div v-else class="jf-grid">
        <MediaCard v-for="item in items" :key="item.Id" :item="item" @select="emit('select', $event)" />
    </div>
</template>
