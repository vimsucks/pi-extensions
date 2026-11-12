# Pi Extensions

Personal extensions for the [Pi coding agent](https://pi.dev/).

## Installation

Install this repository as a Pi package:

```sh
pi install git:github.com/vimsucks/pi-extensions
```

For local development, install the checkout instead:

```sh
pi install /path/to/pi-extensions
```

Do not load both installations at the same time. Run `/reload` in Pi after changing a local checkout.

## Extensions

- [Herdr session title](#herdr-session-title): synchronize a Pi session name with its Herdr App tab.
- [pi-goon](packages/pi-goon/README.md): continue a session without a new model prompt.
- [pi-user-message-box](packages/pi-user-message-box/README.md): render user messages in a bordered box.
- [pi-inline-skills](packages/pi-inline-skills/README.md): invoke skills with inline mentions.

The last three extensions were migrated from their respective standalone repositories. Those archived repositories retain their original commit histories. Their individual licenses and attribution notices remain in `packages/`.

## Herdr session title

In a local Herdr App terminal, this extension synchronizes a named interactive Pi session with its tab name. It restores the prior name when Pi exits normally or the session name is cleared. It stops managing the name when it detects a manual rename or more than one terminal in the tab.

It requires `hc` and a running `herdr-app` on `PATH`. It does not handle remote machines, abnormal exits, or tab changes made while the app is unavailable. A name equal to the tab's position is treated as an unnamed tab. Manual changes are checked only when the session starts, changes name, switches, or exits; a change reverted between checks cannot be detected.

## Test

```sh
npm test
```

For each migrated extension, run the development checks in its README. The TypeScript extensions use their own lockfiles and development dependencies.
