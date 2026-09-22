# Agent playbook

`@johnhenry/http-converter` — a browser-compatible HTTP format converter
(string/HAR/cURL/fetch, bidirectional). Single package, Node >= 26, `node
--test` for tests, ships source (no build step — `index.mjs` and friends are
published as-is). The library targets browsers first: avoid adding any
Node-only API to the shipped modules (`fs`, `path`, etc.) — only `test/`,
`examples/`, and tooling may use them.

`CLAUDE.md` in this directory is a symlink to this file.

## The verification loop (before every push)

1. `npm run lint`
2. `npm test` — `node --test test/**/*.test.mjs`.
3. `npm run examples` — both scripts in `examples/` exit non-zero on the
   first thrown error; a change that silently breaks output (e.g. printing
   `Promise { ... }` instead of a string) won't fail `npm test`, only this.
4. A genuinely fresh clone:
   `git clone . /tmp/http-converter-verifyN && cd $_ && npm ci && npm test`.
   This is the only way to catch a `files` entry missing from `package.json`
   for one of the format subpaths (`string/`, `har/`, `curl/`, `fetch/`,
   `body/`, `random/`).
5. Commit, push, close the issue with a comment naming the commit SHA.

CI (`.github/workflows/ci.yml`) runs lint, test, and examples in that order;
match it locally.

## Repo-specific gotchas

- **Every `fromRequest`/`toCode`/`stringify*` function is `async`, even
  when the underlying work is synchronous.** They must support native
  `Request`/`Response` inputs that require awaiting `.text()`. A refactor
  that adds a new conversion function should default to `async` and update
  every call site (README, TYPESCRIPT.md, `types.d.ts`, examples) in the
  same change — a prior refactor missed several of these and shipped three
  separate bugs (see CHANGELOG's `0.0.0` entry) before they were all found.
- **The cURL tokenizer is a real character-level parser, not a regex.**
  Chrome/Firefox's "Copy as cURL" output embeds escaped apostrophes
  (`'it'\''s'`) that a naive single-regex split mangles. Any change to
  `curl/index.mjs`'s tokenizer needs a round-trip test against that exact
  pattern, not just a simple flag/value case.
- **`core/utils.mjs` exports are re-exported from the package root
  (`index.mjs`) and must stay in sync with `types.d.ts`.** A function
  declared in the root's type definitions but only reachable via
  `http-converter/core/utils` at runtime is a real bug that shipped once
  already.

## Definition of done

A change is done when all of the following hold, not just when tests pass:
- A regression test exists for any bug fixed.
- Anything the feature does **not** do is stated in the README's
  [Honest limitations](README.md#honest-limitations) section, not only in
  an issue comment.
- `CHANGELOG.md` has an entry citing the commit.
- If the change touches a format's shape, `examples/README.md`'s
  "Demonstrates" claims still match what the example actually proves.

## Releases

Bump `version` in `package.json` in a PR, add the `CHANGELOG.md` entry, merge,
then `gh release create v<version>` — the release event triggers
`.github/workflows/publish.yml`, which is idempotent (skips if the version is
already on npm).
