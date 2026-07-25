# Vyrel Mobile smoke guide

Use an Expo SDK 57 development or preview build. Test both package IDs:

- iOS: `com.flavio-scimeca.vyrel-mobile`
- Android: `com.flavio_scimeca.vyrel_mobile`

## Automated checks

```sh
bun run --cwd apps/mobile check-types
bun run --cwd apps/mobile test
bun run --cwd apps/mobile expo:install-check
bun run --cwd apps/mobile expo:doctor
```

## Maestro setup

Maestro is a system CLI rather than a Bun dependency. It requires Java 17 or
newer. On macOS, install it with Homebrew:

```sh
brew tap mobile-dev-inc/tap
brew install mobile-dev-inc/tap/maestro
java -version
maestro --version
```

Install a development or preview build of Vyrel on a running iOS Simulator or
Android emulator before starting the suite. Expo Go is not sufficient for
native App Lock and keyboard-controller coverage.

Export the credentials for a disposable verified test account:

```sh
export TEST_EMAIL=user@example.com
export TEST_PASSWORD=your-test-password
export RESET_TOKEN=valid-reset-token
export INVITATION_ID=valid-invitation-id
```

Then run the platform-specific suite from the repository root:

```sh
bun run test:e2e:mobile:ios
bun run test:e2e:mobile:android
```

Suite order (see `.maestro/config.yaml`):

1. `sign-in` — clear state and authenticate
2. `task-lifecycle` — sign in, then create / edit / delete a task
3. `workspace-profile` — sign in, then workspaces / profile / appearance
4. `deep-links` — reset-password and invite deep links

Authenticated flows reuse `.maestro/shared/sign-in.yaml` via `runFlow`, so each
is self-contained (sign in first, then the feature steps).

`RESET_TOKEN` and `INVITATION_ID` are only required by `deep-links.yaml`. Run an
individual flow with `maestro test -e APP_ID=<bundle-id> <flow-file>` when those
values are unavailable.

## Device matrix

- Minimum supported iOS and Android versions.
- One small phone and one large phone per platform.
- System, light, and dark appearance.
- 200% text scaling.
- VoiceOver and TalkBack.
- Biometrics enrolled and unavailable/not enrolled.
- Online, offline, and connectivity recovery.

Verify that every control is at least 44×44 points, focused fields and primary
actions stay above the keyboard, tabs disappear while typing, and a seeded
500-task workspace scrolls without mounting the full list.

## Release gate

Run API, GraphQL, database migration, and mobile tests; regenerate GraphQL
artifacts; run Ultracite; then create an EAS preview build. Complete the device
matrix and all Maestro flows before creating production builds.
