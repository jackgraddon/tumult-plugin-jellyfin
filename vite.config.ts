import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

/**
 * Build the plugin bundle.
 *
 * One ESM file, no externals — except `vue`, which is aliased to the shim
 * below. That indirection is load-bearing: a plugin must share the host's Vue
 * instance (`provide`/`inject` and reactivity are per-instance), so bundling a
 * second copy of Vue would produce a plugin that renders but cannot talk to the
 * shell. The shim forwards to `globalThis.__tumult.vue`, which the shell
 * installs before it imports any plugin bundle.
 *
 * Vite is here because the plugin is written as single-file components —
 * esbuild cannot compile an SFC, and a hand-written `render()` function for a
 * media library would be unreadable.
 *
 * Output name must match `entry` in `tumult.plugin.json` (and the copy in
 * `src/index.ts`). The release workflow hashes what this writes, and attaches
 * that one file — so the build must not emit a sibling stylesheet: the
 * plugin's CSS travels inside the bundle (see `src/styles.ts`).
 */
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: [
            {
                // Exact match: `vue/jsx-runtime` is not the shim.
                find: /^vue$/,
                replacement: fileURLToPath(new URL("./src/shims/vue.ts", import.meta.url)),
            },
        ],
    },
    build: {
        lib: {
            entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
            formats: ["es"],
            fileName: () => "plugin.js",
        },
        outDir: "dist",
        emptyOutDir: true,
        target: "es2022",
        minify: "esbuild",
        sourcemap: false,
        // One file, one stylesheet (none): the release attaches `plugin.js`.
        cssCodeSplit: false,
    },
});
