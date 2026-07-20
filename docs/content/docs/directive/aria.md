---
title: 'ARIA directives'
weight: 220
---

`$aria` adds accessibility-supporting defaults for the ARIA attributes that
AngularTS manages automatically. It preserves authored ARIA, `role`, and
`tabindex` attributes and should be treated as framework support for accessible
applications, not as a complete WCAG conformance guarantee.

Use `module.config({ $aria: ... })` when you need to adjust global ARIA support.

```javascript
const app = angular.module('app', []);

app.config({
  $aria: {
    ariaCurrent: true,
    ariaCurrentToken: 'page',
    bindRoleForState: true,
    bindKeydown: true,
    diagnostics: false,
  },
});
```

`ng.AriaConfig` checks the standardized `aria-current` token used by router
links. ARIA attributes authored in templates remain native HTML rather than
framework-specific TypeScript contracts.

The public attribute-name surface follows the current
[WAI-ARIA states and properties](https://www.w3.org/TR/wai-aria/#states_and_properties)
and the developer-facing
[MDN ARIA attribute reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes).

Use `ng-aria-disable` on an element when framework-authored ARIA behavior should
not apply locally.

Set `diagnostics: true` in development or tests when you want `$aria` to warn
about common authored mistakes on framework-managed interactive elements:
positive `tabindex`, missing accessible names, missing ARIA reference targets,
and interactive elements hidden with `aria-hidden="true"`.

`ng-state` route links consume `$aria` defaults. Non-anchor and non-button route
links receive `role="link"`, `tabindex="0"`, and Enter/Space keyboard activation
when enabled. Links using `data-state-active` or `data-state-exact` receive
framework-managed `aria-current` while current unless an authored `aria-current`
value already exists.

### Executable examples

{{< showhtml src="examples/aria/ng-click-non-native.html" >}}

{{< showraw src="examples/aria/ng-click-non-native.html" >}}

{{< showhtml src="examples/aria/form-validation.html" >}}

{{< showraw src="examples/aria/form-validation.html" >}}

{{< showhtml src="examples/aria/ng-messages-live.html" >}}

{{< showraw src="examples/aria/ng-messages-live.html" >}}
