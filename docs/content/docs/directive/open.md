---
title: ng-open
description:
  Share native popover, dialog, and details state with the application
---

`ng-open` binds an assignable boolean expression to native open state. Scope
writes show or hide the element; native interactions write the current state
back into the same expression. No additional application listeners are needed.

## Popovers

<!-- tested-by: src/directive/open/open.test.ts -->

```html
<button ng-click="menuOpen = !menuOpen">Toggle menu</button>
<div popover="auto" ng-open="menuOpen">Menu contents</div>
```

AngularTS uses `showPopover()` and `hidePopover()`, not an `open` attribute or
visibility classes. Native invokers, Escape, click-outside dismissal, and the
browser closing one auto-popover to show another all update the bound model.
`popover="manual"` keeps its native behavior: it is not light-dismissed. The
native Popover API must be available; an unsupported browser reports an error
rather than silently substituting a CSS overlay.

## Details

<!-- tested-by: src/directive/open/open.test.ts -->

```html
<details ng-open="expanded">
  <summary>More information</summary>
  <p>Disclosure content</p>
</details>
```

Clicking the summary updates `expanded`, and assigning `expanded` updates the
disclosure. Existing computed, non-assignable expressions remain one-way
boolean-attribute bindings.

## Dialogs

<!-- tested-by: src/directive/open/open.test.ts -->

```html
<dialog ng-open="confirmOpen" data-modal>
  <form method="dialog">
    <button value="accepted">Accept</button>
  </form>
</dialog>
```

`data-modal` selects `showModal()`; without it, dialogs use non-modal `show()`.
Native closure, including `method="dialog"`, updates the bound state without
changing `returnValue`. Submit-button `formmethod="dialog"` overrides also keep
their native closing behavior and still mark the AngularTS form submitted.
Preventing a `cancel` event leaves both the dialog and its model open. A
`<dialog popover>` uses the Popover API instead of modal dialog behavior.
Popovers are non-modal and do not provide modal focus trapping.

## Ownership

Listeners and watches belong to the directive's scope. Destroying that scope
closes its overlays and removes the binding without writing into dead state.
Queued native events read the element's actual current state, so an earlier
close event cannot undo a newer reopen. The directive does not add styling, drag
behavior, positioning, or application-specific dismissal handlers.
