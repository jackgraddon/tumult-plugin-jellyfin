<script setup lang="ts">
/**
 * The Settings surface — where the plugin looks after its own cache and the
 * user looks to leave.
 *
 * It is the home of Disconnect (moved out of the nav so the footer can show
 * what it is doing), and the one place the library cache is visible: its size,
 * and the buttons to empty it and to re-load the library it holds.
 *
 * The cache number is not reactive on its own, so it is read through the
 * store's reactive copy, which Refresh and Clear both update, so the figure
 * moves when the cache does.
 */
import { computed } from "vue";

import { formatBytes } from "../jellyfin/cache.ts";
import { jellyfin } from "../jellyfin/store.ts";

const state = jellyfin.state;

/** How much the cache is using, through the store's reactive copy. */
const cacheSize = computed(() => formatBytes(state.cacheBytes));

function refresh(): void {
    void jellyfin.refresh();
}

function clearCache(): void {
    jellyfin.clearCache();
}

function disconnect(): void {
    jellyfin.disconnect();
}
</script>

<template>
    <section class="jf-settings">
        <h2 class="jf-section-heading">Settings</h2>

        <section v-if="state.connected" class="jf-settings-group">
            <h3 class="jf-settings-title">This server</h3>
            <dl class="jf-settings-list">
                <div class="jf-settings-row">
                    <dt>Server</dt>
                    <dd>{{ state.serverName ?? "Jellyfin" }}</dd>
                </div>
                <div class="jf-settings-row">
                    <dt>Account</dt>
                    <dd>{{ state.userName ?? "—" }}</dd>
                </div>
                <div class="jf-settings-row">
                    <dt>Sign in</dt>
                    <dd>{{ state.authMethod === "apiKey" ? "API key" : "Password" }}</dd>
                </div>
            </dl>
        </section>

        <section class="jf-settings-group">
            <h3 class="jf-settings-title">Library cache</h3>
            <p class="jf-note">
                Lists are kept here so moving between them is instant. It is cleared when you
                disconnect.
            </p>
            <p class="jf-settings-size">
                <span class="jf-settings-size-label">In use</span>
                <span class="jf-settings-size-value">{{ cacheSize }}</span>
            </p>
            <div class="jf-settings-actions">
                <button type="button" class="jf-button" @click="refresh" :disabled="!state.connected">
                    Refresh
                </button>
                <button type="button" class="jf-button jf-button-quiet" @click="clearCache">
                    Clear cache
                </button>
            </div>
        </section>

        <section v-if="state.connected" class="jf-settings-group">
            <button type="button" class="jf-button jf-button-danger jf-settings-disconnect" @click="disconnect">
                Disconnect
            </button>
        </section>
    </section>
</template>
