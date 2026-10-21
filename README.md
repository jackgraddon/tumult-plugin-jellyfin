# Jellyfin for Tumult

Your [Jellyfin](https://jellyfin.org) library, inside Tumult.

## Requirements

- **Tumult with plugin API 1.1.0 or newer.** The plugin fills a *workspace
  pane* — a region of the shell the plugin occupies — and that extension point
  arrived in 1.1.0.
- **A Jellyfin server** (10.9 or newer).

## Signing in

Two ways in, both of which end up holding a token and nothing else:

- **Password** — sent to *your* server and exchanged for an access token. The
  password is never stored.
- **API key** — from Jellyfin's dashboard: *Dashboard → Advanced → API Keys*.
  A key can see your whole library, so treat it like a password.

The token is kept in this browser's local storage, alongside the server
address and a device id (so the server sees one device rather than a new one
on every visit). Anything else — the password, your queue — never leaves.

If the server has more than one account, the plugin asks which one you mean
rather than guessing.

## Installing

The plugin installs like any other Tumult plugin: point the installer at a
release that carries `plugin.js` and `tumult.plugin.json`.

Releases are tagged `v<version>`, where `<version>` matches the `version` in
`tumult.plugin.json`. Each release attaches exactly two files:

| File | What it is |
| --- | --- |
| `plugin.js` | The bundle. One file — the stylesheet travels inside it. |
| `tumult.plugin.json` | The manifest, with the bundle's `integrity` hash. |

## Developing

```sh
pnpm install     # esbuild's postinstall is allowlisted in pnpm-workspace.yaml
pnpm shim        # regenerate src/shims/vue.ts from the installed vue
pnpm typecheck   # vue-tsc over the sources and the single-file components
pnpm build       # -> dist/plugin.js
pnpm release:dry # build, then write dist/tumult.plugin.json with the hash
```

`pnpm shim` deserves a word. A plugin must share the **host's** Vue instance —
`provide`/`inject` and the reactivity system are per-instance, so a plugin
that bundled its own copy would render but could not talk to the shell. So the
build aliases `vue` to `src/shims/vue.ts`, which forwards to the runtime the
shell publishes on `globalThis.__tumult.vue`. The shim is generated from the
installed `vue` package (rather than hand-written) because a compiled
single-file component calls internal helpers — `openBlock`,
`createElementBlock`, `renderList` — that a hand-written list would forget.
Re-run `pnpm shim` after changing the `vue` dependency; CI checks that the
committed shim still matches.

## Keeping up with the template

This plugin started as a copy of the [template](https://github.com/jackgraddon/tumult-plugin-template),
and a copy is just that: an independent repository. It does not update itself,
so pulling the template's changes in is a deliberate step.

Two ways to do it:

**Add the template as a remote.** The template's own branch is then one
`fetch` away, and you can take what applies and leave the rest:

```sh
git remote add template https://github.com/jackgraddon/tumult-plugin-template.git
git fetch template
git log --oneline HEAD..template/main       # what the template has gained
git diff HEAD template/main -- vite.config.ts # what it would change here
```

From there, merge or cherry-pick the pieces you want.

**Copy the files you need.** Diff against the updated template and copy over
only the build scripts and configs. For a plugin with this much custom code
this is usually the safer option: the template's files are generic, and
taking one wholesale can undo a local decision.

Either way, some things here are deliberate departures from the template, and
a sync has to put them back:

| file | why it differs |
| --- | --- |
| `pnpm-workspace.yaml` | allowlists esbuild's postinstall. Without it pnpm blocks the build script, and every `pnpm` script fails before it starts. |
| `pnpm-lock.yaml` | committed, so CI's `pnpm install --frozen-lockfile` has a lockfile to check against. |
| `package.json` | pins `packageManager` (pnpm 11) and `engines`. |
| `tsconfig.json` | sets `allowImportingTsExtensions`: the sources import with explicit `.ts` extensions, which TypeScript only accepts with it. |
| `.github/workflows/` | its own CI, and a release workflow that reads the pinned pnpm rather than hard-coding a version. |
| `vite.config.ts` | the template's stylesheet guard, corrected to look for *any* `.css` in `dist/` rather than a fixed name — in library mode Vite names that file after the package, so a check for `plugin.css` would miss it. |

## Permissions, and why

| Permission | Why |
| --- | --- |
| `workspace-panes` | The pane itself: the rail tile and its three slots (nav, content, player). |
| `styles` | The stylesheet, which is injected as a string from inside the bundle. |

It asks for nothing else. There is no slash command and no timeline renderer,
because a pane does not need them — and the fewer permissions a plugin asks
for, the less the consent screen has to warn about.

Because the pane contributes live components, the plugin runs in Tumult's
**trusted lane** (Tumult derives the lane from the permissions; you never
declare it). That means the bundle runs in the page, at the app's trust level,
and shares the app's Vue instance.

## Notes

- **The queue is this device's.** Jellyfin streams one file at a time and has
  no server-side queue to keep in step with, so "what plays next" lives here.
- **LAN servers over `http://` work.** Tumult's content security policy allows
  plain `http` for connections, images and media, because a self-hosted
  server on your own network is the normal case.
- **Direct play first, transcoding as a fallback.** The plugin asks the server
  what it can do with a track; if the file cannot be played as-is, the server
  transcodes it, and the player says so.
