# Angular Native Android Roadmap

This roadmap turns Angular Native into a production Android integration while
keeping server-rendered AngularTS as the default application model. Native UI
is added when Android behavior, performance, accessibility, or platform access
justifies it.

## Target

Angular Native is production-ready when an application can:

- navigate server-rendered AngularTS screens through Android navigation;
- render the supported Android component catalog without application-level
  registration;
- use native components from HTML, TypeScript, and Kotlin AngularTS with the
  same names, properties, events, and behavior;
- preserve state through rotation, process recreation, back navigation, and
  WebView replacement;
- meet Android accessibility, focus, input-method, security, and lifecycle
  expectations;
- add any Compose or Android `View` implementation through Kotlin without
  modifying AngularTS or the bridge;
- publish reproducible, tested AARs from the normal AngularTS release.

“Native parity” does not mean wrapping every Android SDK class. The first-party
catalog covers common application UI and platform capabilities. The Kotlin
extension API is the parity escape hatch for specialized SDKs and application
components.

## Rules For Every Slice

- Add an element to `native-elements.json` before implementing it.
- Generate Android and Kotlin AngularTS APIs from the catalog. Do not duplicate
  wire names in handwritten integration code.
- Reject unknown elements, properties, methods, and events with a structured
  bridge error.
- Test the catalog contract, Android behavior, Kotlin API, and bridge message.
- Include accessibility semantics and saved-state behavior in the initial
  implementation, not as later cleanup.
- Keep optional SDKs such as maps, camera, and media in separate artifacts.
- A slice is complete only when its listed command passes.

## Status

- `[x]` complete
- `[ ]` not started
- `[~]` implementation exists but does not meet the exit criteria

## 0. Registry Foundation

Status: `[x]`

Delivered:

- `NativeElementDefinition`, `NativeElementFactory`, and
  `NativeElementInstance` contracts;
- native property typing and required-property validation;
- lifecycle, saved-state, event, and disposal hooks;
- canonical names and aliases with duplicate detection;
- automatic `NativeElementProvider` discovery;
- one catalog generating Android metadata and Kotlin AngularTS helpers;
- migrated `card`, `image`, and `drawer` implementations;
- stale-generation checks in the Android release gate.

Gate:

```sh
make -C integrations/android release-check
make -C integrations/kotlin check
```

## 1. Bridge Contract Hardening

Status: `[x]`

Implement:

- define versioned request, reply, event, and error JSON schemas;
- return stable error codes for unknown target, element, method, property,
  instance, origin, and session;
- validate property types before calling a factory or instance;
- guarantee exactly one reply for every request;
- isolate factory and event-handler exceptions from the UI thread;
- add request cancellation and timeout cleanup;
- cap message and property payload sizes;
- publish bridge capabilities and protocol version during session startup.

Tests:

- malformed and oversized message matrix;
- duplicate, late, cancelled, and exception-producing replies;
- stale session and cross-origin calls;
- unsupported element/property/method behavior;
- WebView teardown with pending calls.

Exit criteria:

- no bridge input can throw past the bridge boundary;
- every failure is observable by AngularTS as a typed rejection;
- protocol fixtures are shared by TypeScript, Kotlin AngularTS, and Android.

Gate:

```sh
./integrations/android/gradlew -p integrations/android \
  core:test navigation-fragments:test navigation-fragments:lint
make -C integrations/kotlin test
```

## 2. Catalog And Code Generation

Status: `[x]`

Implement:

- extend the catalog schema with category, maturity, minimum SDK, methods,
  defaults, nullability, state ownership, and accessibility requirements;
- generate Android identifiers so handwritten factories contain no wire-name
  strings;
- generate Kotlin AngularTS property builders, event payload types, and method
  helpers;
- generate TypeScript native-element contracts and documentation tables;
- generate parity tests comparing every runtime definition with the catalog;
- reject unknown property types and incomplete element declarations during
  generation;
- add a single root generation command covering Android and Kotlin outputs.

Tests:

- generator fixture tests for every property type;
- duplicate name, alias, method, property, and event failures;
- generated-output freshness tests;
- Android/Kotlin/TypeScript catalog parity.

Exit criteria:

- the JSON catalog is the only source of public wire names;
- changing one catalog entry updates all supported language APIs;
- stale output fails before compilation.

Gate:

```sh
make -C integrations/android generate-native-elements
make -C integrations/android generate-check
make -C integrations/kotlin check
```

## 3. Core Display And Action Components

Status: `[x]`

Implement these first-party elements:

- `text`
- `button`
- `icon`
- `image`
- `divider`
- `badge`
- `chip`
- `card`
- `progress`
- `loading-indicator`
- `floating-action-button`

Required behavior:

- Material theme colors, typography, shape, elevation, enabled state, and
  loading state;
- click, long-click, focus, and semantic events where applicable;
- image loading, cancellation, placeholder, error, content scale, and content
  description;
- Android resource references and plain JSON values;
- Compose implementations with `AndroidView` interoperability where needed.

Tests:

- create/update/dispose for every element;
- screenshots for light, dark, large-font, RTL, and disabled states;
- TalkBack role, label, state, action, and touch-target assertions;
- Kotlin AngularTS builder compilation for every element.

Exit criteria:

- no placeholder implementations remain in this category;
- updates preserve the existing native view and transient state.

Gate:

```sh
./integrations/android/gradlew -p integrations/android \
  navigation-fragments:test navigation-fragments:connectedCheck \
  navigation-fragments:lint
make -C integrations/kotlin check
```

## 4. Inputs And Forms

Status: `[x]`

Implement:

- `text-field`
- `search-field`
- `checkbox`
- `radio-group`
- `switch`
- `slider`
- `range-slider`
- `date-picker`
- `time-picker`
- `file-picker`

Required behavior:

- two-way `ng-model` synchronization without update loops;
- dirty, touched, required, disabled, pending, and validation state;
- keyboard type, IME action, autofill hints, selection, composition, and focus;
- activity-result contracts for files and media;
- content URI permissions rather than filesystem paths;
- state restoration without duplicate change events.

Tests:

- native-to-scope and scope-to-native updates;
- IME composition, focus movement, validation, autofill, and rotation;
- file cancellation, multiple selection, MIME filtering, and permission loss;
- accessibility state and error announcements.

Exit criteria:

- native controls can participate in an AngularTS form beside HTML controls;
- form submission produces one consistent model regardless of control origin.

Gate:

```sh
./integrations/android/gradlew -p integrations/android \
  navigation-fragments:test navigation-fragments:connectedCheck \
  demo:connectedCheck
make -C integrations/kotlin check
```

## 5. Layout And Scrolling

Status: `[x]`

Implement:

- `row`
- `column`
- `box`
- `surface`
- `scroll`
- `scaffold`
- `app-bar`
- `bottom-bar`
- `navigation-rail`
- `tabs`
- `pager`

Required behavior:

- nested native children with deterministic ownership and disposal;
- density-independent dimensions, constraints, insets, and safe areas;
- nested scrolling with WebView and native parents;
- RTL layout, orientation changes, and window-size classes;
- stable focus order and semantic traversal.

Tests:

- nested create, reorder, move, and remove operations;
- scroll position restoration;
- phone, tablet, foldable, portrait, landscape, RTL, and edge-to-edge fixtures;
- leak checks after repeated destination replacement.

Exit criteria:

- a complete screen can be native without bypassing the bridge lifecycle;
- HTML and native scrolling do not trap gestures or break back navigation.

Gate:

```sh
./integrations/android/gradlew -p integrations/android \
  navigation-fragments:connectedCheck demo:connectedCheck lint
```

## 6. Collections

Status: `[x]`

Portable CI validates keyed operation counts, restoration, allocation bounds,
and emulator benchmark interactions. Physical-device measurements are retained
as optional performance trends when hardware is available; they do not control
publication.

Implement:

- `list`
- `grid`
- `list-item`
- `swipe-action`
- `pull-to-refresh`
- paging methods and load-state events.

Required behavior:

- stable keys and incremental insert, remove, move, and update operations;
- item reuse without stale scope, event, or accessibility state;
- Paging 3 adapter in an optional artifact;
- empty, loading, retry, and end-of-list states;
- selection, swipe, drag, and scroll restoration.

Tests:

- operation-count assertions proving updates do not rebuild unchanged items;
- large-list benchmarks and allocation limits;
- duplicate/missing key errors;
- paging retry, refresh, cancellation, and process restoration.

Exit criteria:

- 10,000-item keyed updates preserve stable views and remain within the recorded
  operation and allocation bounds;
- the emulator benchmark completes the update and scrolling journey;
- available physical-device runs enforce the versioned frame and memory budgets
  and retain results as trend evidence.

Gate:

```sh
make -C integrations/android check
make -C integrations/android benchmark-emulator-smoke-check
```

Optional hardware evidence:

```sh
make -C integrations/android physical-benchmark-check
```

## 7. Overlays And Transient UI

Status: `[x]`

Restoration policy: drawer, dialog, and bottom-sheet restore their open state with the destination.
Menu, snackbar, and tooltip always restore closed because their content is transient.

Implement:

- `dialog`
- `bottom-sheet`
- `drawer`
- `menu`
- `snackbar`
- `tooltip`

Required behavior:

- explicit show, hide, dismiss, select, confirm, and cancel methods/events;
- Android back, outside-click, drag, focus trapping, and accessibility focus;
- one overlay owner per destination;
- restoration policy declared per element;
- no retained Activity, Fragment, WebView, or scope after dismissal.

Tests:

- dismissal through every supported path;
- rotation and destination replacement while open;
- stacked-overlay policy;
- TalkBack focus entry and return.

Exit criteria:

- the existing drawer implementation meets this contract;
- all overlay state is deterministic after recreation.

Gate:

```sh
./integrations/android/gradlew -p integrations/android \
  navigation-fragments:test navigation-fragments:connectedCheck \
  navigation-fragments:lint
```

## 8. Navigation And Transitions

Status: `[x]`

Implement:

- bind AngularTS router transitions to Android destinations and saved state;
- define push, replace, pop, modal, deep-link, and external navigation methods;
- complete `default`, `none`, `slide`, `fade`, `cover`, `dive`, and `flip`;
- support predictive back and gesture progress;
- preserve browser history and Android back-stack consistency;
- restore routes and parameters after process death;
- define reduced-motion behavior for every transition.

Tests:

- deep links, repeated routes, replace, nested navigation, and process death;
- browser back versus Android back conflict matrix;
- animation completion, interruption, cancellation, and reduced motion;
- no duplicate controller or scope creation during restoration.

Exit criteria:

- one navigation state machine owns both AngularTS and Android state;
- back always has deterministic behavior and never forks the two histories.

Gate:

```sh
./integrations/android/gradlew -p integrations/android \
  core:test navigation-fragments:test demo:connectedCheck
```

## 9. Platform Capabilities

Status: `[x]`

Implement typed services for:

- permissions;
- activity results and intents;
- clipboard and sharing;
- haptics;
- notifications;
- connectivity and application lifecycle;
- geolocation;
- biometrics and credential manager;
- camera and media capture;
- files and document providers.

Required behavior:

- capability discovery before invocation;
- lifecycle-aware cancellation;
- structured denial, unavailable, interrupted, and permanent-denial errors;
- permission requests tied to a visible destination;
- no secrets persisted in WebView state or bridge logs.

Tests:

- allow, deny, deny-permanently, unavailable, and cancelled paths;
- destination removal during an activity result;
- process recreation where Android supports restoration;
- Kotlin AngularTS result and error type compilation.

Exit criteria:

- each service documents whether it is available, permission-gated, optional,
  or unsupported on the current device.

Gate:

```sh
make -C integrations/android check connected-check
make -C integrations/kotlin check
```

## 10. Optional Native UI Artifacts

Status: `[x]`

Create separate artifacts for dependencies applications should not pay for by
default:

- `media` for playback and capture;
- `maps` for map rendering and location layers;
- `paging` for Paging 3 collections;
- `browser` for Custom Tabs;
- vendor SDK adapters only when maintained and independently releasable.

Tests:

- package-boundary checks preventing optional dependencies from entering core;
- minified consumer applications for every artifact;
- missing-capability behavior when an artifact is not installed.

Exit criteria:

- core and navigation AAR dependency graphs remain within recorded budgets;
- adding one optional artifact does not initialize unrelated SDKs.

Gate:

```sh
make -C integrations/android package-check
./integrations/android/gradlew -p integrations/android dependencies
```

## 11. Custom Kotlin Components

Status: `[x]`

Implement:

- stable public Kotlin APIs for Compose content and Android `View` factories;
- generated provider metadata so libraries do not hand-write service files;
- scoped dependencies from the destination, lifecycle, saved state, and events;
- typed custom methods and event payloads;
- deterministic duplicate-name diagnostics at build time;
- R8 consumer rules for discovered providers;
- a published sample library containing `task-card` without changes to the
  Angular Native core.

Tests:

- custom Compose and `View` components loaded from separate test artifacts;
- release/minified discovery;
- library removal, duplicate definitions, factory failures, and disposal;
- configuration and process restoration.

Exit criteria:

- an application adds a custom component by declaring it in its own Kotlin
  module; it never edits or calls a central registry;
- any Android SDK can be exposed without changes to the bridge protocol.

Gate:

```sh
./integrations/android/gradlew -p integrations/android \
  custom-elements-sample:connectedCheck
make -C integrations/android maven-consumer-check
```

## 12. Production Quality

Status: `[x]`

Portable CI retains emulator-matrix evidence for every change. Physical-device
compatibility and performance runs add trend evidence whenever hardware is
available, but hardware availability does not control publication.

Implement:

- baseline profiles and startup benchmarks;
- frame-time, allocation, bridge-latency, and WebView-memory budgets;
- StrictMode and leak detection in debug and CI builds;
- offline, flaky-network, renderer-crash, low-memory, and process-death tests;
- Android API-level test matrix from minimum SDK through current stable;
- phone, tablet, foldable, RTL, dark theme, large font, and reduced motion;
- security review of origins, sessions, intents, files, logs, and JavaScript
  interfaces;
- reproducible source, Javadoc, and release AARs.

Exit criteria:

- zero lint errors and no unapproved warnings;
- no retained destination after teardown;
- portable correctness and allocation budgets enforced by CI, with frame and
  memory budgets enforced whenever physical-device evidence is collected;
- threat model and compatibility matrix are published;
- release artifacts pass a clean external sample build.

Gate:

```sh
make -C integrations/android release-check
make -C integrations/kotlin check
make generated-check
make test-integrations
make check
```

## 13. Maven Release

Status: `[x]`

AngularTS 0.36.0 published all nine Android coordinates. The release gate
validated their signatures, checksums, metadata, archives, reproducibility, and
clean-consumer behavior from Maven Central.

Implement:

- publish `core`, `navigation-fragments`, and completed optional artifacts;
- sign AARs and publish source and documentation jars;
- validate POM metadata and dependency scopes;
- consume staged artifacts from a clean project before release;
- include Android artifacts in version synchronization and release preflight;
- publish migration notes whenever the bridge or catalog changes.

Exit criteria:

- the release uses staged Maven artifacts, not local project dependencies;
- Android, AngularTS, and Kotlin AngularTS versions match;
- the demo and custom-component sample pass against staged artifacts;
- rollback instructions and compatibility notes exist.

Gate:

```sh
make release-check
make -C integrations/android publish
```

## Execution Order

Run slices in this order:

1. Bridge contract hardening.
2. Catalog and generation completion.
3. Core display and action components.
4. Inputs and forms.
5. Layout and scrolling.
6. Collections.
7. Overlays.
8. Navigation and transitions.
9. Platform capabilities.
10. Optional artifacts.
11. Custom Kotlin component tooling.
12. Production quality.
13. Maven release.

Slices 3 through 7 may be implemented one component at a time. Each component
must still satisfy its slice’s full contract and gate before being marked
complete.
