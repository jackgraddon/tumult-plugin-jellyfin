/**
 * Jellyfin, inside Tumult.
 *
 * A **workspace pane**: a tile in the guild rail that opens the plugin's own
 * region of the app — a left nav (Home, Artists, Albums, Playlists), a content
 * area, and a player bar along the bottom.
 *
 * The pane contributes live components, so it runs in the **trusted lane**
 * (Tumult derives the lane from the permissions below — you never declare
 * it). That means the bundle runs in the page, at the app's trust level, and
 * shares the app's Vue instance.
 *
 * What the plugin asks for, and why:
 *
 *   - `workspace-panes` — the pane itself: the rail tile and the three slots.
 *   - `styles`          — the stylesheet, which travels inside the bundle.
 *
 * It does **not** ask for `commands` or `timeline-renderers`: a slash command
 * that opened a pane would be a nicety, not a need, and the fewer permissions
 * a plugin asks for, the less the consent screen has to warn about.
 */
import type { Plugin, PluginManifest } from "@tumult/ui";

import JellyfinContent from "./components/JellyfinContent.vue";
import JellyfinPlayer from "./components/JellyfinPlayer.vue";
import JellyfinSidebar from "./components/JellyfinSidebar.vue";
import { startPresence } from "./jellyfin/presence.ts";
import { STYLESHEET } from "./styles.ts";

const manifest: PluginManifest = {
    id: "com.jackgraddon.tumult.jellyfin",
    name: "Jellyfin",
    version: "0.3.1",
    author: "Jack Graddon",
    description: "Your Jellyfin library in Tumult.",
    permissions: ["workspace-panes", "styles"],
    // The pane extension point arrived in plugin API 1.1.0; an older Tumult
    // would refuse the install rather than show a plugin it cannot host.
    minUI: "1.1.0",
    // `client.setOwnPresence` — the status line — arrived in core contract
    // 1.1.0. An older Tumult refuses the install rather than host a plugin
    // whose status line could never appear.
    minCore: "1.1.0",
};

export const plugin: Plugin = {
    manifest,

    install(ctx) {
        // The stylesheet is a string inside the bundle, not a sibling file:
        // a release attaches `plugin.js` and nothing else.
        ctx.injectStylesheet(STYLESHEET);

        ctx.addPane({
            id: "com.jackgraddon.tumult.jellyfin",
            label: "Jellyfin",
            icon: "music-note",
            content: JellyfinContent,
            sidebar: JellyfinSidebar,
            footer: JellyfinPlayer,
        });

        // Our Matrix status follows the music: "Listening to <song>" while a
        // track plays, nothing once it stops. The teardown takes the line
        // down again when the plugin is removed.
        return startPresence(ctx.client);
    },
};

export default plugin;
