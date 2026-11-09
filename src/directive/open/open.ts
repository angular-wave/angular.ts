import { _exceptionHandler, _parse } from "../../injection-tokens.ts";
import { addScopeEventListener } from "../../core/render/event-dispatcher.ts";
import { queueScopedAfterRender } from "../../core/render/after-render.ts";
import { registerScopeDestroyCallback } from "../../core/scope/scope.ts";
import {
  getNormalizedAttr,
  hasNormalizedAttr,
  setNormalizedAttr,
} from "../../shared/dom.ts";
import { createErrorFactory } from "../../shared/utils.ts";

const openError = createErrorFactory("ngOpen");

interface NativeOpenBinding {
  _events: readonly string[];
  _overlay: boolean;
  _read(): boolean;
  _write(open: boolean): void;
}

/** Binds native popover, dialog, and details state to an assignable scope expression. */
export function ngOpenDirective(
  parse: ng.ParseService,
  exceptionHandler: ng.ExceptionHandlerService,
): ng.Directive {
  return {
    restrict: "A",
    priority: 100,
    compile(template: Element) {
      const expression = getNormalizedAttr(template, "ngOpen") ?? "";

      return (scope: ng.Scope, element: Element): void => {
        const binding = createNativeOpenBinding(element);
        const get = parse(expression);
        const assign = get._assign;

        if (!binding || !assign) {
          if (
            element.hasAttribute("popover") ||
            (element.localName === "dialog" &&
              hasNormalizedAttr(element, "modal"))
          ) {
            throw openError(
              "nonassign",
              'ng-open="{0}" requires an assignable expression for native overlays.',
              expression,
            );
          }

          scope.watch(expression, (value) => {
            setNormalizedAttr(element, "open", !!value);
          });
          return;
        }

        let disposed = false;
        let deferred = false;
        let lastRequestedValue = get(scope);

        const writeNativeState = (expectedValue = lastRequestedValue): void => {
          if (disposed || get(scope) !== expectedValue) return;
          const open = binding._read();
          lastRequestedValue = open;
          if (get(scope) !== open) assign(scope, open);
        };

        const applyScopeState = (): void => {
          if (disposed) return;
          const requestedValue = get(scope);
          const open = !!requestedValue;
          lastRequestedValue = requestedValue;

          if (binding._read() === open) return;

          if (binding._overlay && !element.isConnected) {
            if (!deferred) {
              deferred = true;
              queueScopedAfterRender(element, scope, () => {
                deferred = false;
                if (!disposed && element.isConnected) applyScopeState();
              });
            }
            return;
          }

          try {
            binding._write(open);
          } catch (error) {
            exceptionHandler(error);
          }

          // A canceled native opening need not emit toggle. Reconcile immediately,
          // unless an event handler has issued a newer model write in the meantime.
          writeNativeState(requestedValue);
        };

        const syncNativeState = (): void => {
          if (disposed) return;
          try {
            if (get(scope) !== lastRequestedValue) {
              applyScopeState();
            } else {
              // Queued toggle/close events may describe an obsolete transition.
              writeNativeState();
            }
          } catch (error) {
            exceptionHandler(error);
          }
        };

        for (const event of binding._events) {
          addScopeEventListener(scope, element, event, syncNativeState, {
            capture: true,
          });
        }

        const stop = scope.watch(expression, applyScopeState);
        registerScopeDestroyCallback(scope, () => {
          disposed = true;
          stop?.();
          if (binding._overlay && binding._read()) {
            try {
              binding._write(false);
            } catch (error) {
              exceptionHandler(error);
            }
          }
        });
      };
    },
  };
}

ngOpenDirective.$inject = [_parse, _exceptionHandler];

function createNativeOpenBinding(
  element: Element,
): NativeOpenBinding | undefined {
  if (element.hasAttribute("popover")) {
    if (
      !(element instanceof HTMLElement) ||
      typeof element.showPopover !== "function" ||
      typeof element.hidePopover !== "function"
    ) {
      throw openError(
        "unsupported",
        "The native Popover API is not available.",
      );
    }

    return {
      _events: ["toggle"],
      _overlay: true,
      _read: () => element.matches(":popover-open"),
      _write(open) {
        if (open) element.showPopover();
        else element.hidePopover();
      },
    };
  }

  if (element.localName === "dialog") {
    const dialog = element as HTMLDialogElement;
    const modal = hasNormalizedAttr(element, "modal");
    if (
      typeof dialog.show !== "function" ||
      typeof dialog.close !== "function" ||
      (modal && typeof dialog.showModal !== "function")
    ) {
      throw openError("unsupported", "The native Dialog API is not available.");
    }

    return {
      _events: ["toggle", "close"],
      _overlay: true,
      _read: () => dialog.open,
      _write(open) {
        if (!open) dialog.close();
        else if (modal) dialog.showModal();
        else dialog.show();
      },
    };
  }

  if (element.localName === "details") {
    const details = element as HTMLDetailsElement;
    return {
      _events: ["toggle"],
      _overlay: false,
      _read: () => details.open,
      _write(open) {
        details.open = open;
      },
    };
  }

  return undefined;
}
