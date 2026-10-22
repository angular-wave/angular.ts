# AngularTS Native for HarmonyOS

This integration targets HarmonyOS NEXT with ArkTS, ArkUI, ArkWeb, and public
HAR packages. The shared application API is defined in `../native/`.

See [shared model access](MODEL_ACCESS.md) for reactive state updates from native
callbacks through the destination's JavaScript bridge.

Huawei's command-line bundle includes the SDK, `ohpm`, Hvigor, and Code Linter.
Use an existing installation:

```bash
export HARMONY_COMMAND_LINE_TOOLS_HOME="$HOME/command-line-tools"
make -C integrations/harmonyos toolchain-check
```

For a reproducible local or CI installation, provide the official Linux archive
and its SHA-256 digest:

```bash
HARMONY_COMMAND_LINE_TOOLS_ARCHIVE="$HOME/Downloads/command-line-tools-linux.zip" \
HARMONY_COMMAND_LINE_TOOLS_SHA256="<official digest>" \
make -C integrations/harmonyos bootstrap
```

CI can use an authenticated Huawei download URL instead of a checked-in
archive:

```bash
HARMONY_COMMAND_LINE_TOOLS_URL="<signed official URL>" \
HARMONY_COMMAND_LINE_TOOLS_SHA256="<verified digest>" \
make -C integrations/harmonyos bootstrap
```

The bootstrap installs under `.tools/` without changing shell configuration.
Run `make harmonyos-contract-check` without an SDK or `make harmonyos-check`
with the toolchain installed. See `ROADMAP.md` for the production sequence.

An additional compiler audit is available without a Huawei developer account:

```bash
make -C integrations/harmonyos openharmony-audit
```

This streams only the pinned Linux ETS compiler from the official OpenHarmony
6.1 SDK, verifies the extracted compiler, and checks all application and package
ArkTS sources against API 23. It catches ArkTS language restrictions and public
OpenHarmony API drift. It does not provide HarmonyOS-only kits, compile the API
26 project, replace device tests, or satisfy `release-check`.
The companion `openharmony-build` target builds the proof and Pulse HAPs plus
the six compatible HARs. It first installs the pinned Hvigor tools and complete
public API 23 SDK, verifying both downloaded archives with SHA-256. It requires
Java 17, `curl`, `tar`, and `unzip`; the first run downloads the combined public
SDK archive. It excludes credentials and maps because Account Kit
and Map Kit require Huawei's API 26 SDK; their sources are still included in
the strict ArkTS audit through declaration-only stubs.
The HarmonyOS workflow runs both the audit and `openharmony-build`
automatically for relevant pull requests and updates to `master`, then retains
the commit-scoped API 23 packages for 14 days.

## Samples

The standalone kitchen sink is generated from every shared native contract:

```bash
make -C integrations/harmonyos/samples/kitchen-sink compile
```

The kitchen sink includes the optional maps HAR and passes
`harmonyMapControllerFactory` to its `AngularNativeDestination`. Compile it
with the official API 26 SDK; the public OpenHarmony build intentionally omits
this sample because Map Kit is unavailable there.

Pulse uses the platform-neutral application in `../native/samples/pulse` and a
HarmonyOS shell containing no application UI or feature logic:

```bash
node integrations/native/samples/pulse/server.mjs --port 4175
make -C integrations/harmonyos/samples/pulse compile
```

Pass a reachable `pulseUrl` Want parameter on physical or cloud devices. The
default `http://127.0.0.1:4175/` requires device-to-host port forwarding.

Pulse extends `AngularNativeNavigationAbility`, so HarmonyOS process recovery
recreates its AngularTS destination stack and restores native `scroll`, `list`,
`grid`, and `pull-to-refresh` positions. Applications with more than one
`AngularNativeNavigation` must assign each component a stable `recoveryKey`.
Recovery omits arbitrary route state, form data, and credentials; pages reload
private data from the server.

`make -C integrations/harmonyos release-check` compiles every HAR and HAP and
installs the packed HARs into clean consumers. It is the build gate, not
permission to publish.

`make -C integrations/harmonyos publication-check` additionally rejects every
provider still marked `planned` or `unavailable` and verifies successful device
or cloud evidence from `.github/workflows/harmonyos.yml` for the exact release
commit. Run this gate before publishing any HAR.

The staged release directory includes all eight HARs, `LICENSE`,
`dependencies.json`, `sbom.spdx.json`, `provenance.intoto.json`,
`manifest.json`, and `SHA256SUMS`. Device evidence captures this exact
directory, and publication verifies every required file and digest.

## Device or cloud command contract

Set the `HARMONY_DEVICE_TEST_COMMAND` repository secret to a command that
installs the built HAP, runs the native suites, and writes
`integrations/harmonyos/build/device-results/results.json`. The result must use
schema version 2 and identify the exact `GITHUB_SHA` and workflow
`device_name`. It must report:

- a physical or cloud phone, tablet, foldable, or 2-in-1 on API 26 or newer;
- no failed or skipped tests;
- the exact passed native-element and capability names from the shared
  catalogs, with no missing, extra, duplicate, or failed contracts;
- zero accessibility violations and performance failures;
- at least five performance iterations within the cold-start, first-reveal,
  bridge, navigation, scrolling, and memory budgets in
  `config/performance-budgets.json`;
- zero live destinations, watchers, overlays, media players, maps, file handles,
  and native nodes after each device suite;
- non-empty JUnit, accessibility, and performance reports;
- non-empty phone and tablet screenshots.

Paths in `results.json` are relative to the device-results directory. The
validator rejects absolute paths and parent traversal. See
`scripts/validate-device-results.test.mjs` for a complete executable fixture.

### Run the tracked device tests

The repository ships a Hypium test HAP that starts the proof application,
waits for its native ArkUI controls, enters a name, activates the native
button, verifies the bridge-driven result, and confirms that native state
survives an ability background and foreground cycle. This does not simulate
process death; recovery evidence must still come from the signed device or
cloud run. Build it with the same API 26 toolchain used for release:

```sh
make -C integrations/harmonyos device-test-build
```

Configure HarmonyOS signing so the main and `ohosTest` HAPs are signed, connect
one device through `hdc`, then run:

```sh
make -C integrations/harmonyos device-test-run
```

Set `HARMONY_MAIN_HAP` and `HARMONY_TEST_HAP` when the signed packages are not
under the normal `entry/build` output directory. The runner rejects zero or
multiple devices, unsigned packages, missing Hypium summaries, ignored tests,
and any failed test. It writes the raw log and parsed result to
`build/device-results/` for the release evidence adapter.

The clean-consumer check installs all eight built HAR files into a temporary
application and compiles it without resolving source packages from this
repository.

## Publish packages

OHPM publication requires an authenticated account, an encrypted private key,
and an interactive terminal. Configure `publish_registry`, `publish_id`, and
`key_path` with `ohpm config`, then run:

```sh
make -C integrations/harmonyos publish-release
```

OHPM reviews each submission before it becomes public. To resume after a
partial submission, skip packages that are still under review:

```sh
HARMONY_OHPM_SKIP_PACKAGES=core,navigation \
  make -C integrations/harmonyos publish
```

To publish the exact HARs retained by native CI instead of rebuilding them,
download the `harmonyos-hars-<commit>` artifact and set
`HARMONY_OHPM_ARTIFACT_DIR` to its extracted directory.

After OHPM approves every package, verify exact-version metadata and compile a
new application using only registry dependencies:

```sh
make -C integrations/harmonyos verify-published
```
