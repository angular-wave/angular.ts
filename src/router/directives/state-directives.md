/\*\*

- `ng-state`: dynamic state link directive.
-
- `ng-state` activates a state transition when the host element is activated.
-
- The directive is expression-driven:
-
- - `ng-state`: expression that evaluates to a state name.
- - `ng-state-params`: expression that evaluates to an params object.
- - `ng-state-opts`: expression that evaluates to `TransitionOptions`.
-
- It accepts normal `click`/form events and supports custom events with
- `ng-state-opts="{ events: [...] }"`.
-
- ### Example
-
- ```html

  ```

- <a ng-state="'orders.detail'" ng-state-params="{ id: order.id }">
- Open order {{order.id}}
- </a>
-
- <a
- ng-state="activeState"
- ng-state-params="{ tab: ui.selectedTab }"
- ng-state-opts="{ inherit: false, reload: true }"
- >
- Switch tab
- </a>
- ```
  */
  ```

/\*\*

- `data-state-active` and `data-state-exact`: state-link active tracking.
-
- `data-state-active` marks the host as active when the linked state is active,
- including descendants (scope-level include semantics).
-
- `data-state-exact` narrows active matching to the exact linked state.
-
- These are the canonical link modifiers.
  \*/

/\*\*

- `data-state-current="true|false"` is framework-owned output.
-
- Route-link directives manage this attribute automatically when either
- `data-state-active` or `data-state-exact` is present.
  \*/
