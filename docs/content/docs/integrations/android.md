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
startup without an application-side registration call. `credentials` provides password and passkey
operations through Android Credential Manager. `media` provides Media3 playback
without adding Media3 to the base shell. `maps` adds the catalog `map` element;
configure the Google Maps API key in the application manifest as required by
the Maps SDK.

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
`{ uri, name, size, type, persisted }` records when `multiple` is true, or one record when
it is false.

Native `list` and `grid` children require a unique `key`. The key lets Android
reuse visible views and restore each item's state while large collections
scroll.

Native `tabs` use each child's `key` as their controlled string `value`; native
`pager` uses a zero-based integer `value`. Updating the model moves selection
without recreating keyed child views. A swipe or tab press emits `change`, and
`scrollTo` provides the same selection behavior for imperative native calls.

Native layout numbers use density-independent pixels. `width` and `height` set
an exact size; without them, containers fill the available width and either
wrap their content or fill the available height when the component is a
`scroll`, `scaffold`, `tabs`, or `pager`. Use `minWidth`, `minHeight`, and
`spacing` for constraints and gaps. `horizontalAlignment` accepts `start`,
`center`, `end`, or `stretch`; `verticalAlignment` accepts `top`, `center`,
`bottom`, or `stretch`. Layout updates keep keyed child views and reset omitted
values to their documented defaults.

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
<p ng-if="position">
  {{ position.latitude }}, {{ position.longitude }}
</p>
```

<!-- tested-by: integrations/android/navigation-fragments/src/test/kotlin/io/github/angularwave/android/navigation/bridge/AndroidNativeCapabilitiesTest.kt -->

```html
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

Call `permissions.request` first when `geolocation.status` reports that access
has not been granted. `geolocation.current` rejects with `denied`, `unavailable`,
or `interrupted` instead of returning stale coordinates. Aborting the browser
call cancels the Android location request.

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

Optional native capabilities appear in the environment capability list only
when their artifact is installed. Use `$native.supports(target, method)` before
showing an action.
Media sources must use `https`, `content`, or `android.resource`; local file URLs
are rejected. Credential and media work is cancelled when its destination is
removed. The map element preserves its camera position, forwards Android
lifecycle changes, and emits `ready`, `cameraChange`, `markerClick`, and
`mapClick` events.

Call `connectivity.watch` or `lifecycle.watch` to receive `change` events for
the current destination. Call the matching `unwatch` method when the page no
longer needs them. Removing the destination also stops both subscriptions.

Call `window.status` for the current window width, height, orientation, safe-area
insets, and width and height size classes. Use `window.watch` when a layout must
react while the app is resized, rotated, folded, or moved into split screen. Its
`change` event also includes `displayFeatures`; folds and hinges report their
orientation, state, separating behavior, and bounds in density-independent
pixels. Call `window.unwatch` when the destination no longer needs updates.

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
`@RegisterNativeElementProvider("task-card", "task-status")`. The
compiler generates Java service-provider metadata, and Angular Native discovers
the provider when the shell starts. The application does not edit or call a
central component registry.

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

The root release workflow publishes every Android artifact to Maven Central,
waits for its public POM, and blocks the npm/GitHub release if one is missing.
