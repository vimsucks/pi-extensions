# @vimsucks/pi-user-message-box

A focused [Pi](https://pi.dev/) extension that renders every user message in a bordered, theme-aware box.

```text
╭ user ─────────────────────────────────────╮
│                                           │
│ Explain why this test is flaky.           │
│                                           │
╰───────────────────────────────────────────╯

I will inspect the test and its shared state.
```

## Scope

This extension changes only the interactive rendering of normal user messages. It:

- does not register or override tools;
- does not change messages stored in the session;
- does not change messages sent to the model;
- preserves Markdown styling and terminal prompt markers;
- restores Pi's original renderer during reload and shutdown;
- falls back to Pi's renderer when the terminal is narrower than eight columns.

## Installation

Install or remove the [Pi extensions package](../../README.md#installation). Run `/reload` or restart Pi after changing the installation.

## Compatibility

Pi does not currently expose a public hook for replacing ordinary user-message rendering. This extension patches `UserMessageComponent.prototype.render`, so a future Pi release can require an update. Do not load it together with another extension that replaces the normal user-message renderer.

## Development

Use pnpm 12.12.0, pinned in `package.json`:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pi --no-extensions -e ./src/index.ts
```

The repository commits `pnpm-lock.yaml` for reproducible development installs. `.npmrc` and `publishConfig` use the public npm registry; do not add credentials to either file. Pi supplies the host packages at runtime, so they remain peer dependencies rather than bundled runtime dependencies. Development copies are used for checks and tests.


## Attribution and license

The user-message rendering implementation was extracted from [`MasuRii/pi-tool-display`](https://github.com/MasuRii/pi-tool-display) and simplified to remove all tool-rendering behavior. The original project is MIT licensed. See [NOTICE](NOTICE) and [LICENSE](LICENSE).
