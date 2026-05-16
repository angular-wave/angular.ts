# Attributes Removal Validation Plan

Goal: validate whether AngularTS can remove or sharply reduce the `Attributes`
object while preserving directive behavior, interpolation observation, class and
attribute writes, transclusion, templates, and public compile/link contracts.

The plan is executable as a checklist. Complete one checkpoint at a time and run
the listed commands before moving on.

## Working Rules

- [ ] Treat `$attrs` removal as staged work, not one large rewrite.
- [ ] Do not remove the public `ng.Attributes` type until all internal directive
      reads and compile allocations have been measured and replaced.
- [ ] Prefer normalized DOM queries through helpers such as
      `getDirectiveAttr(...)`, `hasDirectiveAttr(...)`, and
      `getDirectiveHostElement(...)` for read-only directive checks.
- [ ] Preserve `data-*` and `data-ng-*` normalization, but move that behavior
      into helper/service lookup instead of decorating objects with string
      properties such as `attrs.ngOnTest`.
- [ ] Keep `$observe`, `$set`, `$addClass`, `$removeClass`, and `$updateClass`
      behavior covered before changing their implementation.
- [ ] After each phase, run the phase validation commands and record failures in
      this file before proceeding.

## Baseline Inventory

- [ ] Capture the current `Attributes` dependency surface.

  ```sh
  rg -n "\\bAttributes\\b|\\$attrs|attrs\\b|\\$observe|\\$set|\\$addClass|\\$removeClass|\\$updateClass" src --glob '!**/*.js'
  ```

- [ ] Capture direct DOM attribute access that may already be the replacement
      path.

  ```sh
  rg -n "getDirectiveAttr|hasDirectiveAttr|getNormalizedAttr|hasNormalizedAttr|getAttribute\\(|setAttribute\\(|removeAttribute\\(" src --glob '!**/*.js'
  ```

- [ ] Build and typecheck the untouched baseline.

  ```sh
  ./node_modules/.bin/tsc --noEmit --project tsconfig.json
  ./node_modules/.bin/tsc --project tsconfig.test.json
  make lint
  ```

- [ ] Run the high-risk baseline tests.

  ```sh
  npx playwright test \
    src/core/compile/compile.test.ts \
    src/directive/init/init.test.ts \
    src/directive/switch/switch.test.ts \
    src/directive/if/if.test.ts \
    src/directive/inject/inject.test.ts \
    src/directive/input/input.test.ts \
    src/directive/form/form.test.ts \
    src/directive/repeat/repeat.test.ts \
    src/router/router.test.ts
  ```

## Phase 1: Move Read-Only Access To Elements

This is the first migration slice. The objective is to stop treating
`Attributes` as the default way to read directive configuration. Read-only
directive code should work from the directive host element instead, using
normalized helper queries when needed. `data-*` normalization remains a feature,
but access should be through lookup APIs, not object property decoration.

- [x] Create a temporary audit table for every `$attrs`/`Attributes` use in the
      initial candidate files, with each use assigned to one of these buckets: -
      read-only normalized value, - presence check, - `$observe`, - `$set` or
      DOM write, - class mutation, - `$attr` original-name lookup, - public
      directive API only, - compile/transclusion/template internals.

      Initial candidate files:
      - `src/directive/init/init.ts`
      - `src/directive/switch/switch.ts`
      - `src/directive/transclude/transclude.ts`
      - `src/directive/script/script.ts`
      - `src/directive/wasm/wasm.ts`
      - `src/directive/if/if.ts`
      - `src/directive/inject/inject.ts`

      Audit result:

      | File | Bucket | Phase 1 action |
      | --- | --- | --- |
      | `src/directive/init/init.ts` | read-only normalized value | moved `ngInit` read to `$attributes.read(element, "ngInit")` |
      | `src/directive/switch/switch.ts` | read-only normalized values | moved `ngSwitch`, `on`, `ngSwitchWhen`, and `ngSwitchWhenSeparator` reads to `$attributes.read(...)` |
      | `src/directive/transclude/transclude.ts` | read-only normalized values plus `$attr` original-name lookup | moved `ngTransclude` and `ngTranscludeSlot` reads to `$attributes.read(...)`; left `$attrs.$attr.ngTransclude` for original-name semantics |
      | `src/directive/script/script.ts` | read-only normalized values | moved `type` and `id` reads to `$attributes.read(...)` |
      | `src/directive/wasm/wasm.ts` | read-only normalized values | moved `src` and `as` reads to `$attributes.read(...)` |
      | `src/directive/if/if.ts` | read-only normalized value | moved `ngIf` read to `$attributes.read(...)` |
      | `src/directive/inject/inject.ts` | read-only normalized value | moved `ngInject` read to `$attributes.read(...)` |

- [x] Confirm which directive reads can already use element-host helpers.

  ```sh
  rg -n "getDirectiveAttr|hasDirectiveAttr|getDirectiveHostElement" src/directive src/router src/core --glob '!**/*.js'
  ```

- [x] Replace read-only `$attrs.foo` / `attrs.foo` access in the candidate files
      with element-host reads:

  ```text
  use $attributes.read(element, "normalizedName") for direct reads;
  leave behavior-bearing $attrs APIs in place for later phases.
  ```

- [x] Add focused tests proving normalized element lookup supports:

  ```text
  ng-on-test and data-ng-on-test for the same normalized name;
  data-config for normalized name config;
  later DOM attribute updates without decorated attrs.config.
  ```

- [x] Do not convert behavior-bearing calls in this phase. Keep these in place
      and document why each remains.

  ```sh
  rg -n "\\$observe|\\$set|\\$addClass|\\$removeClass|\\$updateClass|\\$attr" src --glob '!**/*.js'
  ```

- [x] Add or update focused tests for each converted directive: host element,
      transclusion anchor, normalized attribute aliases, and missing attribute
      cases.

- [x] Validate the converted set.

  ```sh
  ./node_modules/.bin/tsc --noEmit --project tsconfig.json
  npx playwright test \
    src/core/compile/compile.test.ts \
    src/directive/init/init.test.ts \
    src/directive/switch/switch.test.ts \
    src/directive/script/script.test.ts \
    src/directive/if/if.test.ts \
    src/directive/inject/inject.test.ts \
    src/services/wasm/wasm.test.ts
  ```

  Attempted on this branch. `tsc --noEmit`, test TypeScript compilation,
  `make lint`, `make build`, Closure extern validation, and the targeted
  directive/service Playwright tests passed. `src/core/compile/compile.test.ts`
  still failed when included in the wider run because the page reported a 401
  console error while Jasmine reported no failed specs.

- [x] Checkpoint acceptance: simple directive reads no longer require direct
      `$attrs.foo` access. Any remaining candidate-file `$attrs` usage is
      behavior-bearing or explicitly tied to `$attr` original-name semantics.
      New code must not add normalized string properties to attribute carrier
      objects.

## Phase 2: Replace Larger Directive Read Paths

- [x] Audit high-traffic directives that mix reads with writes or observers: -
      `src/directive/http/http.ts` - `src/directive/input/input.ts` -
      `src/directive/form/form.ts` -
      `src/directive/model-options/model-options.ts` -
      `src/directive/repeat/repeat.ts` -
      `src/router/directives/state-directives.ts` -
      `src/directive/realtime/swap.ts`

      Audit result:

      | File | Read-only candidates | Behavior-bearing dependencies to preserve |
      | --- | --- | --- |
      | `src/directive/repeat/repeat.ts` | `ngRepeat`, `animate`, `index`/`dataIndex`, `lazy`, `swap` | none in the converted compile-time reads |
      | `src/directive/http/http.ts` | request trigger/options, response handling, class names, target/success/error expressions | `$observe` for `latch`; `$set`, `$addClass`, `$removeClass` for loading/throttle state |
      | `src/directive/input/input.ts` | type-specific static setup reads | `$observe` for `min`, `max`, `step`, `value`, validation attrs; `$set` for value writes |
      | `src/directive/form/form.ts` | form name/ngForm read | `$observe` for dynamic form-control names |
      | `src/directive/model-options/model-options.ts` | model-options expression read through controller storage | controller still stores `$attrs` for current API shape |
      | `src/router/directives/state-directives.ts` | `ngSref`, `ngSrefOpts`, active class expressions, raw param reads | `$set` for href updates; `$observe` for param fields |
      | `src/directive/realtime/swap.ts` | `animate`, `target`, `viewTransition` reads | none in the audited helper functions |

- [x] Convert the first low-risk Phase 2 slice.

      Converted `src/directive/repeat/repeat.ts` from compile-time
      `getDirectiveAttr(...)` / `hasDirectiveAttr(...)` reads to
      `$attributes.read(...)` / `$attributes.has(...)`. Added a focused
      `repeat-attributes` test runner for `data-ng-repeat` and `data-index`
      lookup.

- [x] Convert realtime swap helper defaults.

      Converted `src/directive/realtime/swap.ts` from `attrs.animate`,
      `attrs.target`, and `attrs.viewTransition` / `attrs.dataViewTransition`
      reads to `$attributes.read(...)` against the directive host element.
      Updated `ngHttp`/`ngSse` and `ngWebTransport` call sites to pass the
      service. Added a focused `swap` test runner for `data-target` and
      `data-view-transition` lookup.

- [x] Convert form initial name reads.

      Converted `FormController` initial `name` / `ngForm` lookup and the
      form directive's initial observed-name selection to `$attributes`.
      Preserved `attrParam.$observe(...)` for dynamic form renames. Added
      `data-name` and `data-ng-form` coverage in the existing form runner.

- [x] Split HTTP directive read-only access from mutable `$attrs` behavior.

      Converted `src/directive/http/http.ts` read-only configuration values
      (`trigger`, `interval`, request encoding/response type, SSE event types,
      `swap`, URL, success/error expressions, state targets, JSON assignment
      target, delay/throttle values, SSE flags, credentials, and reconnect
      callback) to `$attributes.read(...)` / `$attributes.has(...)`. Preserved
      `$attrs.$observe(...)`, `$attrs.$set(...)`, `$attrs.$addClass(...)`, and
      `$attrs.$removeClass(...)` for behavior-bearing mutation paths. Added a
      focused `http-attributes` runner for clean `data-trigger`, `data-target`,
      `data-swap`, and `data-loading-class` coverage.

- [x] Split input directive static setup reads from observers and writes.

      Converted `src/directive/input/input.ts` type dispatch, text/radio trim
      settings, date/number/range min/max/step setup, radio value/name checks,
      checkbox true/false values, hidden type checks, and `ngValue` expression
      reads through local `$attributes`-backed helpers. Preserved `$observe`
      for dynamic validation/value changes and `$set` for `ngValue` writes.
      The helper intentionally falls back to the compile/link attrs object only
      when direct compile tests omit DI or when interpolated DOM attributes
      still contain raw `{{...}}` text.

- [x] Convert `ngModelOptions` expression read.

      Converted `src/directive/model-options/model-options.ts` controller setup
      from injected `$attrs.ngModelOptions` to `$attributes.read($element,
      "ngModelOptions")`. Added coverage for `data-ng-model-options` normalized
      lookup. There are no `$observe` or `$set` paths in this directive slice.

- [x] Split router state directive reads from href writes and dynamic observers.

      Converted initial/static reads in `src/router/directives/state-directives.ts`
      for `ngSref`, `ngSrefOpts`, `ngState`, `ngStateParams`, `ngStateOpts`,
      `ngSrefActive`, and `ngSrefActiveEq` to `$attributes.read(...)`.
      Preserved `$attrs.$set(...)` for generated `href`/`action` writes and
      `$attrs.$observe(...)` for dynamic `ngState*` expression changes. Added
      normalized alias coverage for `data-ng-sref`, `data-ng-state`, and
      `data-ng-sref-active`.

- [x] Split validator initial reads from observed validator attributes.

      Converted initial reads/presence checks in
      `src/directive/validators/validators.ts` for `required`, `ngRequired`,
      `pattern`, `ngPattern`, `maxlength`, `ngMaxlength`, `minlength`, and
      `ngMinlength` through `$attributes`-backed helpers. Preserved existing
      `$observe(...)` calls for dynamic validator updates. Added normalized
      alias coverage for `data-ng-pattern`, `data-ng-minlength`,
      `data-ng-maxlength`, and `data-ng-required`.

- [x] Convert `ngView` static configuration reads.

      Converted `src/router/directives/view-directive.ts` reads for `onload`,
      `autoscroll`, `ngView`, and `name` to `$attributes.read(...)`. Added
      `data-name` coverage for named view lookup. There are no `$observe` or
      `$set` paths in this directive slice.

- [x] Convert `ngModel` initial expression/name reads.

      Converted `src/directive/model/model.ts` controller initialization for
      `ngModel` and initial `name` through `$attributes`-backed reads. Preserved
      `attr.$observe("name", ...)` for dynamic form-control rename behavior.
      Follow-up cleanup moved getter/setter parse expressions and nonassignable
      error reporting to the stored normalized model expression instead of
      rereading `attr.ngModel`. Added normalized alias coverage for
      `data-ng-model` and `data-name`.

- [x] Convert `select` initial mode/model reads.

      Converted `src/directive/select/select.ts` initial `multiple` presence
      and multiple-select `ngModel` watch expression reads through
      `$attributes`-backed helpers. Preserved option value handling in
      `select-ctrl.ts` and `optionDirective` because those paths are coupled to
      `$observe(...)`, `$set(...)`, and original `ngValue` name semantics. Added
      normalized alias coverage for `data-ng-model` and `data-multiple`.

- [x] Split select option initial reads from observer/write behavior.

      Converted `optionDirective` compile-time `ngValue` presence and `value`
      reads through `$attributes`-backed helpers, then passed the resulting
      initial facts into `SelectController._registerOption`. Preserved
      `optionAttrs.$observe(...)`, `optionAttrs.$set(...)`, and disabled
      observation as behavior-bearing paths. Added normalized alias coverage for
      `data-value` and `data-ng-value`.

- [x] Convert `ngInclude` static expression reads.

      Converted `src/directive/include/include.ts` compile-time reads for
      `ngInclude`, `src`, `onload`, and `autoscroll` to `$attributes.read(...)`.
      Added normalized alias coverage for `data-src` and `data-ng-include`.

- [x] Convert small read-only directives to `$attributes`.

      Converted direct normalized DOM reads in `ngBind`, `ngBindHtml`,
      `ngShow`, `ngHide`, `ngStyle`, `ngChannel`, `ngListener`, `ngSetter`,
      `ngScope`, `ngEl`, and `ngViewport` to `$attributes.read(...)` /
      `$attributes.has(...)`. Preserved `ngBindTemplate` observation and other
      mutation-observer behavior. Added normalized alias coverage for
      representative `data-*` forms across these directives.

- [x] Convert `ngClass` expression reads.

      Converted the `ngClass` expression read to `$attributes.read(...)`.
      Preserved `$addClass(...)` and `$removeClass(...)` on attrs because those
      paths represent animation-aware class mutation behavior. Added
      representative `data-ng-class` coverage.

- [x] Convert `ngWorker` static configuration reads.

      Converted `src/directive/worker/worker.ts` reads and presence checks for
      `ngWorker`, `trigger`, `params`, `latch`, `interval`, `onResult`,
      `onError`, `swap`, `delay`, and `throttle` to `$attributes.read(...)` /
      `$attributes.has(...)`. Preserved `attrs.$observe("latch")` and
      `attrs.$set("throttled", ...)` because those are reactive/write behavior.
      No dedicated worker directive test runner exists yet; this slice is
      covered by type, lint, and build validation.

- [x] Convert `ngRef` read target reads.

      Converted `src/directive/ref/ref.ts` reads for `ngRef` and `ngRefRead`
      to `$attributes.read(...)` / `$attributes.has(...)`, while keeping a
      direct attrs fallback for direct factory tests. Added representative
      `data-ng-ref-read` coverage.

- [x] Convert `ngMessages` static expression reads.

      Converted `src/directive/messages/messages.ts` reads for `ngMessages`,
      `for`, `multiple`, `ngMessagesMultiple`, `ngMessagesInclude`, `src`,
      `ngMessage`, `when`, `ngMessageExp`, and `whenExp` to
      `$attributes.read(...)`, with attrs fallbacks where direct compile/factory
      paths still supply only a link attrs object. Rendering, transclusion, and
      animation behavior remain unchanged. Added representative
      `data-ng-messages` / `data-ng-message` coverage.

- [x] Remove `ngMessages` decorated-attrs fallbacks.

      Confirmed `$attributes.read(...)` resolves element-transclude comment
      anchors through `getDirectiveHostElement(...)`. Added clone preservation
      for that host metadata so cloned element-transclusion anchors keep the
      same lookup behavior, then removed the remaining `attrs.ngMessages`,
      `attrs.for`, `attrs.multiple`,
      `attrs.ngMessagesMultiple`, `attrs.ngMessagesInclude`, `attrs.src`,
      `attrs.ngMessage`, `attrs.when`, `attrs.ngMessageExp`, and
      `attrs.whenExp` string-property fallbacks from
      `src/directive/messages/messages.ts`.

- [x] Move `ngTransclude` original-name lookup to `$attributes`.

      Added `$attributes.originalName(...)` and the shared
      `getNormalizedAttrName(...)` helper so directives can preserve
      `data-*`/original-name semantics without reading `$attrs.$attr`.
      Converted `src/directive/transclude/transclude.ts` to use the service for
      the default-slot check.

- [x] Re-check router active-class interpolation fallback.

      Tried removing the remaining `$attrs.ngSrefActive*` fallback after moving
      static reads to `$attributes`, but `state-directives` regressed because
      that fallback still carries compiled/interpolated values. Restored the
      fallback and left it as Phase 3 interpolation/observer work.

- [x] Convert `ngOptions` select configuration reads.

      Converted `src/directive/options/options.ts` reads for `multiple` and
      `ngOptions` to `$attributes.has(...)` / `$attributes.read(...)`.
      Selection rendering and model synchronization behavior remain unchanged.

- [x] Convert ARIA directive read checks.

      Converted `src/directive/aria/aria.ts` normalized reads and presence
      checks to `$attributes.read(...)` / `$attributes.has(...)`, including the
      shared `$aria._watchExpr(...)` helper, click/dblclick augmentation,
      messages live-region handling, and ngModel shape/range checks. Preserved
      existing `$observe(...)` behavior for dynamic range and required values.

- [x] Remove ARIA dependency on `Attributes.$normalize`.

      Replaced the remaining `attr.$normalize(...)` call in
      `src/directive/aria/aria.ts` with the shared `directiveNormalize(...)`
      helper. ARIA no longer needs the attrs object for normalized read checks;
      the remaining attrs dependencies in this area are observer/write behavior
      owned by other directives.

- [x] For each directive, split read-only configuration access from reactive
      attribute behavior. Only read-only configuration should move to DOM helper
      queries in this phase.

- [x] Preserve `$observe` call sites until Phase 3.

      Current converted slices preserve observer behavior in `ngHttp`,
      `input`, `ngState`, and form-name handling. `$attrs.$set(...)` and class
      mutation paths also remain in place where they represent directive
      behavior rather than read-only configuration.

- [ ] Validate the converted set.

  ```sh
  ./node_modules/.bin/tsc --noEmit --project tsconfig.json
  npx playwright test \
    src/directive/http/http.test.ts \
    src/directive/input/input.test.ts \
    src/directive/form/form.test.ts \
    src/directive/model-options/model-option.test.ts \
    src/directive/repeat/repeat.test.ts \
    src/router/directives/state-directives.test.ts \
    src/router/router.test.ts
  ```

- [ ] Checkpoint acceptance: directive configuration reads are mostly
      element-based, and remaining `$attrs` dependencies are behavior-bearing
      (`$observe`, `$set`, class mutation, original-name lookup, or public API).

## Phase 3: Replace `$observe` Storage With Element Observation

Proposed solution: introduce an injectable `$attributes` service, aligned with
the existing injectable `$element`. The service owns normalized element
attribute reads, writes, and observation. Internally it replaces
`Attributes`-owned observer storage with an element-keyed attribute observer
registry backed by `MutationObserver`. Scope owns lifecycle and scheduling by
registering teardown on `$destroy` and dispatching notifications through the
normal microtask update path.

Do not put DOM observation mechanics directly into scope core. Scope should not
need to know about DOM nodes; it should only own cleanup and scheduling for work
associated with a scope.

- [ ] Enumerate all `$observe` call sites and the interpolation paths that feed
      them.

  ```sh
  rg -n "\\$observe|_observers|_inter|addAttrInterpolateDirective|addTextInterpolateDirective" src/core src/directive --glob '!**/*.js'
  ```

- [ ] Write characterization tests for: - initial observer callback value, -
      interpolated attribute updates, - direct DOM attribute mutation through
      `setAttribute`/`removeAttribute`, - observer deregistration, - cleanup on
      `scope.$destroy`, - exception handling through `$exceptionHandler`, -
      boolean/aliased attributes.

- [x] Add first `$attributes.observe(...)` characterization tests.

      Added service-level tests for initial callback delivery, normalized
      `data-*` observation, direct `setAttribute`/`removeAttribute`, explicit
      deregistration, cleanup through `scope.$destroy`, and exception routing
      through `$exceptionHandler`. Interpolated attribute updates and
      boolean/aliased attributes remain as separate characterization tasks
      before migrating directive callers.

- [x] Prototype a small observer registry not tied to the public `Attributes`
      object.

      Initial public service shape:

      ```ts
      interface AttributesService {
        read(
          element: Element | Node,
          normalizedName: string,
        ): string | undefined;
        has(element: Element | Node, normalizedName: string): boolean;
        observe(
          scope: ng.Scope,
          element: Element | Node,
          normalizedName: string,
          callback: (value?: unknown) => void,
        ): () => void;
        set(
          element: Element | Node,
          normalizedName: string,
          value: string | boolean | null,
          options?: { write?: boolean; attrName?: string },
        ): void;
        addClass(element: Element | Node, value: string): void;
        removeClass(element: Element | Node, value: string): void;
        updateClass(
          element: Element | Node,
          newValue: string,
          oldValue: string,
        ): void;
      }
      ```

      Internal behavior:
      - resolve normalized names to actual DOM attribute names,
      - preserve `data-*`, `data-ng-*`, and supported prefix normalization,
      - read the initial value from the element,
      - keep callbacks keyed by element plus normalized attribute name,
      - create or reuse one `MutationObserver` per element,
      - normalize mutation attribute names before dispatch,
      - schedule callback delivery through the normal microtask path,
      - deregister individual callbacks when the returned teardown runs,
      - disconnect the element observer when the last callback is removed,
      - register teardown on `scope.$destroy`.

      Implemented the first registry inside `$attributes`: one
      `MutationObserver` per element, callbacks keyed by normalized attribute
      name, disconnect when the final callback deregisters, and scope-owned
      teardown. This does not yet replace `Attributes.$observe(...)`; it creates
      the element-based service boundary first.

- [x] Register the service as `$attributes`, not `$attrs`, so extension authors
      get an explicit service while existing per-link `$attrs` remains a
      temporary compatibility object.

- [ ] Keep `Attributes.$observe(...)` as a compatibility facade over the new
      registry during this phase.

- [x] Migrate the first low-risk directive observer to `$attributes.observe`.

      Converted `ngBindTemplate` from `attr.$observe("ngBindTemplate", ...)` to
      `$attributes.observe(scope, element, "ngBindTemplate", ...)`. This is a
      narrow first caller because compile-time interpolation already writes
      interpolated attribute values back to the DOM through `$set`, so the
      element observer sees both initial and later template values.

- [x] Migrate ARIA range and required observers to `$attributes.observe`.

      Converted `ngAria` observers for `min`, `max`, and `required` to the
      element observer service. Added aliased-attribute dispatch so
      `$attributes.observe(..., "min", ...)` is notified when `ng-min` updates
      the underlying aliased value, matching legacy `attr.$observe("min", ...)`
      behavior. Required state now reads live element presence through
      `$attributes.has(...)` instead of `attr.required`.

- [x] Migrate `ngHttp` latch observation to `$attributes.observe`.

      Converted the `latch` observer in `src/directive/http/http.ts` to the
      element observer service. The existing `callBackAfterFirst(...)` behavior
      remains in place so the initial attribute value does not trigger an extra
      request.

- [x] Migrate `ngWorker` latch observation to `$attributes.observe`.

      Converted the `latch` observer in `src/directive/worker/worker.ts` to the
      element observer service. This mirrors the HTTP latch migration and keeps
      the existing `callBackAfterFirst(...)` behavior.

- [x] Migrate form name observation to `$attributes.observe`.

      Converted dynamic form/ngForm name observation from
      `attrParam.$observe(...)` to `$attributes.observe(...)`, preserving the
      existing scope publication and parent-form rename logic for interpolated
      `name` and `ng-form` values.

- [x] Migrate `ngModel` control name observation to `$attributes.observe`.

      Injected `$attributes` into `ngModelDirective(...)` and moved dynamic
      model-control name observation from `attr.$observe("name", ...)` to
      element observation. The direct unit-test constructor path no longer
      registers an attrs observer; production DI supplies `$attributes`.

- [x] Migrate validator attribute observation to `$attributes.observe`.

      Converted required, pattern, maxlength, and minlength validator
      observers to the element observer service. The validator helper preserves
      interpolated read fallbacks so non-input elements with values like
      `minlength="{{min}}"` keep receiving evaluated values while observation
      is sourced from the element.

- [x] Migrate input attribute observation to `$attributes.observe`.

      Converted input date/number/range `min`, `max`, and `step` observers plus
      radio `value` rendering observation to the element observer service. The
      shared input observer helper preserves interpolated attrs fallbacks while
      using element mutations as the notification source.

- [x] Migrate router dynamic state ref observation to `$attributes.observe`.

      Converted `StateRefDynamicDirective` observation for `ngState`,
      `ngStateParams`, and `ngStateOpts` to the element observer service.
      Expression reads still fall back to the attrs object when the live DOM
      contains raw interpolation.

- [x] Migrate URL alias observation to `$attributes.observe`.

      Converted `ng-src`, `ng-srcset`, and `ng-href` sanitization observers to
      the element observer service. The first raw interpolation notification is
      skipped to preserve the existing timing contract where a static `src`
      remains in place until interpolation produces a concrete value.

- [x] Migrate select option observation to `$attributes.observe`.

      Converted `select-ctrl` option `value`/`disabled` observers to the
      element observer service. `ngValue` now reads the raw scope expression
      directly and only uses element `value` observation for extension-authored
      writes to the actual value attribute. The observer uses `Object.is(...)`
      to suppress controller-owned hash writes, including stable `NaN` values.

- [x] Move core `@` binding observation off the public `attrs.$observe(...)`
      call path.

      Converted isolate-scope and controller `@` binding setup in
      `initializeDirectiveBindings(...)` to register with `$attributes.observe`
      for element mutations while subscribing directly to the internal attrs
      observer list for synchronous `attrs.$set(...)` and interpolation
      delivery. The `_observers` metadata remains in this checkpoint because
      interpolation still uses it for scope selection and immediate notification
      semantics.

- [x] Keep `Attributes.$set(...)`, `$addClass(...)`, `$removeClass(...)`, and
      `$updateClass(...)` as compatibility facades over `$attributes` where
      practical.

- [x] Move `Attributes.$set(...)` DOM writes and `$attributes.observe(...)`
      notifications through `$attributes.set(...)`.

      Added `$attributes.set(...)` as the shared normalized write path for DOM
      attribute writes and observer notification. `Attributes.$set(...)` still
      updates the legacy attrs object and still notifies legacy `$observe(...)`
      listeners, but framework-owned `$attributes.observe(...)` callbacks now
      receive `$set(...)` writes synchronously through the service. The service
      suppresses the duplicate `MutationObserver` notification for its own
      writes and uses own-property alias lookup so attributes such as
      `constructor` cannot accidentally resolve inherited object properties.

- [x] Move class helper facades through `$attributes`.

      Added `$attributes.addClass(...)`, `$attributes.removeClass(...)`, and
      `$attributes.updateClass(...)` as animation-aware element helper methods.
      `Attributes.$addClass(...)`, `$removeClass(...)`, and `$updateClass(...)`
      now delegate through the service when available, while retaining their
      legacy fallback implementation for direct construction paths.

- [x] Move built-in class mutation callers to `$attributes`.

      Converted `ngClass`, HTTP loading-class toggles, and compile-time class
      interpolation from `$attrs` class helper calls to direct `$attributes`
      calls. `$attributes.addClass(...)` and `removeClass(...)` now tokenize
      space-delimited class strings for direct `classList` operations while
      preserving `$animate` calls with the original string.

- [x] Move low-risk built-in attribute writes to `$attributes.set(...)`.

      Converted HTTP loading/throttled state attributes, worker throttled state,
      ngCloak removal, and router href/action writes from `$attrs.$set(...)` to
      `$attributes.set(...)`. HTTP preserves the original DOM attribute name for
      `data-loading` by passing `$attributes.originalName(...)` as the write
      target.

- [x] Move input-element `ngValue` DOM writes to `$attributes.set(...)`.

      Converted runtime `ngValue` writes on actual input elements from
      `attr.$set("value", ...)` to `$attributes.set(element, "value", ...)`.
      Radio inputs still need the raw non-string `ngValue` result for strict
      model comparison, so that semantic value now lives in an element-keyed
      `WeakMap` rather than on `attrs.value`. The direct directive factory
      fallback still calls `attr.$set(...)` when tests instantiate
      `ngValueDirective()` without DI. Option-element `ngValue` remains on
      `attr.$set(...)` until select owns a replacement for raw option values
      and legacy `optionAttrs.$observe("value", ...)` compatibility.

- [x] Move static option text fallback writes to `$attributes.set(...)`.

      Converted the `option` compile-time fallback that materializes a missing
      `value` attribute from literal option text to `$attributes.set(...)`.
      Interpolated option text and option `ngValue` writes remain on
      `optionAttrs.$set(...)` because those paths still feed legacy observers
      and non-string select values.

- [x] Move interpolated option text writes to `$attributes.set(...)`.

      Converted the select controller path for options whose text content is
      interpolated from `optionAttrs.$set("value", ...)` to
      `$attributes.set(optionElement, "value", ...)`. Option-element
      `ngValue` remains on the legacy attrs path because it must still carry
      non-string values and support external `optionAttrs.$observe("value")`
      / `$set("value", ...)` interactions.

- [x] Remove select write fallbacks that depended on `optionAttrs.$set(...)`.

      Tightened the select and option directive factories plus
      `SelectController._registerOption(...)` to require `$attributes` in the
      runtime path. Select no longer has internal `$set(...)` write fallbacks;
      extension coverage now exercises `$attributes.observe(...)` and
      `$attributes.set(...)` against the option element instead of mutating
      `optionAttrs`.

- [x] Move compile-owned writes off the public `$set(...)` call path.

      Split the `Attributes.$set(...)` implementation into an internal
      `Attributes._setValue(...)` method and changed compile interpolation plus
      template-attribute merging to use the internal method. This preserves
      legacy attrs state, `$observe(...)` delivery, boolean/alias handling, and
      `$attributes.set(...)` DOM writes while removing compile's dependency on
      the public `$set(...)` facade.

- [x] Remove the public `Attributes.$set(...)` facade.

      Removed the public `$set(...)` method from runtime `Attributes`. Compile
      internals and compile-only tests use `_setValue(...)`; built-in
      directives and extension-style select coverage use `$attributes.set(...)`.
      Source, generated type declarations, Closure externs, and `dist` output
      now have no public `.$set(...)` attribute API. Remaining `$set*` names in
      the source tree are unrelated form/model controller APIs.

- [x] Move boolean alias directive writes to `$attributes.set(...)`.

      Converted generated boolean aliases such as `ngDisabled`, `ngChecked`,
      and related boolean attribute directives from `attr.$set(...)` to
      `$attributes.set(...)`. The `ngChecked`/`ngModel` guard is preserved.
      Pattern and URL aliases remain separate because they are coupled to
      interpolation, sanitization, and legacy observer compatibility.

- [x] Move evaluated validator alias writes to `$attributes.set(...)`.

      Converted evaluated aliases such as `ngMin`, `ngMax`, `ngStep`,
      `ngMinlength`, `ngMaxlength`, and `ngPattern` from `attr.$set(...)` to
      `$attributes.set(...)`. Validator observation now uses the observer value
      when a write to `ng-*` notifies the aliased underlying name, so
      `maxlength`/`minlength` validators no longer require `attrs.maxlength` or
      `attrs.minlength` to be decorated by `$set`.

- [x] Move URL alias directive writes to `$attributes.set(...)`.

      Converted `ng-src`, `ng-srcset`, and `ng-href` sanitized writes from
      `attr.$set(...)` to `$attributes.set(...)`, including empty `href`
      removal and initial constant sanitization. The directives still retain
      their existing interpolation skip logic and sanitizer behavior.

- [x] Allow built-in and external directives to inject `$attributes` the same
      way they already inject `$element`.

- [x] Allow controllers to inject `$attributes` the same way they already inject
      `$element`.

      Added `$attributes` as a compile-local injectable for component
      `template` / `templateUrl` functions and directive controllers. Compile
      coverage now verifies controller-local injection plus component template
      and templateUrl functions reading/writing through the element-based
      `$attributes` service.

- [x] Update interpolation-driven attribute changes to notify the same registry
      instead of writing observer state into `Attributes._observers`.

      Moved interpolation metadata off the per-link `Attributes._observers`
      arrays. Compile now marks interpolated attributes and observer target
      scopes in internal `$attributes` service state; `$observe`,
      `$attributes.observe`, URL alias handling, and select option handling use
      that service state instead of decorating observer arrays with `_inter` or
      `_scope`.

- [x] Ensure `$attributes` never exposes normalized attributes by decorating an
      object with string properties. Normalized access must go through methods
      such as `read`, `has`, `observe`, and `set`.

      Confirmed the public `AttributesService` type has no string index
      signature and added runtime coverage that `read`, `set`, and `observe`
      do not create normalized-name properties such as `ngOnTest` on the
      `$attributes` service object. Attribute state remains element-owned and
      method-accessed.

- [x] Validate observer behavior.

  ```sh
  ./node_modules/.bin/tsc --noEmit --project tsconfig.json
  npx playwright test \
    src/core/compile/compile.test.ts \
    src/directive/observe/observe.test.ts \
    src/directive/input/input.test.ts \
    src/directive/form/form.test.ts
  ```

  Passed on this branch after the core `@` binding observer migration. Also
  passed the broader focused observer/directive group covering select options,
  URL attrs, router state refs, validators, model names, and `$attributes`
  service characterization.

- [x] Checkpoint acceptance: observer behavior works without relying on per-link
      `Attributes` observer storage.

      Accepted after passing TypeScript, lint, compile/select/attrs/attributes
      observer coverage, and a `$attributes` service guard proving normalized
      attribute values are not exposed as decorated object properties.

## Phase 4: Design Replacement For `$set` And Class Helpers

- [x] Enumerate all `$set`, `$addClass`, `$removeClass`, and `$updateClass` call
      sites.

  ```sh
  rg -n "\\$set|\\$addClass|\\$removeClass|\\$updateClass" src --glob '!**/*.js'
  ```

  Current result: public/generated `Attributes.$set` is gone. The remaining
  compile `Attributes` helper methods are `$addClass`, `$removeClass`, and
  `$updateClass`, with focused coverage in `compile.spec.ts`. Broad `$set*`
  matches in `src/directive` are unrelated form/model controller APIs such as
  `$setViewValue`, `$setValidity`, and `$setPristine`.

- [x] Extract element-based helpers for: - normalized attribute writes, -
      boolean attribute/property writes, - aliased attributes, - observer
      notification after writes, - animation-aware class changes.

- [x] Keep `Attributes` methods as facades over the new helpers until all
      callers can use the helpers directly.

- [x] Validate write behavior.

  ```sh
  ./node_modules/.bin/tsc --noEmit --project tsconfig.json
  npx playwright test \
    src/core/compile/compile.test.ts \
    src/directive/input/input.test.ts \
    src/directive/form/form.test.ts \
    src/animations/animate.test.ts
  ```

  Passed with `./node_modules/.bin/tsc --noEmit --project tsconfig.json`,
  `./node_modules/.bin/tsc --project tsconfig.test.json`, and the focused
  Playwright write-path group with one worker.

- [x] Checkpoint acceptance: writes, observers, boolean attributes, and animated
      class changes pass through element-based helpers.

## Phase 5: Reduce Compile-Time Allocation

- [x] Identify where compile creates `Attributes` only to carry normalized
      values.

  ```sh
  rg -n "new Attributes|createEmptyAttributes|collectElementDirectiveMatches|addAttrInterpolateDirective|mergeTemplateAttributes" src/core/compile/compile.ts
  ```

  Current result: the obvious excess allocation was in
  `collectElementDirectiveMatches(...)`, which eagerly created `Attributes` for
  every element with attributes even when no directive, interpolation, class
  helper, observer, or template merge needed `$attrs`.

- [x] Introduce a lightweight internal normalized-attribute record for directive
      matching.

  Implemented as lazy scan/backfill state: ordinary attributes are read from the
  DOM while matching, and an `Attributes` instance is materialized only when a
  matching directive/interpolation/special attribute requires it. If a later
  attribute creates `$attrs`, earlier plain attributes are backfilled in DOM
  order so directive-visible `$attrs` remains complete.

- [x] Create `Attributes` only when a directive actually receives `$attrs`,
      calls `$observe`, uses `$set`/class helpers, or needs `$attr`.

  `Attributes` is still created for any node with matched directives because
  compile/link/controller APIs still receive `$attrs`; nodes with ordinary
  attributes and no matched directive now avoid the allocation.

- [x] Add allocation-focused compile benchmarks before and after the change.

  ```sh
  make benchmark-compile
  ```

  Added `static attributed tree` to the compile benchmark so static DOM with
  ordinary attributes and no directives is measured separately from the
  existing no-attribute static case and directive-heavy cases.

- [x] Validate compile behavior and allocations.

  ```sh
  ./node_modules/.bin/tsc --noEmit --project tsconfig.json
  npx playwright test src/core/compile/compile.test.ts
  make benchmark-compile
  ```

  Passed TypeScript, lint, and `src/core/compile/compile.test.ts`. The compile
  benchmark now includes the allocation-targeted `static attributed tree` case.
  The saved baseline is not a clean before/after for this phase because it
  predates other compile/scope changes on the branch; current run was mixed
  against the previous saved run, so checkpoint acceptance remains open.

- [x] Checkpoint acceptance: compile tests pass and benchmark output shows fewer
      `Attributes` allocations or no measurable regression.

      Accepted after a controlled temporary comparison between the current tree
      and a copy with only the lazy `Attributes` allocation slice reverted. Both
      copies typechecked. With 15 benchmark samples:
      - reverted baseline `static attributed tree`: 113,208 ops/sec, 43.30 ms
        median;
      - current `static attributed tree`: 131,004 ops/sec, 32.50 ms median.

      The target template has five attributed static elements with no matched
      directives. The reverted scan allocates one `Attributes` object per
      attributed element; the current scan allocates none until a directive,
      interpolation, special attribute, or template merge requires `$attrs`.

## Phase 6: Public API Decision

- [x] Audit public exports and docs.

  ```sh
  rg -n "ng\\.Attributes|Attributes|\\$attrs" src/interface.ts src/namespace.ts src/docs.ts docs integrations/closure --glob '!docs/static/**'
  ```

- [x] Decide whether `ng.Attributes` remains as a public compatibility type,
      becomes an internal-only facade, or is removed entirely.

  Decision: keep `ng.Attributes` as the public directive `$attrs` type while
  directive hooks still receive `$attrs`, but make it a structural interface
  instead of exporting the internal compile `Attributes` runtime class. Public
  code should treat `$attrs` as a normalized attribute view; element-based reads
  and writes should use `$attributes`.

- [x] Update public-surface files for the API decision: - `src/interface.ts` -
      `src/namespace.ts` - `src/docs.ts` - Closure extern generation -
      generated `docs/static/typedoc` - generated `dist`

  Applied the public-surface part of this step: `src/docs.ts` no longer exports
  the runtime `Attributes` class, `src/interface.ts` defines the public
  structural `Attributes` interface, and `src/namespace.ts` maps
  `ng.Attributes` to that public interface.

- [x] Validate public output.

  ```sh
  node integrations/closure/scripts/validate-externs.mjs
  make doc
  make build
  ```

  Passed `make public-namespace-api`, `node
  integrations/closure/scripts/validate-externs.mjs`, `make doc`, and
  `make build`. The generated Closure surface validates 160 public `ng`
  namespace types.

- [x] Checkpoint acceptance: public API changes are intentional, docs are
      regenerated, and Closure externs validate.

## Final Validation

- [x] Run full type/lint/build validation.

  ```sh
  ./node_modules/.bin/tsc --noEmit --project tsconfig.json
  ./node_modules/.bin/tsc --project tsconfig.test.json
  make lint
  make build
  ```

  Passed after Phase 6 public-surface regeneration.

- [x] Run targeted browser tests.

  ```sh
  npx playwright test \
    src/core/compile/compile.test.ts \
    src/directive/init/init.test.ts \
    src/directive/switch/switch.test.ts \
    src/directive/if/if.test.ts \
    src/directive/inject/inject.test.ts \
    src/directive/http/http.test.ts \
    src/directive/input/input.test.ts \
    src/directive/form/form.test.ts \
    src/directive/repeat/repeat.test.ts \
    src/router/router.test.ts
  ```

  Passed with one Playwright worker. An initial `input.test.ts` run hit stale
  browser state around a pre-existing randomized validity identity assertion;
  rerunning the input file and then the full targeted group passed.

- [ ] Run full precommit or coverage validation.

  ```sh
  make precommit
  ```

- [ ] Check final dependency surface.

  ```sh
  rg -n "\\bAttributes\\b|\\$attrs|\\$observe|\\$set|\\$addClass|\\$removeClass|\\$updateClass" src --glob '!**/*.js'
  ```

- [ ] Final acceptance: every remaining hit is either intentionally public,
      intentionally internal, or documented with a follow-up task.
