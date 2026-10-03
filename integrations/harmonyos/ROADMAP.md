# AngularTS Native for HarmonyOS: Production Roadmap

Status: proposed

Owner: AngularTS integrations

Target: feature and contract parity with `integrations/android`

Remove this file after every slice is complete and its lasting requirements have moved into maintained documentation, tests, and release automation.

## Goal

Ship a production-ready HarmonyOS integration in this repository that runs the same AngularTS application model as Android:

- AngularTS owns application state, directives, routing, HTTP, and rendering intent.
- ArkWeb hosts AngularTS HTML and server-rendered pages.
- ArkUI renders mapped native controls over declared web placeholders.
- Application authors use AngularTS HTML, JavaScript, and TypeScript rather than writing app-specific ArkTS.
- HarmonyOS and Android expose the same native-element and capability contracts unless a documented platform limitation makes identical behavior impossible.
- Shared contracts are generated from one platform-neutral source rather than copied between integrations.

## Supported platform

| Decision | Target |
| --- | --- |
| Operating system | HarmonyOS NEXT |
| Application model | Stage model |
| Native language and UI | ArkTS and ArkUI |
| Compile and target SDK | API 26 |
| Minimum SDK | API 20, set by Online Authentication Kit passkeys |
| Web runtime | ArkWeb `Web` component |
| Package format | Public HAR packages published through OHPM |
| Build system | Hvigor and `ohpm` |
| Bridge protocol | AngularTS Native protocol v1 |
| JavaScript version | Exact match with the AngularTS release |

Do not use an HSP as the public library format. HSP packages are application-coupled and version-sensitive; reusable integration modules must be public HAR packages.

## Release artifacts

| Module | Proposed OHPM package | Responsibility |
| --- | --- | --- |
| `core` | `@angular-wave/angular-native-harmony-core` | ArkWeb host, bridge, native node registry, layout, styles, base components, lifecycle |
| `navigation` | `@angular-wave/angular-native-harmony-navigation` | Router synchronization, destinations, modals, deep links, transitions |
| `browser` | `@angular-wave/angular-native-harmony-browser` | Browser presentation and external URL handling |
| `credentials` | `@angular-wave/angular-native-harmony-credentials` | Password and passkey operations |
| `maps` | `@angular-wave/angular-native-harmony-maps` | Map Kit-backed native map element |
| `media` | `@angular-wave/angular-native-harmony-media` | Media Kit-backed playback |
| `paging` | `@angular-wave/angular-native-harmony-paging` | Lazy and recycled collections |
| `native-elements-compiler` | `@angular-wave/angular-native-harmony-compiler` | Catalog-driven native component generation and validation |

The final package names must be recorded in `integrations/harmonyos/harmony-artifacts.json` and validated against the Android artifact catalog.

## Authoritative parity baseline

The implementation is not complete merely because a sample renders. Completion requires parity against these Android sources:

| Contract | Current source | Required end state |
| --- | --- | --- |
| Native elements | `integrations/android/native-elements.json` | One shared catalog under `integrations/native/` |
| Native capabilities | `integrations/android/native-capabilities.json` | One shared catalog under `integrations/native/` |
| Bridge schemas | `integrations/android/protocol/` | Platform-neutral protocol schemas and fixtures under `integrations/native/protocol/` |
| Runtime APIs | `src/runtime/native-elements.ts`, `src/runtime/native-capabilities.ts` | Generated from shared catalogs |
| Documentation checks | Android-oriented native API checks | Platform-neutral checks covering Android and HarmonyOS |
| Compatibility | `integrations/android/COMPATIBILITY.md` | Matching HarmonyOS compatibility matrix |
| Security | `integrations/android/SECURITY.md` | Equivalent HarmonyOS threat model and enforcement |

The shared contract must preserve wire names, request shapes, event shapes, lifecycle, and errors. Platform code may differ; application-facing behavior may not silently differ.

## Required native elements

HarmonyOS must implement every Android element before parity is declared:

| Group | Elements |
| --- | --- |
| Input | `text-field`, `search-field`, `checkbox`, `switch`, `slider`, `radio-group`, `range-slider`, `date-picker`, `time-picker`, `file-picker` |
| Content | `text`, `button`, `icon`, `divider`, `badge`, `chip`, `progress`, `loading-indicator`, `floating-action-button`, `card`, `image` |
| Layout | `row`, `column`, `box`, `surface`, `scroll`, `scaffold` |
| Navigation chrome | `drawer`, `app-bar`, `bottom-bar`, `navigation-rail`, `tabs`, `pager` |
| Collections | `list`, `grid`, `list-item`, `swipe-action`, `pull-to-refresh` |
| Overlays | `dialog`, `bottom-sheet`, `menu`, `snackbar`, `tooltip` |
| Services | `map` |

For every element, parity includes properties, events, methods, child rules, focus behavior, disabled behavior, accessibility semantics, disposal, and dynamic updates. Similar appearance alone is not parity.

## Required native capabilities

| Target | Methods | Events |
| --- | --- | --- |
| `navigation` | `status`, `push`, `replace`, `pop`, `modal`, `deep-link`, `external` | `change` |
| `platform` | `status` | None |
| `permissions` | `status`, `request` | None |
| `clipboard` | `read`, `write` | None |
| `sharing` | `share` | None |
| `intents` | `open` | None |
| `haptics` | `perform` | None |
| `connectivity` | `status`, `watch`, `unwatch` | `change` |
| `lifecycle` | `status`, `watch`, `unwatch` | `change` |
| `window` | `status`, `watch`, `unwatch` | `change` |
| `notifications` | `status`, `open-settings` | None |
| `geolocation` | `status`, `current` | None |
| `biometrics` | `status` | None |
| `camera` | `status`, `capture` | None |
| `files` | `status`, `open`, `upload` | `progress` |
| `credentials` | `status`, `get`, `create-password`, `create-passkey`, `clear` | None |
| `media` | `status`, `load`, `play`, `pause`, `stop`, `seek`, `release` | None |

Returning `unavailable` is valid compatibility behavior on unsupported devices, but it does not satisfy feature parity when HarmonyOS has an equivalent platform API. Credentials and passkeys remain release blockers until their semantics and security are proven equivalent.

## Architecture

### Shared contracts

Move native contracts to `integrations/native/` and generate all platform outputs from them. The shared layer must contain no Android, Kotlin, HarmonyOS, or ArkTS implementation details.

Proposed structure:

```text
integrations/native/
  native-elements.json
  native-capabilities.json
  platform-matrix.json
  protocol/
  scripts/
  fixtures/
```

`platform-matrix.json` records the provider module, minimum platform API, required permissions, device requirements, and intentional differences for every element and capability.

### Runtime composition

Use an ArkUI `Stack` as the composition root. ArkWeb occupies the web layer, while an ArkUI native host owns native nodes corresponding to AngularTS placeholders. Use `BuilderNode`, `NodeContainer`, or direct declarative ArkUI nodes for normal components. Use native render-node or NDK APIs only where ArkTS cannot meet the contract.

The native registry must update individual nodes. It must not rebuild the native tree after every model change. Stable AngularTS element IDs identify nodes across updates.

### Bridge

Use ArkWeb's JavaScript bridge facilities behind one adapter. Every destination receives a random session token. The adapter accepts only:

- Protocol version `1`.
- The active session token.
- The original approved HTTP or HTTPS origin.
- Messages no larger than 256 KiB.
- Catalogued targets, methods, elements, properties, and value types.

All failures use the shared structured error schema. Closing a destination cancels pending work, removes event subscriptions, releases media, and disposes native nodes.

### Layout and styles

AngularTS remains responsible for resolving CSS and transmitting normalized native style values. The HarmonyOS layer converts normalized values to ArkUI properties and `vp` units. It must account for density, font scale, safe areas, keyboard insets, right-to-left layout, dark mode, reduced motion, rotation, multi-window, tablets, and foldables.

Keep the native layer cloaked until the first complete layout transaction. A user must never see placeholders, default-colored blocks, or intermediate native positions.

### Navigation

The AngularTS router remains the source of navigation intent. The HarmonyOS adapter mirrors routes into ArkUI `Navigation`, `NavPathStack`, and `NavDestination` state without taking route ownership away from AngularTS.

Required navigation behavior:

- `push`, `replace`, `pop`, modal, deep-link, and external navigation.
- Persistent tab, app-bar, bottom-bar, drawer, and navigation-rail shells.
- Back-button and gesture synchronization without duplicate history entries.
- Default, none, slide, fade, cover, dive, and flip transitions.
- Symmetric forward and backward transitions.
- Interrupted and cancelled transition cleanup.
- Reduced-motion substitution.
- Dialog-mode destinations for modal routes.

## Execution rules

- Complete slices in order unless a slice explicitly states that it can run in parallel.
- Do not add handwritten HarmonyOS APIs to applications. Missing behavior must be added to AngularTS Native first.
- Do not duplicate a shared schema, catalog, fixture, or generated runtime API.
- Do not skip unavailable HarmonyOS tooling in CI. Bootstrap must fail with an actionable error.
- Do not mark parity complete using only mocks, previews, or screenshots.
- Keep each slice independently reviewable and green before starting the next one.
- Convert lasting decisions into maintained docs and tests as each slice closes.

## Slice 0: Platform proof and toolchain

### Files

- `integrations/harmonyos/Makefile`
- `integrations/harmonyos/COMPATIBILITY.md`
- `integrations/harmonyos/SECURITY.md`
- `integrations/harmonyos/harmony-artifacts.json`
- `integrations/harmonyos/scripts/bootstrap-sdk.sh`
- `.github/workflows/harmonyos.yml`

### Tasks

- [ ] Pin official command-line tools, HarmonyOS SDK API 26, `ohpm`, Hvigor, ArkTS compiler, Code Linter, and test framework versions.
- [ ] Implement reproducible Linux bootstrap with checksums, license handling, caches, and actionable failures.
- [ ] Build a minimal Stage-model ArkTS application containing ArkWeb and an ArkUI overlay.
- [ ] Prove two-way JavaScript bridge calls, events, token validation, and node creation.
- [ ] Audit every required element and capability against HarmonyOS APIs.
- [ ] Select the minimum compatible SDK from evidence rather than assumption.
- [ ] Record exact supported phone, tablet, foldable, emulator, and real-device combinations.
- [ ] Define local, emulator, physical-device, and Huawei cloud test lanes.
- [ ] Record unavailable or semantically different APIs as blocking gaps with an owner and resolution.

### Gates

```bash
make -C integrations/harmonyos bootstrap
make -C integrations/harmonyos proof
make -C integrations/harmonyos compatibility-check
```

### Done when

- [ ] A clean Linux environment can install the toolchain and build the proof without DevEco Studio.
- [ ] The proof runs in an emulator and on a real or cloud HarmonyOS device.
- [ ] Every Android contract has a verified HarmonyOS provider or an explicit unresolved blocker.
- [ ] No later slice depends on an unverified package, SDK, or platform assumption.

## Slice 1: Extract shared native contracts

### Files

- `integrations/native/native-elements.json`
- `integrations/native/native-capabilities.json`
- `integrations/native/platform-matrix.json`
- `integrations/native/protocol/`
- `integrations/native/scripts/`
- Android generators and checks that currently read `integrations/android/`
- Runtime generators for `src/runtime/native-elements.ts` and `src/runtime/native-capabilities.ts`

### Tasks

- [ ] Move the Android catalogs and bridge schemas into the platform-neutral directory without changing wire contracts.
- [ ] Update Android to consume the shared source.
- [ ] Add HarmonyOS provider metadata to the platform matrix.
- [ ] Generate TypeScript runtime APIs from the shared catalogs.
- [ ] Add schema checks for unique names, complete providers, valid types, permissions, and package ownership.
- [ ] Make all documentation and parity checks consume the shared catalogs.
- [ ] Add fixtures for success, error, event, cancellation, invalid token, invalid origin, invalid type, oversized message, and disposal.

### Gates

```bash
make native-contract-check
make -C integrations/android check
make generated-check
```

### Done when

- [ ] Android behavior and generated files are unchanged.
- [ ] No platform owns a second copy of a native contract.
- [ ] Adding a catalog entry fails checks until every required platform declares a provider.

## Slice 2: HarmonyOS project and package skeleton

### Files

- `integrations/harmonyos/AppScope/`
- `integrations/harmonyos/entry/`
- `integrations/harmonyos/packages/`
- `integrations/harmonyos/oh-package.json5`
- `integrations/harmonyos/hvigorfile.ts`
- `integrations/harmonyos/build-profile.json5`
- `integrations/harmonyos/scripts/check-artifacts.mjs`

### Tasks

- [ ] Create one Stage-model workspace with public HAR modules matching the artifact table.
- [ ] Enforce strict ArkTS compilation, Code Linter, formatting, dependency, license, and package metadata checks.
- [ ] Add a generated package index and validate package ownership against `harmony-artifacts.json`.
- [ ] Add exact AngularTS version synchronization.
- [ ] Add clean-consumer fixtures that install each packed HAR through `ohpm`.
- [ ] Add package size budgets and dependency-boundary checks.

### Gates

```bash
make -C integrations/harmonyos generate
make -C integrations/harmonyos format-check
make -C integrations/harmonyos lint
make -C integrations/harmonyos compile
make -C integrations/harmonyos package-check
```

### Done when

- [ ] Every module builds as an independently installable public HAR.
- [ ] A clean fixture consumes packed artifacts rather than workspace source.
- [ ] Version and artifact drift fail before release.

## Slice 3: Secure ArkWeb bridge

### Files

- `integrations/harmonyos/packages/core/src/main/ets/bridge/`
- `integrations/harmonyos/packages/core/src/test/`
- `integrations/harmonyos/entry/src/ohosTest/`

### Tasks

- [ ] Implement request, reply, error, event, and cancellation envelopes from the shared schemas.
- [ ] Generate a random token for every destination.
- [ ] Validate protocol version, token, origin, size, target, method, IDs, and parameter types before dispatch.
- [ ] Implement structured errors without leaking stack traces, credentials, paths, or private platform data.
- [ ] Add pending-request cancellation and destination-scoped ownership.
- [ ] Advertise supported capabilities and permissions separately.
- [ ] Reject calls after destination disposal.
- [ ] Add fuzz and malformed-message tests.

### Gates

```bash
make -C integrations/harmonyos bridge-test
make -C integrations/harmonyos protocol-parity
make -C integrations/harmonyos security-check
```

### Done when

- [ ] The shared portable fixtures produce equivalent Android and HarmonyOS results.
- [ ] Every validation branch has a test.
- [ ] Navigation teardown leaves no callbacks, subscriptions, or pending promises.

## Slice 4: Native node registry, layout, and style system

### Files

- `integrations/harmonyos/packages/core/src/main/ets/nodes/`
- `integrations/harmonyos/packages/core/src/main/ets/layout/`
- `integrations/harmonyos/packages/core/src/main/ets/styles/`
- `integrations/harmonyos/packages/core/src/main/ets/accessibility/`

### Tasks

- [ ] Implement create, update, move, hide, reveal, and dispose operations keyed by stable element ID.
- [ ] Batch bridge mutations into one ArkUI frame transaction.
- [ ] Convert normalized pixel geometry to `vp` without cumulative rounding drift.
- [ ] Map shared design tokens and resolved CSS values to ArkUI properties.
- [ ] Support safe areas, keyboard insets, density, font scale, RTL, dark mode, reduced motion, rotation, and window resizing.
- [ ] Synchronize z-order, clipping, scrolling, visibility, focus, and hit testing with web placeholders.
- [ ] Add first-layout cloak and atomic reveal.
- [ ] Expose semantic role, label, state, value, action, traversal, and focus metadata.
- [ ] Prove that an isolated property update does not rebuild unaffected nodes.

### Gates

```bash
make -C integrations/harmonyos node-test
make -C integrations/harmonyos layout-test
make -C integrations/harmonyos accessibility-test
make -C integrations/harmonyos render-benchmark
```

### Done when

- [ ] Native controls remain aligned while scrolling, resizing, rotating, and opening the keyboard.
- [ ] Initial render contains no visible intermediate state.
- [ ] Incremental updates preserve node identity and focus.
- [ ] Accessibility inspection exposes the expected tree and actions.

## Slice 5: Inputs and form controls

### Files

- `integrations/harmonyos/packages/core/src/main/ets/components/input/`
- Generated element bindings and contract tests

### Tasks

- [ ] Implement `text-field`, `search-field`, `checkbox`, `switch`, and `slider`.
- [ ] Implement `radio-group`, `range-slider`, `date-picker`, `time-picker`, and `file-picker`.
- [ ] Match AngularTS model updates, dirty state, touched state, validation, disabled state, reset, and form submission behavior.
- [ ] Support selection, composing input, input methods, autofill, password fields, clear buttons, focus, and keyboard actions.
- [ ] Normalize dates, times, ranges, files, and cancellation across platforms.
- [ ] Test programmatic updates and user updates in both directions without feedback loops.

### Gates

```bash
make -C integrations/harmonyos input-test
make -C integrations/harmonyos form-parity
```

### Done when

- [ ] Every input contract passes generated behavior tests.
- [ ] Forms behave identically through touch, keyboard, and programmatic changes.
- [ ] File results use safe content handles rather than filesystem paths.

## Slice 6: Content and layout elements

### Files

- `integrations/harmonyos/packages/core/src/main/ets/components/content/`
- `integrations/harmonyos/packages/core/src/main/ets/components/layout/`

### Tasks

- [ ] Implement all content elements listed in the parity baseline.
- [ ] Implement all layout elements listed in the parity baseline.
- [ ] Add image loading, placeholder, error, caching, crop, and accessibility behavior.
- [ ] Add progress and loading semantics without blocking the UI thread.
- [ ] Preserve child identity when layout properties change.
- [ ] Verify token-driven styling against the same fixtures used by Android.

### Gates

```bash
make -C integrations/harmonyos content-test
make -C integrations/harmonyos layout-component-test
make -C integrations/harmonyos visual-test
```

### Done when

- [ ] Every content and layout element passes generated contract tests.
- [ ] Dynamic text, images, styles, and children update without whole-tree rerendering.

## Slice 7: Collections, paging, and gestures

### Files

- `integrations/harmonyos/packages/paging/`
- Collection components in `core`

### Tasks

- [ ] Implement `list`, `grid`, `list-item`, `pager`, `swipe-action`, and `pull-to-refresh`.
- [ ] Use ArkUI lazy/recycled collection facilities while preserving stable AngularTS keys.
- [ ] Implement append, prepend, insert, remove, move, replace, and reset without unnecessary node recreation.
- [ ] Preserve scroll position through incremental updates and route restoration.
- [ ] Coordinate nested scrolling and gesture ownership with ArkWeb.
- [ ] Add pagination, empty, loading, retry, refresh, and end-of-list states.
- [ ] Benchmark large collections, rapid updates, image-heavy grids, and pager transitions.

### Gates

```bash
make -C integrations/harmonyos paging-test
make -C integrations/harmonyos collection-parity
make -C integrations/harmonyos collection-benchmark
```

### Done when

- [ ] Keyed updates retain unaffected native nodes.
- [ ] Long lists remain within agreed frame-time and memory budgets.
- [ ] Gestures do not cause duplicate web and native actions.

## Slice 8: Overlays and navigation chrome

### Files

- Overlay components in `core`
- Navigation chrome components in `core`

### Tasks

- [ ] Implement `dialog`, `bottom-sheet`, `menu`, `snackbar`, and `tooltip`.
- [ ] Implement `drawer`, `app-bar`, `bottom-bar`, `navigation-rail`, and `tabs`.
- [ ] Keep persistent navigation chrome mounted while route content changes.
- [ ] Implement modal focus trapping, dismissal, back handling, safe-area layout, and restoration.
- [ ] Queue transient overlays and cleanly cancel them when their owner is disposed.
- [ ] Test compact, medium, and expanded layouts.

### Gates

```bash
make -C integrations/harmonyos overlay-test
make -C integrations/harmonyos navigation-component-test
make -C integrations/harmonyos adaptive-layout-test
```

### Done when

- [ ] Tabs and navigation chrome never reload during content transitions.
- [ ] Overlay lifecycle and back behavior match Android contracts.
- [ ] Phone, tablet, and foldable layouts select the intended navigation chrome.

## Slice 9: Router integration and transitions

### Files

- `integrations/harmonyos/packages/navigation/`
- Shared navigation fixtures
- Router integration tests

### Tasks

- [ ] Map AngularTS route operations to `Navigation`, `NavPathStack`, and `NavDestination`.
- [ ] Synchronize system back, gestures, deep links, modal dismissal, and route replacement.
- [ ] Prevent native callbacks from producing duplicate AngularTS navigation.
- [ ] Implement default, none, slide, fade, cover, dive, and flip transitions.
- [ ] Define forward, backward, modal, interrupted, and reduced-motion behavior for each transition.
- [ ] Restore destination and scroll state after process recreation without storing secrets.
- [ ] Test multiple AngularTS applications and independent navigation scopes.

### Gates

```bash
make -C integrations/harmonyos navigation-test
make -C integrations/harmonyos transition-test
make -C integrations/harmonyos router-parity
```

### Done when

- [ ] Browser history, AngularTS router state, and ArkUI navigation state cannot diverge.
- [ ] Persistent shells remain mounted across every route operation.
- [ ] All transitions pass forward, back, cancellation, and reduced-motion tests.

## Slice 10: Core capabilities

### Files

- Capability providers in `core` and `navigation`
- Generated capability registration
- Permission and lifecycle tests

### Tasks

- [ ] Implement platform, permissions, clipboard, sharing, intents, and haptics.
- [ ] Implement connectivity, lifecycle, window, notifications, and geolocation.
- [ ] Implement biometrics status, camera capture, and file open/upload.
- [ ] Keep availability separate from permission state.
- [ ] Allowlist external schemes and sanitize external intents.
- [ ] Scope watchers and progress events to their destination owner.
- [ ] Use safe content handles and redact sensitive data from logs and saved state.
- [ ] Validate foreground, background, denied, restricted, revoked, and interrupted flows.

### Gates

```bash
make -C integrations/harmonyos capability-test
make -C integrations/harmonyos permission-test
make -C integrations/harmonyos capability-parity
```

### Done when

- [ ] Every core capability method and event passes shared contract fixtures.
- [ ] Device-only permission and lifecycle paths pass real or cloud device tests.
- [ ] No provider leaks a listener, file handle, camera session, or pending request.

## Slice 11: Optional capability packages

### Files

- `integrations/harmonyos/packages/browser/`
- `integrations/harmonyos/packages/credentials/`
- `integrations/harmonyos/packages/maps/`
- `integrations/harmonyos/packages/media/`

### Tasks

- [ ] Implement browser presentation and safe external routing.
- [ ] Implement password and passkey status, get, create, and clear flows using verified HarmonyOS APIs.
- [ ] Implement `map` through Map Kit with camera, markers, gestures, events, lifecycle, and accessibility.
- [ ] Implement media status, load, play, pause, stop, seek, release, events, and interruption handling through Media Kit.
- [ ] Keep each optional package out of `core` dependencies.
- [ ] Add unavailable-device and missing-service behavior.
- [ ] Validate every provider on a supported real or cloud device.

### Gates

```bash
make -C integrations/harmonyos browser-test
make -C integrations/harmonyos credentials-test
make -C integrations/harmonyos maps-test
make -C integrations/harmonyos media-test
make -C integrations/harmonyos optional-package-parity
```

### Done when

- [ ] All optional Android contracts have equivalent HarmonyOS implementations.
- [ ] Applications pay no dependency or permission cost for packages they do not install.
- [ ] Passkey, map, and media behavior is verified beyond mocks.

## Slice 12: Custom native components and compiler

### Files

- `integrations/harmonyos/packages/native-elements-compiler/`
- `integrations/harmonyos/packages/custom-elements-sample/`
- Shared custom-element fixtures

### Tasks

- [ ] Generate registration, property decoding, event encoding, methods, child constraints, and documentation from a component descriptor.
- [ ] Prefer explicit generated ArkTS over runtime reflection or annotation magic.
- [ ] Make custom elements available through normal AngularTS HTML without app-level manual registry calls.
- [ ] Support third-party HAR providers without granting access to unrelated bridge targets.
- [ ] Build a sample component with state, children, methods, events, disposal, accessibility, and style mapping.
- [ ] Add duplicate-name, incompatible-version, invalid-type, and provider-failure tests.

### Gates

```bash
make -C integrations/harmonyos compiler-test
make -C integrations/harmonyos custom-elements-test
make -C integrations/harmonyos generate-check
```

### Done when

- [ ] A clean consumer can install a custom component HAR and use its HTML tag directly.
- [ ] Generated code is deterministic and stale output fails checks.
- [ ] Custom providers remain inside the same security and ownership model as built-ins.

## Slice 13: Kitchen sink and Pulse applications

### Files

- `integrations/harmonyos/kitchen-sink/`
- `integrations/harmonyos/sample-social/`
- Shared Pulse application assets and fixtures where practical

### Tasks

- [ ] Build a kitchen sink containing every element, property, event, method, state, transition, capability, and adaptive layout.
- [ ] Port Pulse using the same AngularTS application structure, HTML, services, and design tokens as Android.
- [ ] Keep app-specific ArkTS limited to Stage-model shell and package wiring.
- [ ] Match the Pulse concept on phone and tablet while using native controls.
- [ ] Add loading, empty, error, offline, permission-denied, and retry states.
- [ ] Add deterministic test data and screenshot routes.
- [ ] Support local live reload without weakening production bridge policy.

### Gates

```bash
make -C integrations/harmonyos kitchen-sink-check
make -C integrations/harmonyos sample-social-check
make -C integrations/harmonyos visual-regression
```

### Done when

- [ ] Every supported contract can be inspected in the kitchen sink.
- [ ] Pulse has working feed, explore, create, activity, profile, detail, and adaptive tablet navigation.
- [ ] Pulse contains no handwritten app feature that belongs in AngularTS Native.
- [ ] Golden images pass for supported device classes and display modes.

## Slice 14: Production quality

### Files

- Performance and security test suites
- Accessibility audit fixtures
- CI device matrix
- Package budgets and baseline files

### Tasks

- [ ] Reach 100% branch coverage for protocol validation, dispatch, ownership, registry mutation, and generated mappings.
- [ ] Add property-based and fuzz tests for messages, layout values, collection mutations, and lifecycle ordering.
- [ ] Add leak tests for destinations, watchers, overlays, media, maps, files, and native nodes.
- [ ] Define budgets for cold start, first native reveal, bridge round trip, navigation, scroll frames, memory, and package size.
- [ ] Test minimum SDK and API 26 on phone, tablet, and foldable profiles.
- [ ] Test RTL, 1.5x and 2x font scale, dark mode, reduced motion, keyboard, rotation, multi-window, and safe areas.
- [ ] Audit accessibility with screen reader, keyboard, switch access, focus order, labels, roles, states, and touch targets.
- [ ] Threat-model bridge injection, origin changes, navigation races, file access, intents, permissions, package providers, and saved state.
- [ ] Run real-device or cloud tests for ArkWeb, credentials, biometrics, camera, maps, media, permissions, and process recreation.

### Gates

```bash
make -C integrations/harmonyos coverage-check
make -C integrations/harmonyos benchmark-check
make -C integrations/harmonyos accessibility-check
make -C integrations/harmonyos security-check
make -C integrations/harmonyos device-check
```

### Done when

- [ ] Every budget has a measured baseline and a failing regression threshold.
- [ ] No release-critical flow relies only on an emulator or mock.
- [ ] Security and accessibility audits have no unresolved high-severity findings.

## Slice 15: Documentation and integration synchronization

### Files

- HarmonyOS setup, guide, API, cookbook, and release documentation
- Main integration navigation and release docs
- Generated API references

### Tasks

- [ ] Document prerequisites, Linux command-line setup, optional DevEco workflow, emulator, device, cloud testing, signing, and troubleshooting.
- [ ] Build a beginner application using HTML, AngularTS, and native elements without custom ArkTS.
- [ ] Document every element and capability from generated catalogs.
- [ ] Document adaptive navigation, transitions, permissions, accessibility, performance, security, and offline behavior.
- [ ] Add recipes for server-rendered routes, HTTP forms, native file upload, maps, media, deep links, authentication, and custom components.
- [ ] Link every referenced public type to generated API documentation.
- [ ] Keep examples terse, complete, executable, and covered by snippet tests.
- [ ] Add HarmonyOS to all integration menus, compatibility tables, release steps, and support statements.
- [ ] Remove Android-only wording from shared Native documentation.

### Gates

```bash
make docs-check
make docs-snippet-test
make integration-docs-check
```

### Done when

- [ ] A developer with no HarmonyOS experience can build, run, test, and package the sample from the guide.
- [ ] Every documented snippet is compiled or exercised by a test.
- [ ] Generated contract tables cannot drift from shipped packages.

## Slice 16: Publication and release automation

### Files

- Root `Makefile`
- HarmonyOS publication scripts
- Release workflow
- Artifact manifests and changelog

### Tasks

- [ ] Add HarmonyOS to version synchronization, generated checks, integration tests, preflight, and release checks.
- [ ] Pack every HAR and test it from a clean consumer before publication.
- [ ] Generate checksums, licenses, dependency manifests, SBOMs, and provenance where supported.
- [ ] Publish packages in dependency order with immutable versions.
- [ ] Verify published metadata and install every package from OHPM after publication.
- [ ] Make retries detect already-published artifacts rather than failing halfway through a release.
- [ ] Keep device tests in preflight without requiring a personally connected device by using the configured cloud lane.
- [ ] Prevent publication when Android and HarmonyOS shared-contract parity is incomplete.

### Gates

```bash
make harmonyos-check
make release-check
make release-preflight VERSION=<version>
make publish-release VERSION=<version>
make verify-release VERSION=<version>
```

### Done when

- [ ] One release command synchronizes AngularTS and every HarmonyOS package version.
- [ ] Release preflight exercises the same checks as CI and publication.
- [ ] Published artifacts install and run without workspace dependencies.
- [ ] A partial publication has a documented, tested recovery path.

## Slice 17: Final parity audit

### Tasks

- [ ] Compare every native element property, event, method, child rule, lifecycle path, and accessibility behavior with Android.
- [ ] Compare every capability method, event, permission state, cancellation path, and error with Android.
- [ ] Compare navigation history, persistent shells, deep links, modals, process recreation, and all transitions.
- [ ] Compare Pulse and kitchen-sink behavior across Android and HarmonyOS.
- [ ] Resolve or formally document every platform deviation in `platform-matrix.json` and user documentation.
- [ ] Run all repository checks, all integration checks, HarmonyOS device tests, and release preflight from a clean checkout.
- [ ] Replace this roadmap with maintained architecture, compatibility, security, contributor, and release documentation.

### Gates

```bash
make check
make test-integrations
make harmonyos-check
make -C integrations/harmonyos device-check
make release-preflight VERSION=<version>
```

### Done when

- [ ] The machine-readable parity matrix contains no unresolved required entries.
- [ ] Android and HarmonyOS pass the same portable protocol and contract fixtures.
- [ ] Production samples pass emulator, real or cloud device, visual, accessibility, security, and performance gates.
- [ ] Release automation can publish and verify all HarmonyOS artifacts without manual edits.
- [ ] This roadmap has been removed.

## CI matrix

| Lane | Required checks |
| --- | --- |
| Linux static | Bootstrap, generation, format, Code Linter, ArkTS compile, unit tests, package checks |
| Emulator phone | Bridge, elements, navigation, forms, collections, overlays, lifecycle |
| Emulator tablet/foldable | Adaptive layout, persistent navigation, rotation, multi-window |
| Real or cloud device | ArkWeb, permissions, credentials, biometrics, camera, files, maps, media, process recreation |
| Cross-platform | Shared protocol fixtures, generated catalogs, API parity, Pulse scenarios |
| Release | Clean consumer, packed HARs, SBOM, provenance, published artifact verification |

CI must fail when a required lane is skipped. Device-backed tests may be scheduled separately from pull-request checks, but a green device run for the exact release commit is mandatory before publication.

## Production acceptance criteria

- [ ] All 44 native elements satisfy their shared contracts.
- [ ] All 17 native capability targets satisfy their shared contracts.
- [ ] AngularTS applications require no app-specific ArkTS for supported behavior.
- [ ] Routing and native navigation remain synchronized under all forward, back, modal, deep-link, and recreation paths.
- [ ] Native nodes update incrementally and retain identity when their key is stable.
- [ ] Initial mount and route transitions expose no layout artifacts.
- [ ] Security, accessibility, performance, compatibility, and package gates pass.
- [ ] Linux command-line builds and CI do not depend on DevEco Studio.
- [ ] Device-only behavior is validated on a real or Huawei cloud HarmonyOS device.
- [ ] Public HAR packages are installable from OHPM and exactly match the AngularTS release.
- [ ] Documentation examples are tested and generated API references match shipped artifacts.

## Official platform references

- [HarmonyOS release and API adaptation](https://developer.huawei.com/consumer/en/doc/harmonyos-releases/upgrade-adaptation)
- [ArkTS](https://developer.huawei.com/consumer/en/arkts/)
- [ArkUI Navigation and NavDestination](https://developer.huawei.com/consumer/en/doc/harmonyos-guides/arkts-navigation-navdestination)
- [ArkWeb and native component composition](https://developer.huawei.com/consumer/en/doc/harmonyos-guides/web-fit-content)
- [ArkUI custom nodes](https://developer.huawei.com/consumer/en/doc/harmonyos-guides-V13/arkts-user-defined-node-V13)
- [NodeContainer](https://developer.huawei.com/consumer/en/doc/harmonyos-guides-V13/arkts-user-defined-place-hoder-V13)
- [Hvigor](https://developer.huawei.com/consumer/en/doc/harmonyos-guides-V2/build_overview-0000001055075201-V2)
- [HarmonyOS command-line tools](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/ide-commandline-get-V5)
- [HarmonyOS testing services](https://developer.huawei.com/consumer/cn/testing/get-started/)
- [Public package and HSP considerations](https://developer.huawei.com/consumer/en/doc/harmonyos-guides-V14/in-app-hsp-V14?catalogVersion=V14)
- [Media Kit](https://developer.huawei.com/consumer/en/doc/harmonyos-guides-V14/media-kit-intro-V14)
- [Lazy native collections](https://developer.huawei.com/consumer/en/doc/harmonyos-guides-V13/ndk-loading-long-list-V13)
- [Camera Kit](https://developer.huawei.com/consumer/en/doc/harmonyos-guides-V13/camera-device-input-V13)
- [HarmonyOS design guidance](https://developer.huawei.com/consumer/en/design/)
