<script setup lang="ts">
/**
 * The connect form — the pane's front door.
 *
 * Two ways in: a password (exchanged for a token, and forgotten the moment
 * the exchange succeeds) or an API key (which is a token already). When an
 * API key can see more than one account, the form asks which one instead of
 * guessing.
 */
import { ref } from "vue";

import { jellyfin } from "../jellyfin/store.ts";

const mode = ref<"password" | "apiKey">("password");
const baseUrl = ref("");
const username = ref("");
const password = ref("");
const apiKey = ref("");

const state = jellyfin.state;

function submit(): void {
    if (mode.value === "password") {
        void jellyfin.connectWithPassword(baseUrl.value, username.value, password.value);
    } else {
        void jellyfin.connectWithApiKey(baseUrl.value, apiKey.value);
    }
}
</script>

<template>
    <div class="jf-connect">
        <h2>Jellyfin</h2>
        <p class="jf-note">
            Point this at your Jellyfin server. The address is the one your server
            uses — often <code>http://localhost:8096</code> on the machine itself, or
            <code>http://192.168.x.x:8096</code> from another device on the network.
        </p>

        <p v-if="state.error" class="jf-error" role="alert">{{ state.error }}</p>

        <div v-if="state.availableUsers.length > 1" class="jf-section">
            <h3 class="jf-section-heading">Which account?</h3>
            <div class="jf-row">
                <button
                    v-for="user in state.availableUsers"
                    :key="user.Id"
                    type="button"
                    class="jf-button"
                    :disabled="state.busy"
                    @click="jellyfin.connectAsUser(user)"
                >
                    {{ user.Name }}
                </button>
            </div>
        </div>

        <form v-else @submit.prevent="submit">
            <div class="jf-tabs" role="tablist">
                <button
                    type="button"
                    role="tab"
                    class="jf-tab"
                    :aria-selected="mode === 'password'"
                    @click="mode = 'password'"
                >
                    Password
                </button>
                <button
                    type="button"
                    role="tab"
                    class="jf-tab"
                    :aria-selected="mode === 'apiKey'"
                    @click="mode = 'apiKey'"
                >
                    API key
                </button>
            </div>

            <div class="jf-field">
                <label class="jf-label" for="jf-server">Server address</label>
                <input
                    id="jf-server"
                    v-model="baseUrl"
                    class="jf-input"
                    type="text"
                    inputmode="url"
                    autocomplete="url"
                    placeholder="http://localhost:8096"
                />
            </div>

            <template v-if="mode === 'password'">
                <div class="jf-field">
                    <label class="jf-label" for="jf-user">Username</label>
                    <input
                        id="jf-user"
                        v-model="username"
                        class="jf-input"
                        type="text"
                        autocomplete="username"
                    />
                </div>
                <div class="jf-field">
                    <label class="jf-label" for="jf-password">Password</label>
                    <input
                        id="jf-password"
                        v-model="password"
                        class="jf-input"
                        type="password"
                        autocomplete="current-password"
                    />
                </div>
                <p class="jf-note">
                    Your password is sent to your server and exchanged for a token. Only the
                    token is kept.
                </p>
            </template>

            <template v-else>
                <div class="jf-field">
                    <label class="jf-label" for="jf-apikey">API key</label>
                    <input
                        id="jf-apikey"
                        v-model="apiKey"
                        class="jf-input"
                        type="password"
                        autocomplete="off"
                    />
                </div>
                <p class="jf-note">
                    In Jellyfin's dashboard: Dashboard → Advanced → API Keys. The key can see
                    your whole library.
                </p>
            </template>

            <div class="jf-row" style="margin-top: var(--space-3)">
                <button type="submit" class="jf-button jf-button-primary" :disabled="state.busy">
                    {{ state.busy ? "Connecting…" : "Connect" }}
                </button>
            </div>
        </form>
    </div>
</template>
