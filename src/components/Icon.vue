<script setup lang="ts">
/**
 * A Material Design icon, drawn inline from an `@mdi/js` path.
 *
 * The host's own `Icon` is not part of the plugin API, so the plugin carries
 * its own: a path string in, an `<svg>` that takes the surrounding text colour
 * and scales with the font size out.
 */
defineProps<{
    /** An `@mdi/js` path, e.g. `mdiPlay`. */
    path: string;
}>();
</script>

<template>
    <svg class="jf-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path :d="path" fill="currentColor" />
    </svg>
</template>
