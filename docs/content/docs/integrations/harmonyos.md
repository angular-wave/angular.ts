---
title: 'HarmonyOS'
weight: 56
description:
  'Run AngularTS pages in ArkWeb and place ArkUI controls over the page when a
  screen needs native HarmonyOS behavior.'
---

Angular Native keeps HTML and the server in charge of the application. The
HarmonyOS shell owns navigation, system access, and controls that need ArkUI.
The same page continues to work in a normal browser because native elements
keep their HTML fallback.

All shared native elements and capabilities have HarmonyOS providers and
portable tests. The packages are not production releases until the official
API 26 build, device evidence, and public OHPM consumer checks pass.

## Choose packages

Every application starts with `@angular-wave/angular-native-harmony-core`.
Add only the packages used by the application:

| Package                                                  | Add it when                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `@angular-wave/angular-native-harmony-navigation`        | AngularTS routes should use ArkUI navigation and system back.      |
| `@angular-wave/angular-native-harmony-browser`           | External HTTP links should use the HarmonyOS resolver.             |
| `@angular-wave/angular-native-harmony-credentials`       | A page uses passkeys.                                              |
| `@angular-wave/angular-native-harmony-maps`              | A page contains the native map element.                            |
| `@angular-wave/angular-native-harmony-media`             | A page controls native audio or video playback.                    |
| `@angular-wave/angular-native-harmony-paging`            | A large keyed collection needs incremental native updates.        |
| `@angular-wave/angular-native-harmony-compiler`          | A library defines additional native elements for its applications. |

Do not add every optional package. Separate packages keep platform SDKs and
initialization work out of applications that do not use them.

## Prepare the project

Install Huawei's official command-line tools and the HarmonyOS API 26 SDK. The
tool bundle must provide `ohpm`, `hvigorw`, and `codelinter`. Point AngularTS at
an existing installation:

<!-- tested-by: integrations/harmonyos/scripts/check-toolchain.mjs -->

```bash
export HARMONY_COMMAND_LINE_TOOLS_HOME="$HOME/command-line-tools"
make -C integrations/harmonyos toolchain-check
```

The bootstrap target can install a local official archive without changing the
user's shell. It deliberately requires a SHA-256 digest; do not run an
unverified SDK archive.

<!-- tested-by: integrations/harmonyos/scripts/bootstrap-sdk.sh -->

```bash
HARMONY_COMMAND_LINE_TOOLS_ARCHIVE="$HOME/Downloads/command-line-tools-linux.zip" \
HARMONY_COMMAND_LINE_TOOLS_SHA256="<verified digest>" \
make -C integrations/harmonyos bootstrap
```

Open `integrations/harmonyos` in DevEco Studio when signing or device selection
needs the IDE. The `entry` module is the packaged proof application. It loads
the same AngularTS distribution that a release ships, not a development server.

## Add native UI to a page

Use AngularTS native elements in HTML. AngularTS resolves CSS,
accessibility data, model bindings, and events, then sends normalized values to
the HarmonyOS shell. ArkUI renders the native control on the same-layer surface.
Application code does not register built-in controls and does not contain
ArkTS component mappings.

Start with the packaged
[`proof.html`](https://github.com/angular-wave/angular.ts/blob/master/integrations/harmonyos/entry/src/main/resources/rawfile/proof.html).
The available elements and properties are listed in the
[`native element catalog`](https://github.com/angular-wave/angular.ts/blob/master/integrations/harmonyos/NATIVE_ELEMENTS.md).

Keep reusable colors, spacing, type sizes, and control defaults in CSS. Do not
repeat native properties on every element. The browser computes the styles;
HarmonyOS receives density-independent values and applies system font scale,
safe areas, right-to-left layout, dark mode, and reduced motion.

## Run the sample apps

Use the kitchen sink to inspect every native element and its current contract.
The page is generated from the shared catalogs, so checks fail when a property,
event, method, or capability is missing.

<!-- tested-by: integrations/harmonyos/samples/kitchen-sink/Makefile -->

```bash
make -C integrations/harmonyos/samples/kitchen-sink compile
```

Pulse is the larger sample. Android and HarmonyOS use the same
[HTML, JavaScript, routes, server, and assets](https://github.com/angular-wave/angular.ts/tree/master/integrations/native/samples/pulse).
The HarmonyOS project contains only the Stage-model shell.

Start its server first:

<!-- tested-by: integrations/native/samples/pulse/server.test.mjs -->

```bash
node integrations/native/samples/pulse/server.mjs --port 4175
```

Then build the HarmonyOS shell:

<!-- tested-by: integrations/harmonyos/samples/pulse/Makefile -->

```bash
make -C integrations/harmonyos/samples/pulse compile
```

`127.0.0.1` works only when the device forwards that port. On a physical or
cloud device, pass a reachable HTTPS or LAN URL as the `pulseUrl` Want
parameter. The shell rejects credentials, fragments, invalid URLs, and
non-HTTP schemes.

## Load server-rendered pages

Use HTTPS for pages loaded from a server. A phone's `localhost` is the phone,
not the development machine. Use a reachable development hostname or an `hdc`
port reverse while testing locally. Do not compile a workstation IP address
into the application.

The AngularTS router remains the source of route intent. HarmonyOS mirrors
committed routes into `NavPathStack`; ArkUI must not invent a second application
history. External HTTP and HTTPS locations go through the system resolver.

## Security

Every destination receives a random session token. The bridge accepts calls
only from that destination's normalized origin and rejects duplicate request
identifiers, undeclared methods, malformed native trees, oversized messages,
and calls made after disposal. Capability errors sent to a page use stable
public codes rather than platform exception details.

Declare only permissions used by installed capabilities. Keep credentials and
private keys out of pages, bridge payloads, package metadata, and repository
files. See the
[`HarmonyOS security model`](https://github.com/angular-wave/angular.ts/blob/master/integrations/harmonyos/SECURITY.md)
before adding a provider.

## Validate a change

Portable checks do not require the HarmonyOS SDK:

<!-- tested-by: integrations/harmonyos/Makefile -->

```bash
make -C integrations/harmonyos check
```

Relevant pull requests and updates to `master` also run a pinned public
OpenHarmony API 23 compiler audit. This catches ArkTS language and public API
regressions without treating that compatibility check as an API 26 release.

The release gate uses the official ArkTS compiler and Code Linter, builds every
HAR and HAP, and compiles an isolated application against the built HAR files:

<!-- tested-by: integrations/harmonyos/Makefile -->

```bash
make -C integrations/harmonyos release-check
```

Before publication, `publication-check` also requires complete Android/Harmony
contract parity and successful device or Huawei cloud evidence for the exact
commit. A green portable check is not a substitute for that evidence.

The native workflow accepts schema-v2 evidence only when the device run reports
no failed or skipped tests, names every contract from the current shared
catalogs exactly once, passes accessibility and performance checks, and
supplies JUnit output plus phone and tablet screenshots. This prevents stale
counts, an empty cloud job, or a single smoke test from being treated as
release evidence.

## Publish and verify

OHPM requires an authenticated account, an encrypted private key, and an
interactive terminal. After the publication gate passes, submit all packages
in dependency order:

<!-- tested-by: integrations/harmonyos/scripts/harmony-release.test.mjs -->

```bash
make -C integrations/harmonyos publish-release
```

OHPM reviews submissions before making them public. After approval, compile a
fresh application using exact versions from the registry:

<!-- tested-by: integrations/harmonyos/scripts/harmony-release.test.mjs -->

```bash
make -C integrations/harmonyos verify-published
```
