---
title: 'Android'
weight: 55
description:
  'Run server-rendered AngularTS screens in Android navigation and add native
  controls where the web page needs Android behavior.'
---

Angular Native keeps the server and HTML in charge of most screens. Android owns
navigation, system access, and any controls that need native behavior. You can
move one control or one destination to native UI without turning the whole
application into a client-rendered app.

## Add the Android packages

Use the same version as `@angular-wave/angular.ts`:

```text
dependencies {
    implementation("io.github.angular-wave:angular-native-core:{{< version >}}")
    implementation("io.github.angular-wave:angular-native-navigation:{{< version >}}")
}
```

Add `angular-native-browser` only when external HTTP links should open in
Android Custom Tabs:

```text
dependencies {
    implementation("io.github.angular-wave:angular-native-browser:{{< version >}}")
}
```

The optional package discovers its route handler automatically. Without it,
external links continue through Android's normal system routing.

Add `angular-native-paging` only when a native collection reads from Android
Paging 3:

```text
dependencies {
    implementation("io.github.angular-wave:angular-native-paging:{{< version >}}")
}
```

Install optional platform SDKs only when a screen uses them:

```text
dependencies {
    implementation("io.github.angular-wave:angular-native-credentials:{{< version >}}")
    implementation("io.github.angular-wave:angular-native-maps:{{< version >}}")
    implementation("io.github.angular-wave:angular-native-media:{{< version >}}")
}
```

Adding one of these packages is enough: Android registers it during application
startup without an application-side registration call. `credentials` provides
password and passkey operations through Android Credential Manager. `media`
provides Media3 playback without adding Media3 to the base shell. `maps` adds
the catalog `map` element; configure the Google Maps API key in the application
manifest as required by the Maps SDK.

Do not install all optional packages by default. Keeping them separate avoids
initializing SDKs and shipping dependencies that a screen does not use.

The app needs network access for server-rendered pages:

```html
<uses-permission android:name="android.permission.INTERNET" />
```

System back and predictive-back gestures work through AndroidX Navigation. The
navigation package opts into predictive back and makes the selected navigator
host Android's primary navigation fragment, including when bottom tabs switch.
Do not add an Activity back callback for normal page history; add one only for
temporary UI that must consume Back, such as an unsaved-form confirmation.

Native navigation uses one Android back stack. Use `navigation.push`,
`navigation.replace`, `navigation.pop`, `navigation.modal`,
`navigation.deep-link`, or `navigation.external`. Push, replace, modal, and
deep-link accept `default`, `none`, `slide`, `fade`, `cover`, `dive`, or `flip`.
Android disables explicit motion when system animations are off.

A navigation command returns `phase: "accepted"` with a transaction ID. Treat
the matching `navigation.change` event as authoritative: it reports
`phase: "completed"` after Android commits the destination, or
`phase: "cancelled"` with `reason: "interrupted"`, `"destination-changed"`,
`"failed"`, or `"closed"`. Android back gestures emit one completed change
without replaying another navigation command.

AndroidX restores the route, route parameters, and back stack after process
recreation. Angular Native also restores an unconsumed navigation action or
modal result and delivers it once. It does not put response HTML or cached
snapshot HTML into Android saved state: the restored destination requests that
content again, avoiding Binder-size failures and stale page data.

Start with the complete
[`demo`](https://github.com/angular-wave/angular.ts/tree/master/integrations/android/demo).
It shows the `Application`, `AngularNativeActivity`, path configuration,
destinations, bottom tabs, file handling, and bridge components together.

## Add a native control to HTML

`ng-native-component` replaces the marked rectangle when the page runs inside
the Android shell. In a normal browser, the HTML fallback remains usable.

```html
<input ng-model="profile.name" aria-label="Name" />
<div
  ng-native-component="text-field"
  ng-model="profile.name"
  data-props="{ label: 'Name' }"
></div>
```

The model works in both directions. AngularTS sends model, required, disabled,
and validation state to Android. Android changes update the same `ng-model` and
blur marks it as touched.

File selection uses the same model binding. Android returns content URI records,
not filesystem paths:

```html
<div
  ng-native-component="file-picker"
  ng-model="attachments"
  data-props="{ accept: ['image/*'], multiple: true }"
></div>
```

The native button opens Android's document picker. Cancelling leaves the model
unchanged. A successful selection assigns an array of
`{ uri, name, size, type, persisted }` records when `multiple` is true, or one
record when it is false.

Native `list` and `grid` children require a unique `key`. The key lets Android
reuse visible views and restore each item's state while large collections
scroll.

Native `tabs` use each child's `key` as their controlled string `value`; native
`pager` uses a zero-based integer `value`. Updating the model moves selection
without recreating keyed child views. A swipe or tab press emits `change`, and
`scrollTo` provides the same selection behavior for imperative native calls.

Native layout numbers use density-independent pixels. `width` and `height` set
an exact size; without them, containers fill the available width and either wrap
their content or fill the available height when the component is a `scroll`,
`scaffold`, `tabs`, or `pager`. Use `minWidth`, `minHeight`, and `spacing` for
constraints and gaps. `horizontalAlignment` accepts `start`, `center`, `end`, or
`stretch`; `verticalAlignment` accepts `top`, `center`, `bottom`, or `stretch`.
Layout updates keep keyed child views and reset omitted values to their
documented defaults.

## Style native controls with CSS

Native elements use the page's computed CSS. Keep behavior and accessibility in
HTML, then reuse classes instead of repeating presentation attributes. Angular
Native resolves CSS variables, inheritance, and the cascade before it sends
styles to Android.

<!-- tested-by: src/directive/native/native.spec.ts -->

```html
<ng-native-text class="page-title" text="Pulse"></ng-native-text>
```

```css
.page-title {
  color: var(--primary);
  font-family: Georgia, serif;
  font-size: var(--text-2xl);
  font-weight: var(--font-weight-bold);
}
```

The supported CSS projection covers foreground and background colors,
typography, dimensions and minimum sizes, padding, margins, gaps, borders,
radii, opacity, shadows, text alignment, `object-fit`, and `accent-color`. CSS
pixels map to Android density-independent pixels; font sizes map to scaled
pixels. Class and root-theme changes update mounted native views without
recreating keyed children.

Use the semantic tokens from Angular.css when the web and native versions of a
screen share a theme. Applications can override `--background`, `--foreground`,
`--primary`, `--accent`, `--muted`, spacing, radius, and typography tokens in
their own stylesheet. Android receives resolved values, so it does not need to
parse CSS or know which token library supplied them.

Use `ng-native-event` for native events and `ng-native` for methods or platform
capabilities. Calls are ignored when no native bridge is available, so keep a
normal HTML path for essential actions.

For current location, declare coarse or fine location permission in the Android
manifest, request it while the destination is visible, then call the location
capability:

<!-- tested-by: src/directive/native/native.spec.ts -->

```html
<button
  ng-native="geolocation.current"
  data-on-result="position = $result"
  data-on-error="locationError = $error.message"
>
  Use my location
</button>
<p ng-if="position">{{ position.latitude }}, {{ position.longitude }}</p>
```

<!-- tested-by: integrations/android/navigation-fragments/src/test/kotlin/io/github/angularwave/android/navigation/bridge/AndroidNativeCapabilitiesTest.kt -->

```html
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

Call `permissions.request` first when `geolocation.status` reports that access
has not been granted. Its `accuracy` result is `fine`, `coarse`, or `null`, so a
coarse-only grant is reported as usable without claiming precise access.
`geolocation.current` rejects with `denied`, `unavailable`, or `interrupted`
instead of returning stale coordinates. Aborting the browser call cancels the
Android location request.

Use the system camera when a page needs a new image. Angular Native stores the
capture behind a content URI and deletes an unfinished capture:

<!-- tested-by: src/directive/native/native.spec.ts -->

```html
<button
  ng-native="camera.capture"
  data-on-result="photo = $result"
  data-on-error="cameraError = $error.message"
>
  Take photo
</button>
<img ng-if="photo" ng-src="{{ photo.uri }}" alt="Captured photo" />
```

<!-- tested-by: integrations/android/navigation-fragments/src/test/kotlin/io/github/angularwave/android/navigation/bridge/AndroidNativeCapabilitiesTest.kt -->

The result is `{ uri, name, size, type }`. Check `camera.status` before showing
the action on devices without a camera.

Optional native capabilities appear in the environment capability list only when
their artifact is installed. Use `$native.supports(target, method)` before
showing an action. Media sources must use `https`, `content`, or
`android.resource`; local file URLs are rejected. Credential and media work is
cancelled when its destination is removed. The map element preserves its camera
position, forwards Android lifecycle changes, and emits `ready`, `cameraChange`,
`markerClick`, and `mapClick` events.

Call `connectivity.watch` or `lifecycle.watch` to receive `change` events for
the current destination. Call the matching `unwatch` method when the page no
longer needs them. Removing the destination also stops both subscriptions.

Call `window.status` for the current window width, height, orientation,
safe-area insets, and width and height size classes. Use `window.watch` when a
layout must react while the app is resized, rotated, folded, or moved into split
screen. Its `change` event also includes `displayFeatures`; folds and hinges
report their orientation, state, separating behavior, and bounds in
density-independent pixels. Call `window.unwatch` when the destination no longer
needs updates.

Application libraries can add a native service by implementing
[`NativeCapabilityProvider`](https://github.com/angular-wave/angular.ts/blob/master/integrations/android/navigation-fragments/src/main/java/io/github/angularwave/android/navigation/bridge/NativeCapability.kt).
The provider receives a destination-scoped
[`NativeCapabilityContext`](https://github.com/angular-wave/angular.ts/blob/master/integrations/android/navigation-fragments/src/main/java/io/github/angularwave/android/navigation/bridge/NativeCapability.kt);
use its `emit` method instead of retaining the bridge or WebView. Targets,
methods, and event names must use lowercase kebab-case. Close listeners and
other resources from `NativeCapability.close`.

See the generated
[native element catalog](https://github.com/angular-wave/angular.ts/blob/master/integrations/android/NATIVE_ELEMENTS.md)
for every element name, property, method, and event. The generated
[native capability catalog](https://github.com/angular-wave/angular.ts/blob/master/integrations/android/NATIVE_CAPABILITIES.md)
lists each service, artifact, availability rule, permission, method, and event.

## Add an application component

Implement `NativeElementProvider` in the Android library that owns the UI. A
provider returns `NativeElementDefinition` values backed by a normal Android
`View` factory or `composeNativeElement`. Add the metadata compiler to that
library:

```text
plugins {
    id("com.android.legacy-kapt")
}

dependencies {
    implementation("io.github.angular-wave:angular-native-navigation:{{< version >}}")
    kapt("io.github.angular-wave:angular-native-elements-compiler:{{< version >}}")
}
```

Use the same `com.android.legacy-kapt` version as the application's Android
Gradle plugin. List every provided name in
`@RegisterNativeElementProvider("task-card", "task-status")`. The compiler
generates Java service-provider metadata, and Angular Native discovers the
provider when the shell starts. The application does not edit or call a central
component registry.

The published `io.github.angular-wave:angular-native-custom-elements-sample`
artifact contains the complete `task-card` `View` provider and `task-status`
Compose provider. Use it as a working reference; keep application components in
the Android library that owns their UI and dependencies.

Compose factories receive current properties and a scope with `context`,
`lifecycleOwner`, `savedStateOwner`, and `emit`:

<!-- tested-by: integrations/android/custom-elements-sample/src/test/kotlin/io/github/angularwave/android/sample/elements/TaskCardProviderTest.kt -->

```text
factory = composeNativeElement { properties ->
    Card(modifier = Modifier.clickable { emit("click") }) {
        Text(properties.string("text"))
    }
}
```

Keep component names in the library that implements them. Reject unknown input
in the definition, emit plain JSON event data, release listeners in `dispose`,
and save only transient UI state in `saveState`.

## Security

Every destination has a random session token. Android accepts bridge calls only
from the destination's original HTTP or HTTPS origin and rejects stale sessions.
Intent URLs are limited to `http`, `https`, `mailto`, `tel`, and `geo`. File
results use content URIs instead of filesystem paths.

Permission and file requests run only while their destination is visible. Calls
can be aborted with an `AbortSignal`; Android then suppresses queued work and
late replies. Destination removal rejects unfinished calls as interrupted.

## Validate an Android change

```bash
make -C integrations/android release-check
make -C integrations/kotlin check
make generated-check
```

`release-check` recreates an isolated Maven repository, publishes every Android
artifact into it, and compiles and shrinks a clean consumer. AngularTS
coordinates resolve only from that repository, so a stale artifact in
`mavenLocal()` or Maven Central cannot hide an incomplete publication. It also
signs all nine publications with a disposable test key and verifies every
signature without requiring release credentials.

The root release workflow publishes every Android artifact to Maven Central,
waits for its public POM, and blocks the npm/GitHub release if one is missing.

## Run the Pulse reference application

Pulse demonstrates a native photo feed, profiles, activity updates, native file
selection, and multipart uploads without application-specific Kotlin or Java
code. Start one Android emulator, then run:

```bash
make -C integrations/android sample-social-run
```

The command starts its local Node server, installs the sample, and opens it in
the emulator.

Pulse mounts one native `scaffold` containing its app bar, changing content, and
bottom navigation. Its path configuration sets `toolbar_enabled` to `false`
because the scaffold owns the app bar. Leave this property unset when the
fragment toolbar should remain visible. The sample demonstrates `fade`, `slide`,
`cover`, `dive`, and `flip` transitions on different routes.

The generic `AngularNativeHostActivity` reads its start URL and path
configuration from Android manifest metadata.

## Native collections

Use `list` for one-dimensional data and `grid` for columns. Every child must
have a stable `key`, an element `name`, and optional `props`. Updating the
collection runs a keyed diff. Unchanged visible children keep their Android
view, state, event wiring, and accessibility state.

Set `swipeEnabled` to emit `swipe` with the item key, index, and logical `start`
or `end` direction. Set `reorderEnabled` to enable long-press drag and emit
`move` with the key and old and new indexes. Treat both as controlled events:
update the server or client model and send the resulting child order back to the
collection. `list-item.selected` is controlled in the same way.

`pull-to-refresh` emits `refresh` and keeps showing its progress indicator while
`refreshing` is true. Collection scroll position and mounted child state
round-trip through the normal native element save and restore lifecycle.

For datasets backed by Android Paging 3, use `NativePagingAdapter` from
`angular-native-paging`. Its `loadState` event reports refresh, prepend, append,
empty, retryable, and end-of-list state. Attach `NativePagingLoadStateAdapter`
as a footer when the screen needs localized loading, retry, and end labels. Call
the Paging adapter's standard `retry()` and `refresh()` methods from those
actions.

When a physical device is available, run the additional hardware checks:

```bash
make -C integrations/android physical-check
```

You can also dispatch the `Android Physical Device` GitHub Actions workflow for
an exact commit. It records compatibility and performance evidence but does not
block a release. Portable CI, emulator-connected tests, package validation, and
clean Maven consumption remain mandatory.

The command rejects emulators, runs every connected test, then performs a keyed
update and scroll over 10,000 items. It captures AndroidX frame and memory
metrics and rejects updates that exceed the allocation cap. It also measures
1,000 JavaScript-to-Kotlin bridge calls and enforces bridge-latency and WebView
host-process memory ceilings. Versioned limits in
`config/benchmark-budgets.json` also fail the physical gate when startup, frame,
or memory metrics regress. The same device run generates a startup baseline
profile. Core and navigation AARs also ship narrow seed rules, so a clean
consumer receives useful startup guidance before the measured profile is
generated for the final application.

## Dialogs and other overlays

Use `dialog`, `bottom-sheet`, `drawer`, `menu`, `snackbar`, and `tooltip` for
transient native UI. Each supports `show`, `hide`, and `dismiss`. Their events
report user actions such as confirm, cancel, selection, and snackbar actions.
Only one overlay can own a destination at a time; showing another dismisses the
current one and returns accessibility focus to its trigger.

Drawer, dialog, and bottom-sheet restore open after destination recreation.
Menu, snackbar, and tooltip restore closed because they represent a temporary
interaction rather than destination state. Disposing the destination dismisses
its overlay without retaining its Activity, Fragment, WebView, or scope. See the
[native element catalog](https://github.com/angular-wave/angular.ts/blob/master/integrations/android/NATIVE_ELEMENTS.md)
for each element's properties and event payloads.
