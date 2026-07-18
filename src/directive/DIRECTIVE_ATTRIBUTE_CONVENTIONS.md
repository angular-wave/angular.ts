# Directive Attribute Conventions

This contract keeps AngularTS directive APIs predictable as browser API
coverage grows.

## Canonical Shapes

- [x] Directive identity uses `ng-*`.
  - Examples: `ng-get`, `ng-post`, `ng-worker`, `ng-viewport`, `ng-state`.
- [x] Expression callbacks use `on-*`.
  - Examples: `on-success`, `on-error`, `on-enter`, `on-leave`,
    `on-result`, `on-message`, `on-reconnect`.
- [x] Plain options, flags, and modifier values use `data-*`.
  - Examples: `data-state-success`, `data-state-error`,
    `data-viewport-threshold`, `data-viewport-margin`,
    `data-viewport-once`, `data-loading`.
- [x] Generated DOM event handlers keep the event directive namespace.
  - Examples: `ng-click`, `ng-submit`, `ng-on-pointerdown`.

## Rules

- [x] Do not create a second directive only to modify a directive. Modifiers
      belong on the owning directive as `data-*` attributes.
- [x] Do not document `data-on-*` as the canonical callback spelling. The DOM
      helper may normalize `data-*` aliases, but examples and tests should use
      `on-*` for expressions.
- [x] Do not document bare callback names such as `success` or `error`.
      Callback attributes must communicate that they evaluate expressions.
- [x] Route or state names are plain values, not expression callbacks. Use
      `data-state-success`, `data-state-error`, and similar modifier names.
- [x] When an attribute both configures a directive and accepts an expression,
      split the behavior or document it as a blocked design before expanding
      the public surface.

## Current Alignment Checklist

- [x] `ng-viewport` uses `on-enter` / `on-leave` for expressions and
      `data-viewport-*` for observer options.
- [x] `ng-worker` uses `on-result` / `on-error` for expressions and
      `data-params` for payload configuration.
- [x] HTTP directives use `on-success` / `on-error` for response expressions
      and `data-state-success` / `data-state-error` for router navigation.
- [x] HTTP `data-target` and realtime protocol `target` values are CSS
      selectors. Object response assignment uses `on-success` with `$res`.
- [x] `ng-web-transport` examples and tests use `on-open`, `on-message`,
      `on-reconnect`, and `on-error` for lifecycle expressions.
- [ ] Audit legacy directive pages and examples whenever a new browser API
      directive is added.

## Target Semantics

- [x] `data-target` selects the DOM element that receives a swap.
- [x] Realtime protocol `target` overrides that selector for one message.
- [x] Bare `target` retains its native HTML meaning and is not a directive
      option.
- [x] Object responses never merge into scope implicitly. Use
      `on-success="model = $res"` for explicit assignment.
