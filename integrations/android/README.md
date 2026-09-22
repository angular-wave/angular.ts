# Angular Native for Android

Angular Native runs server-rendered AngularTS screens inside native Android
navigation. Applications keep their HTML and server behavior, then add native
components only where Android behavior is useful.

The integration is in preview. Its catalog and protocol are versioned and
validated by the normal AngularTS release checks.

See the [security model](SECURITY.md) and [compatibility matrix](COMPATIBILITY.md)
before shipping an application.

The generated [native element catalog](NATIVE_ELEMENTS.md) lists the currently
implemented names, properties, methods, events, and Android requirements.

## Modules

- `core` provides WebView sessions, bridge messaging, permissions, and networking.
- `navigation-fragments` provides native Android navigation.
- `browser` optionally opens external HTTP links in Android Custom Tabs.
- `credentials` optionally exposes Android Credential Manager passwords and passkeys.
- `maps` optionally renders the catalog `map` element with Google Maps.
- `media` optionally exposes Media3 playback.
- `paging` optionally renders native collections from Android Paging 3.
- `native-elements-compiler` generates discovery metadata for Kotlin providers.
- `demo` exercises the complete browser-to-Android integration.

The Gradle build reads its version directly from the root `package.json`.

```sh
make check
make package-check
```

Publication is controlled by the root AngularTS release process.

## Install

Use the same version as the JavaScript runtime:

```kotlin
dependencies {
    implementation("io.github.angular-wave:angular-native-core:<version>")
    implementation("io.github.angular-wave:angular-native-navigation:<version>")
}
```

Add Paging 3 only to screens backed by a `PagingSource`:

```kotlin
dependencies {
    implementation("io.github.angular-wave:angular-native-paging:<version>")
}
```

Add only the platform SDKs used by the application:

```kotlin
dependencies {
    implementation("io.github.angular-wave:angular-native-credentials:<version>")
    implementation("io.github.angular-wave:angular-native-maps:<version>")
    implementation("io.github.angular-wave:angular-native-media:<version>")
}
```

Optional artifacts register themselves during Android application startup. Apps
do not call a registration API.

The maps artifact requires the normal Google Maps API-key manifest setup. Media
accepts `https`, `content`, and `android.resource` sources; it rejects filesystem
URLs. Credential operations are cancelled when their destination is removed.

The local release gate publishes every artifact to a clean isolated Maven
repository, then compiles and shrinks a consumer that resolves AngularTS
coordinates only from that repository. It also signs every publication with a
disposable test key and verifies the resulting signatures, so release signing
configuration is checked without access to release credentials. The root
release workflow publishes the same artifacts to Maven Central and verifies
each public signature, checksum, POM, Gradle module, binary, source JAR, and
Javadoc JAR before compiling a clean consumer and finishing the npm and GitHub
release.

## Native UI

HTML mounts a catalog component with `ng-native-component`. Add `ng-model` for
two-way form state and `ng-native-event` for events. The generated catalog is
the public source of component names and properties.

`file-picker` opens Android's document provider automatically when it has an
`ng-model`. Its model receives content URI metadata and never filesystem paths.
Native `list` and `grid` children require unique stable keys and use recyclable
Android views.

Native layout sizes, minimum constraints, padding, and spacing use
density-independent pixels. Layout containers fill their available width by
default and preserve keyed children when size or alignment properties change.

Native elements also receive their computed CSS. Reusable classes, inherited
styles, and Angular.css-compatible design tokens control colors, typography,
spacing, dimensions, borders, radii, opacity, shadows, image fitting, and
navigation accent colors without inline native presentation properties.

Application libraries add Android `View` implementations through
`NativeElementFactory` or Compose implementations through
`composeNativeElement`. Annotate their `NativeElementProvider` with every name,
for example `@RegisterNativeElementProvider("task-card")`, and process it with the
`angular-native-elements-compiler` artifact. Discovery then needs no central
registration API or hand-written service file.

`io.github.angular-wave:angular-native-custom-elements-sample` publishes the
repository's complete `View` and Compose provider example.

## Bridge security

Each WebView destination gets a random session token. AngularTS includes that
token in native calls, and Android accepts a call only while the WebView is on
the destination's original HTTP or HTTPS origin. Cross-origin frames and stale
documents cannot invoke native components or navigation.

## Attribution

See `THIRD_PARTY_NOTICES.md` for upstream source and license details.

## Collection performance

Native `list` and `grid` elements use stable-key diffs and RecyclerView reuse.
Opt into swipe and long-press reordering with `swipeEnabled` and
`reorderEnabled`. Use the optional `angular-native-paging` artifact for Paging
3 load states, retry, refresh, and localized status rows.

When a physical reference device is available, run `make physical-check` to add
hardware evidence. It rejects emulators, runs every connected test, then runs
the strict benchmark. The benchmark covers a keyed 10,000-item update, recycled
scrolling, frame timing, memory use, and a hard allocation cap. It also measures
1,000 JavaScript-to-Kotlin bridge calls and enforces bridge-latency and WebView
host-process memory ceilings. Versioned limits in
`config/benchmark-budgets.json` reject hardware regressions without making a
permanently attached device a release requirement.

Run `make benchmark-emulator-smoke-check` to verify the benchmark interactions
on an emulator. Emulator measurements are not release evidence; AndroidX
rejects them from `physical-benchmark-check`.

CI stores benchmark JSON, generated profiles, logs, and Perfetto traces in the
stable API 36 phone's device-evidence artifact.

The optional `Android Physical Device` workflow runs connected tests and strict
benchmarks on a self-hosted runner labeled `android` and `physical`, then
retains its evidence for 90 days. Use it to track hardware-specific behavior
when a device is available. Releases depend on portable CI and emulator tests,
not on a permanently attached device. `make android-physical-evidence-check`
remains available when a team explicitly wants to verify an exact-commit
hardware run.

Maven Central versions are immutable. If validation fails after publication,
stop the remaining release jobs, record the affected coordinates in the
changelog, and publish a corrected patch version. Never overwrite or reuse the
failed version. Every bridge or catalog change must include migration notes in
the changelog before release.

## Pulse reference application

Pulse is a complete server-driven photo-sharing application built entirely
from AngularTS native elements and capabilities. Its application module has no
custom Kotlin or Java source. Start one emulator and run:

```bash
make -C integrations/android sample-social-run
```

See `sample-social/README.md` for the implemented journeys and local server.

The physical benchmark also generates the application's startup baseline
profile. Core and navigation AARs package narrow seed profiles for clean Maven
consumers.

## Native overlays

Dialog, bottom-sheet, drawer, menu, snackbar, and tooltip elements share one
destination-scoped lifecycle. Showing a new overlay dismisses the current one,
dismissal returns accessibility focus to the trigger, and destination disposal
releases all platform references. Drawer, dialog, and bottom-sheet restore open
after recreation; menu, snackbar, and tooltip restore closed. Dialogs cancel on
outside taps, and bottom sheets cancel when dragged closed.
