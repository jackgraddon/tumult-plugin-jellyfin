<script setup lang="ts">
/**
 * A grid that renders only the rows near the user's scroll position.
 *
 * A library of thousands of albums would mount thousands of cards if every one of
 * them were a `<MediaCard>` — the visible jank. This keeps the DOM to the
 * visible window (plus a little overshoot): a spacer holds the full scroll
 * height, and only the rows in and near view are drawn. Pagination (the parent
 * feeding the next page) and this together: the former bounds how many items
 * exist, the latter bounds how many of them are on the page.
 *
 * It reuses the shell's `.jf-grid` layout for the window it draws, and it
 * measures the scroll viewport the content view hands it. Measurement is the
 * fragile part — if a row's height cannot be read, or the viewport is not
 * available, it falls back to drawing every row, which is the grid it would have
 * been before. A failure to virtualize is never a failure to show.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import MediaCard from "./MediaCard.vue";
import { useScroll } from "./symbols.ts";
import type { JellyfinBaseItemDto } from "../jellyfin/types.ts";

const props = withDefaults(
    defineProps<{
        items: JellyfinBaseItemDto[];
        /** That the server keeps more than the loaded window. */
        hasMore?: boolean;
        /** Whether the next page is fetching. */
        loadingMore?: boolean;
        /** What to say when there is nothing to show. */
        empty?: string;
        /** Fetch the next page. */
        onLoadMore?: (() => void) | undefined;
    }>(),
    { hasMore: false, loadingMore: false, empty: "Nothing here yet.", onLoadMore: undefined },
);

const emit = defineEmits<{ select: [item: JellyfinBaseItemDto] }>();

/** The narrowest a column may be, in CSS pixels. Must match `.jf-grid`. */
const MIN_COL = 150;
/** Rows kept drawn above and below the viewport, so scrolling never shows a gap. */
const OVERSCAN = 3;
/** How near the bottom (in pixels) triggers the next page. */
const PREFETCH = 400;

const getScroll = useScroll();

/** The scroll element's dimensions, observed as it resizes. */
const width = ref(0);
const viewport = ref(0);
/** The viewport's scroll offset, rAF-pollable without a handler per scroll. */
const scrollTop = ref(0);
/** The gap `.jf-grid` leaves between rows, read from the computed style. */
const gap = ref(12);
/** A row's height, measured from a card — the uniform card makes this constant. */
const rowHeight = ref(0);

const root = ref<HTMLElement | null>(null);
const grid = ref<HTMLElement | null>(null);

let ro: ResizeObserver | null = null;

/** Columns the window will lay out into, from its current width. */
const cols = computed(() => {
    if (width.value <= 0) return 0;
    return Math.max(1, Math.floor((width.value + gap.value) / (MIN_COL + gap.value)));
});

/** The full window, in rows. */
const totalRows = computed(() => (cols.value === 0 ? 0 : Math.ceil(props.items.length / cols.value)));
/** Row height plus its trailing gap — the distance from one row's top to the next. */
const stride = computed(() => rowHeight.value + gap.value);

/**
 * Whether we have enough measured to virtualize. Until a row's height and the
 * viewport are both known we draw every row — the plain grid — and that is also
 * how the row height is read from the layout.
 */
const virtual = computed(() => cols.value > 0 && viewport.value > 0 && rowHeight.value > 0);

/** The rows that are in, or near, view. */
const startRow = computed(() => {
    if (!virtual.value || stride.value <= 0) return 0;
    return Math.max(0, Math.floor(scrollTop.value / stride.value) - OVERSCAN);
});
const endRow = computed(() => {
    if (!virtual.value || stride.value <= 0) return totalRows.value;
    return Math.min(
        totalRows.value,
        Math.ceil((scrollTop.value + viewport.value) / stride.value) + OVERSCAN,
    );
});

/** What the window draws: the visible slice when virtual, every row when not. */
const windowItems = computed(() => {
    if (!virtual.value) return props.items;
    return props.items.slice(startRow.value * cols.value, endRow.value * cols.value);
});

/** The full scroll height the window floats in. */
const totalHeight = computed(() => totalRows.value * stride.value);
/** Where the window's first row begins. */
const windowTop = computed(() => startRow.value * stride.value);

/** Fetch the next page when the user nears the bottom. */
function checkForMore(): void {
    const el = getScroll();
    if (!el || !props.hasMore || props.loadingMore || !props.onLoadMore) return;
    if (el.scrollTop + el.clientHeight + PREFETCH >= el.scrollHeight) {
        props.onLoadMore();
    }
}

/** Read a row's height and the gap, from the grid we just drew. */
function measure(): void {
    const el = grid.value;
    if (!el || el.children.length === 0) return;
    const first = el.children[0] as HTMLElement | undefined;
    if (!first) return;
    rowHeight.value = first.offsetHeight;
    const parsed = parseFloat(getComputedStyle(el).rowGap || getComputedStyle(el).gap);
    gap.value = Number.isFinite(parsed) && parsed > 0 ? parsed : gap.value;
}

onMounted(() => {
    const el = getScroll();
    if (!el) {
        // No viewport to measure against: the plain grid it already draws stands.
        return;
    }
    width.value = el.clientWidth;
    viewport.value = el.clientHeight;
    scrollTop.value = el.scrollTop;
    el.addEventListener("scroll", onScroll, { passive: true });
    ro = new ResizeObserver(() => {
        width.value = el.clientWidth;
        viewport.value = el.clientHeight;
    });
    ro.observe(el);
    void nextTick(measure);
});

onBeforeUnmount(() => {
    getScroll()?.removeEventListener("scroll", onScroll);
    ro?.disconnect();
});

/** A scroll fires often; coalesce the reads into one per frame. */
let frame = 0;
function onScroll(): void {
    if (frame) return;
    frame = 1;
    requestAnimationFrame(() => {
        frame = 0;
        const el = getScroll();
        if (el) scrollTop.value = el.scrollTop;
        checkForMore();
    });
}

// The row height is read from a card the first time rows are on screen, and
// re-read when a resize changes the column count (a narrower view makes a wider
// card, and so a taller one).
watch(
    () => props.items.length,
    () => {
        if (rowHeight.value === 0) void nextTick(measure);
    },
    { immediate: true },
);

watch(cols, () => {
    if (props.items.length > 0) void nextTick(measure);
});
</script>

<template>
    <div class="jf-grid-virtual">
        <p v-if="items.length === 0" class="jf-empty">{{ empty }}</p>
        <template v-else>
            <div
                ref="root"
                class="jf-virtual"
                :style="virtual ? { height: totalHeight + 'px' } : undefined"
            >
                <div
                    ref="grid"
                    class="jf-grid"
                    :style="
                        virtual
                            ? { position: 'absolute', top: windowTop + 'px', left: 0, right: 0 }
                            : undefined
                    "
                >
                    <MediaCard
                        v-for="item in windowItems"
                        :key="item.Id"
                        :item="item"
                        @select="emit('select', $event)"
                    />
                </div>
            </div>

            <footer v-if="hasMore" class="jf-load">
                <template v-if="loadingMore">
                    <span class="jf-spinner" aria-hidden="true" />
                    <span class="jf-note">Loading…</span>
                </template>
                <button
                    v-else
                    type="button"
                    class="jf-button jf-button-quiet"
                    @click="onLoadMore?.()"
                >
                    Load more
                </button>
            </footer>
        </template>
    </div>
</template>
