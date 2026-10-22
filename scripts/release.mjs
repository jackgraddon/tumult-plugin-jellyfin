#!/usr/bin/env node
/**
 * Release in one sweep: set the version, commit it, tag it, push both.
 *
 *     pnpm release v0.2.0
 *
 * The version lives in two places — `tumult.plugin.json` (what the installer
 * reads) and the manifest literal in `src/index.ts` (what the bundle carries,
 * so the running plugin can report itself). They must agree, so this script
 * writes both, commits them as `chore(release): v<version>`, tags that commit
 * `v<version>`, and pushes the branch and the tag atomically. When the
 * manifests already carry the version (it was bumped by hand), the empty
 * commit is skipped and the current commit is tagged.
 *
 * It refuses to start on a dirty tree or off `main`, and it runs the same
 * checks CI does — shim drift, typecheck, a single-file build and its hash —
 * BEFORE the tag exists. A tag whose build fails is a release nobody can
 * install, and deleting a pushed tag is the sort of cleanup this script exists
 * to avoid.
 *
 * The Release workflow does the rest: on the tag it rebuilds, checks the tag
 * against `tumult.plugin.json`, and publishes `plugin.js` plus the hashed
 * release manifest.
 *
 * `--dry-run` runs every check, prints the plan and stops before writing.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MANIFEST = "tumult.plugin.json";
const SOURCE = "src/index.ts";
const BRANCH = "main";

process.chdir(ROOT);

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const input = argv.find((arg) => !arg.startsWith("-"));

/** `X.Y.Z`, nothing else: the tag is `v` + this, compared literally by CI. */
const PLAIN_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

function fail(message) {
    console.error(`\n${message}\n`);
    process.exit(1);
}

function git(...args) {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function run(command, args) {
    execFileSync(command, args, { stdio: "inherit" });
}

function parseVersion(text) {
    const match = PLAIN_VERSION.exec(text);
    return match ? match.slice(1).map(Number) : null;
}

function compare(left, right) {
    for (let index = 0; index < 3; index++) {
        if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
}

if (!input) {
    fail(
        "Usage: pnpm release <version>\n\n" +
            "  pnpm release v0.2.0\n\n" +
            "Add --dry-run to check everything and stop before writing.",
    );
}

const version = input.replace(/^v/, "");
const next = parseVersion(version);
if (!next) {
    fail(`"${input}" is not a plain version. Use X.Y.Z — the tag adds the v: pnpm release v0.2.0`);
}

// ── Preflight ──────────────────────────────────────────────────────────────
try {
    git("rev-parse", "--is-inside-work-tree");
} catch {
    fail("This is not a git repository.");
}

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== BRANCH) {
    fail(`You are on "${branch}". Release from ${BRANCH}; a tag on another branch ships code nobody expects.`);
}

const dirty = git("status", "--porcelain");
if (dirty !== "") {
    fail(`The working tree is not clean — commit or stash first:\n\n${dirty}`);
}

console.log("Fetching origin…");
run("git", ["fetch", "--tags", "origin"]);
try {
    // Fails when origin/main has commits this checkout has not — pushing
    // would then either conflict or ship a tag without them.
    execFileSync("git", ["merge-base", "--is-ancestor", `origin/${BRANCH}`, "HEAD"], { stdio: "ignore" });
} catch {
    fail(`origin/${BRANCH} has commits this checkout does not. Pull first.`);
}

const manifestText = readFileSync(MANIFEST, "utf8");
const manifest = JSON.parse(manifestText);
const current = parseVersion(manifest.version);
if (!current) {
    fail(`${MANIFEST} has a version this script cannot read: ${manifest.version}`);
}
if ((manifestText.match(/"version":\s*"[^"]*"/g) ?? []).length !== 1) {
    fail(`${MANIFEST} has more than one "version" — the script will not guess which is the plugin's.`);
}
if (compare(next, current) < 0) {
    fail(`${MANIFEST} is already at ${manifest.version}; ${version} would go backwards.`);
}

const source = readFileSync(SOURCE, "utf8");
const sourceVersion = /version:\s*"([^"]*)"/.exec(source);
if (!sourceVersion) {
    fail(`Could not find a \`version: "..."\` in ${SOURCE}.`);
}
if (sourceVersion[1] !== manifest.version) {
    fail(`${SOURCE} says ${sourceVersion[1]} but ${MANIFEST} says ${manifest.version}; align them first.`);
}
if ((source.match(/version:\s*"[^"]*"/g) ?? []).length !== 1) {
    fail(`${SOURCE} has more than one \`version: ...\` — the script will not guess which one is the manifest.`);
}

const tag = `v${version}`;
if (git("tag", "--list", tag) !== "") {
    fail(`Tag ${tag} already exists locally.`);
}
if (git("ls-remote", "--tags", "origin", `refs/tags/${tag}`) !== "") {
    fail(`Tag ${tag} already exists on origin.`);
}

// ── The checks CI runs on the tag ──────────────────────────────────────────
console.log("\nRunning the checks CI runs…");
run("pnpm", ["shim"]);
if (git("status", "--porcelain", "--", "src/shims/vue.ts") !== "") {
    fail("src/shims/vue.ts drifted from the installed vue. Commit the regenerated shim, then release again.");
}
run("pnpm", ["typecheck"]);
run("pnpm", ["release:dry"]);

console.log(`\n${manifest.version} → ${version}`);
console.log(
    compare(next, current) === 0
        ? "  commit   (none — the manifests already say so)"
        : `  commit   chore(release): ${tag}`,
);
console.log(`  tag      ${tag}`);
console.log(`  push     origin ${BRANCH} + ${tag}`);

if (dryRun) {
    console.log("\nDry run: nothing written, nothing pushed.");
    process.exit(0);
}

// ── Write, commit, tag, push ───────────────────────────────────────────────
// Replace the value in place rather than re-serialising: the manifest's
// formatting (inline arrays, key order) should not churn in a release commit.
writeFileSync(MANIFEST, manifestText.replace(/"version":\s*"[^"]*"/, `"version": "${version}"`));
writeFileSync(SOURCE, source.replace(/version:\s*"[^"]*"/, `version: "${version}"`));

if (git("status", "--porcelain", "--", MANIFEST, SOURCE) === "") {
    console.log("\nThe manifests already carry this version — tagging the current commit.");
} else {
    console.log("\nCommitting…");
    run("git", ["add", MANIFEST, SOURCE]);
    run("git", ["commit", "-m", `chore(release): ${tag}`]);
}

console.log("Tagging…");
run("git", ["tag", "-a", tag, "-m", tag]);

console.log("Pushing…");
try {
    // Atomic: the branch and the tag land together, or neither does. A tag
    // without its commit is a release that builds the wrong code.
    run("git", ["push", "--atomic", "origin", BRANCH, `refs/tags/${tag}`]);
} catch {
    fail(
        "The commit and tag are local, but the push failed.\n\n" +
            `Finish it with:\n  git push origin ${BRANCH}\n  git push origin ${tag}`,
    );
}

const remote = git("remote", "get-url", "origin")
    .replace(/\.git$/, "")
    .replace(/^git@([^:]+):/, "https://$1/");
console.log(`\n${tag} pushed. The Release workflow is building it:`);
console.log(/^https?:\/\//.test(remote) ? `  ${remote}/releases/tag/${tag}\n` : `  (no web URL for remote "${remote}")\n`);
