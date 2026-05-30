function hasPointerCaptureApi(element: Element): element is Element & {
  setPointerCapture(pointerId: number): void;
  releasePointerCapture(pointerId: number): void;
  hasPointerCapture?(pointerId: number): boolean;
} {
  return (
    typeof element.setPointerCapture === "function" &&
    typeof element.releasePointerCapture === "function"
  );
}

function getPointerId(event: Event): number | undefined {
  const pointerId = (event as PointerEvent).pointerId;

  return typeof pointerId === "number" ? pointerId : undefined;
}

/** Captures active pointer streams on an element until pointer end/cancel. */
export function ngPointerCaptureDirective(): ng.Directive {
  return {
    restrict: "A",
    priority: 1,
    link(scope: ng.Scope, element: Element): void {
      if (!hasPointerCaptureApi(element)) {
        return;
      }

      const capturedPointers = new Set<number>();

      const capturePointer = (event: Event): void => {
        const pointerId = getPointerId(event);

        if (pointerId === undefined) {
          return;
        }

        try {
          element.setPointerCapture(pointerId);
          capturedPointers.add(pointerId);
        } catch {
          // Browsers can reject capture for inactive or invalid pointer ids.
        }
      };

      const releasePointer = (event: Event): void => {
        const pointerId = getPointerId(event);

        if (pointerId !== undefined) {
          releasePointerId(pointerId);
        }
      };

      const forgetPointer = (event: Event): void => {
        const pointerId = getPointerId(event);

        if (pointerId !== undefined) {
          capturedPointers.delete(pointerId);
        }
      };

      const releasePointerId = (pointerId: number): void => {
        if (!capturedPointers.delete(pointerId)) {
          return;
        }

        try {
          element.releasePointerCapture(pointerId);
        } catch {
          // Capture may already be released by the browser or element removal.
        }
      };

      element.addEventListener("pointerdown", capturePointer);
      element.addEventListener("pointerup", releasePointer);
      element.addEventListener("pointercancel", releasePointer);
      element.addEventListener("lostpointercapture", forgetPointer);

      scope.$on("$destroy", () => {
        element.removeEventListener("pointerdown", capturePointer);
        element.removeEventListener("pointerup", releasePointer);
        element.removeEventListener("pointercancel", releasePointer);
        element.removeEventListener("lostpointercapture", forgetPointer);

        for (const pointerId of Array.from(capturedPointers)) {
          releasePointerId(pointerId);
        }
      });
    },
  };
}
