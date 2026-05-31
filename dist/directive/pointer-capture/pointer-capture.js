function hasPointerCaptureApi(element) {
    return (typeof element.setPointerCapture === "function" &&
        typeof element.releasePointerCapture === "function");
}
function getPointerId(event) {
    const pointerId = event.pointerId;
    return typeof pointerId === "number" ? pointerId : undefined;
}
/** Captures active pointer streams on an element until pointer end/cancel. */
function ngPointerCaptureDirective() {
    return {
        restrict: "A",
        priority: 1,
        link(scope, element) {
            if (!hasPointerCaptureApi(element)) {
                return;
            }
            const capturedPointers = new Set();
            const capturePointer = (event) => {
                const pointerId = getPointerId(event);
                if (pointerId === undefined) {
                    return;
                }
                try {
                    element.setPointerCapture(pointerId);
                    capturedPointers.add(pointerId);
                }
                catch {
                    // Browsers can reject capture for inactive or invalid pointer ids.
                }
            };
            const releasePointer = (event) => {
                const pointerId = getPointerId(event);
                if (pointerId !== undefined) {
                    releasePointerId(pointerId);
                }
            };
            const forgetPointer = (event) => {
                const pointerId = getPointerId(event);
                if (pointerId !== undefined) {
                    capturedPointers.delete(pointerId);
                }
            };
            const releasePointerId = (pointerId) => {
                if (!capturedPointers.delete(pointerId)) {
                    return;
                }
                try {
                    element.releasePointerCapture(pointerId);
                }
                catch {
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

export { ngPointerCaptureDirective };
