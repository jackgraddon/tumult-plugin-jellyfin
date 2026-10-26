/**
 * The plugin's stylesheet.
 *
 * It travels **inside the bundle** as a string and is handed to the shell's
 * `injectStylesheet` — not as a separate `.css` file — because a release
 * attaches exactly one artifact (`plugin.js`) and the manifest's `integrity`
 * hash covers exactly that file.
 *
 * The CSS is app-wide (the shell has no shadow root), so every class here is
 * prefixed `jf-`. It is written against the shell's theme tokens rather than
 * literals, so a theme the user picks drives the plugin too.
 *
 * No `url()` and no `@import`: an injected stylesheet that reaches for a
 * remote resource is refused at install time.
 */
export const STYLESHEET = `
.jf-pane {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    background: var(--timeline-bg);
    color: var(--text-primary);
    font-family: var(--font-sans);
}

.jf-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-bottom: var(--border-width) solid var(--border-default);
    background: var(--surface-pane);
}

.jf-header-title {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-tight);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.jf-header-spacer {
    flex: 1;
}

.jf-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-4);
}

.jf-section {
    margin: 0 0 var(--space-5);
}

.jf-section-heading {
    margin: 0 0 var(--space-2);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
    letter-spacing: var(--tracking-wide);
}

.jf-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-3);
}

/* A grid that virtualizes its rows: a spacer holds the full height and a window
   of the visible rows floats in it. */
.jf-grid-virtual {
    min-width: 0;
}

.jf-virtual {
    position: relative;
}

.jf-load {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 48px;
    padding: var(--space-3) 0 var(--space-1);
}

.jf-row-scroll {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    padding-bottom: var(--space-1);
}

.jf-row-scroll .jf-card {
    width: 150px;
    flex: 0 0 auto;
}

.jf-table-index {
    width: 72px;
    color: var(--text-muted);
}

.jf-table-length {
    width: 80px;
    text-align: right;
    font-variant-numeric: tabular-nums;
}

.jf-table-number {
    margin-left: var(--space-1);
    font-size: var(--text-xs);
    color: var(--text-muted);
}

.jf-track-play {
    min-height: var(--control-sm);
    padding: 0 var(--space-1);
}

.jf-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
}

.jf-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2);
    border: var(--border-width) solid transparent;
    border-radius: var(--control-radius);
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color var(--motion-fast) var(--motion-ease);
}

.jf-card:hover {
    background: var(--surface-hover);
}

.jf-card:focus-visible {
    outline: var(--focus-ring-width) solid var(--focus-ring);
    outline-offset: var(--focus-ring-offset);
}

.jf-card[aria-current="true"] {
    border-color: var(--accent);
}

.jf-card-art {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: var(--radius-sm);
    background: var(--surface-inset);
    color: var(--text-muted);
    font-size: var(--text-2xl);
}

.jf-card-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.jf-card-title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-tight);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.jf-card-sub {
    font-size: var(--text-xs);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.jf-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
}

.jf-table th {
    padding: var(--space-1) var(--space-2);
    border-bottom: var(--border-width) solid var(--border-default);
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    text-align: left;
}

.jf-table td {
    padding: var(--space-1) var(--space-2);
    border-bottom: var(--border-width) solid var(--border-default);
    color: var(--text-primary);
}

.jf-table tr:hover td {
    background: var(--surface-hover);
}

.jf-table .jf-track-name {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.jf-track-playing {
    color: var(--accent);
}

.jf-button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-height: var(--control-sm);
    padding: 0 var(--space-2);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--control-radius);
    background: var(--surface-raised);
    color: var(--text-primary);
    font: inherit;
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background-color var(--motion-fast) var(--motion-ease);
}

.jf-button:hover {
    background: var(--surface-hover);
}

.jf-button:focus-visible {
    outline: var(--focus-ring-width) solid var(--focus-ring);
    outline-offset: var(--focus-ring-offset);
}

.jf-button[disabled] {
    opacity: var(--state-disabled-opacity);
    cursor: default;
}

.jf-button-primary {
    border-color: transparent;
    background: var(--accent);
    color: var(--accent-contrast);
}

.jf-button-primary:hover {
    background: var(--accent-hover);
}

.jf-button-quiet {
    border-color: transparent;
    background: transparent;
}

.jf-button-danger {
    border-color: var(--danger);
    color: var(--danger);
}

.jf-button-danger:hover {
    background: var(--danger-bg, var(--surface-hover));
    color: var(--danger);
}

.jf-input {
    width: 100%;
    min-height: var(--control-md);
    padding: 0 var(--space-2);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--control-radius);
    background: var(--surface-inset);
    color: var(--text-primary);
    font: inherit;
    font-size: var(--text-sm);
}

.jf-input:focus-visible {
    outline: var(--focus-ring-width) solid var(--focus-ring);
    outline-offset: var(--focus-ring-offset);
}

.jf-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-3);
}

.jf-label {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
}

.jf-note {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-muted);
    line-height: var(--leading-normal);
}

.jf-error {
    margin: 0 0 var(--space-3);
    padding: var(--space-2) var(--space-3);
    border: var(--border-width) solid var(--danger);
    border-radius: var(--control-radius);
    background: var(--surface-inset);
    color: var(--danger);
    font-size: var(--text-sm);
}

.jf-empty {
    padding: var(--space-5);
    border: var(--border-width) dashed var(--border-default);
    border-radius: var(--control-radius);
    color: var(--text-muted);
    font-size: var(--text-sm);
    text-align: center;
}

/* The left nav — the slot the channel list normally occupies. */
.jf-nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    height: 100%;
    padding: var(--space-3) var(--space-2);
    background: var(--roomlist-bg);
    overflow-y: auto;
}

.jf-nav-heading {
    margin: 0 0 var(--space-1);
    padding: 0 var(--space-2);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--text-muted);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
}

.jf-nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-1) var(--space-2);
    border: none;
    border-radius: var(--control-radius);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
}

.jf-nav-item:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
}

.jf-nav-item[aria-current="page"] {
    background: var(--state-selected);
    color: var(--text-primary);
    font-weight: var(--weight-semibold);
}

.jf-nav-glyph {
    width: var(--icon-md);
    text-align: center;
}

.jf-nav-footer {
    margin-top: auto;
    padding: var(--space-2);
    border-top: var(--border-width) solid var(--border-default);
}

.jf-nav-server {
    margin: 0 0 var(--space-1);
    font-size: var(--text-xs);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* The settings surface — server, cache, and the way out. */
.jf-settings {
    max-width: 420px;
    margin: 0 auto;
    padding: var(--space-1) 0 var(--space-5);
}

.jf-settings-group {
    margin-bottom: var(--space-5);
    padding: var(--space-3) var(--space-4);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--control-radius);
    background: var(--surface-inset);
}

.jf-settings-title {
    margin: 0 0 var(--space-3);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-wide);
    color: var(--text-secondary);
}

.jf-settings-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
}

.jf-settings-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
    font-size: var(--text-sm);
}

.jf-settings-row dt {
    color: var(--text-muted);
}

.jf-settings-row dd {
    margin: 0;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.jf-settings-size {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
    margin: 0 0 var(--space-3);
    font-size: var(--text-sm);
}

.jf-settings-size-label {
    color: var(--text-muted);
}

.jf-settings-size-value {
    font-variant-numeric: tabular-nums;
}

.jf-settings-actions {
    display: flex;
    gap: var(--space-2);
}

.jf-settings-disconnect {
    width: 100%;
    margin-top: 0;
}

/* The connect form. */
.jf-connect {
    max-width: 420px;
    margin: 0 auto;
    padding: var(--space-5) var(--space-4);
}

.jf-connect h2 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xl);
    font-weight: var(--weight-semibold);
}

.jf-tabs {
    display: flex;
    gap: var(--space-1);
    margin-bottom: var(--space-3);
}

.jf-tab {
    padding: var(--space-1) var(--space-3);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--control-radius);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: var(--text-sm);
    cursor: pointer;
}

.jf-tab[aria-selected="true"] {
    background: var(--state-selected);
    color: var(--text-primary);
    font-weight: var(--weight-semibold);
}

/* The player — the pane's bottom bar. */
.jf-player {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
        "controls now queue"
        "progress progress progress";
    align-items: center;
    gap: var(--space-2) var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: var(--surface-pane);
    color: var(--text-primary);
    font-family: var(--font-sans);
}

.jf-player-controls {
    grid-area: controls;
    display: flex;
    align-items: center;
    gap: var(--space-1);
}

.jf-player-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--control-md);
    height: var(--control-md);
    border: none;
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--text-primary);
    font-size: var(--icon-md);
    line-height: var(--leading-none);
    cursor: pointer;
}

.jf-player-button:hover {
    background: var(--surface-hover);
}

.jf-player-button:disabled {
    opacity: var(--state-disabled-opacity);
    cursor: default;
}

.jf-player-play {
    background: var(--accent);
    color: var(--accent-contrast);
}

.jf-player-play:hover {
    background: var(--accent-hover);
}

.jf-player-now {
    grid-area: now;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
}

.jf-player-art {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--avatar-lg);
    height: var(--avatar-lg);
    overflow: hidden;
    border-radius: var(--radius-sm);
    background: var(--surface-inset);
    color: var(--text-muted);
}

.jf-player-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.jf-player-text {
    min-width: 0;
}

.jf-player-title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.jf-player-sub {
    font-size: var(--text-xs);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.jf-player-time {
    font-size: var(--text-xs);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
}

.jf-player-right {
    grid-area: queue;
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.jf-player-progress {
    grid-area: progress;
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.jf-range {
    flex: 1;
    height: var(--control-sm);
    accent-color: var(--accent);
}

.jf-volume {
    width: 90px;
}

/* The queue — a panel that rises out of the bar. */
.jf-queue {
    position: absolute;
    right: var(--space-3);
    bottom: 100%;
    width: min(420px, 80vw);
    max-height: 320px;
    overflow-y: auto;
    padding: var(--space-2);
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--control-radius);
    background: var(--surface-raised);
    box-shadow: var(--shadow-md);
}

.jf-queue-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 var(--space-1);
    padding: 0 var(--space-1);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--text-muted);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
}

.jf-queue-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-1);
    border-radius: var(--control-radius);
}

.jf-queue-item:hover {
    background: var(--surface-hover);
}

.jf-queue-item[aria-current="true"] .jf-queue-name {
    color: var(--accent);
}

.jf-queue-name {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.jf-queue-remove {
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: var(--text-sm);
}

.jf-queue-remove:hover {
    color: var(--danger);
}

.jf-spinner {
    padding: var(--space-4);
    color: var(--text-muted);
    font-size: var(--text-sm);
    text-align: center;
}
`;
