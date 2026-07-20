import { _htmlCanvas } from '../../injection-tokens.js';

function getCanvasRoot(element) {
    if (typeof HTMLCanvasElement !== "undefined" &&
        element instanceof HTMLCanvasElement) {
        return element;
    }
    const parent = element.parentElement;
    if (typeof HTMLCanvasElement !== "undefined" &&
        parent instanceof HTMLCanvasElement) {
        return parent;
    }
    throw new Error("HTML-in-Canvas source and invalidation directives require a parent canvas root.");
}
function readNumberAttribute(element, name) {
    const value = element.getAttribute(name) ?? element.getAttribute(`data-${name}`);
    if (value === null || value.trim() === "") {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function createHtmlCanvasSourceOptions(element) {
    return {
        get x() {
            return readNumberAttribute(element, "x");
        },
        get y() {
            return readNumberAttribute(element, "y");
        },
        get width() {
            return readNumberAttribute(element, "width");
        },
        get height() {
            return readNumberAttribute(element, "height");
        },
    };
}
ngHtmlCanvasDirective.$inject = [_htmlCanvas];
function ngHtmlCanvasDirective($htmlCanvas) {
    return {
        restrict: "A",
        compile(element) {
            if (typeof HTMLCanvasElement !== "undefined" &&
                element instanceof HTMLCanvasElement) {
                element.setAttribute("layoutsubtree", "true");
            }
            return (scope, linkedElement) => {
                const root = $htmlCanvas.registerRoot(linkedElement);
                scope.$on("$destroy", () => {
                    root.dispose();
                });
            };
        },
    };
}
ngHtmlCanvasSourceDirective.$inject = [_htmlCanvas];
function ngHtmlCanvasSourceDirective($htmlCanvas) {
    return {
        restrict: "A",
        link(scope, element) {
            const destroy = $htmlCanvas.registerSource(getCanvasRoot(element), element, createHtmlCanvasSourceOptions(element));
            scope.$on("$destroy", destroy);
        },
    };
}
ngHtmlCanvasInvalidateDirective.$inject = [_htmlCanvas];
function ngHtmlCanvasInvalidateDirective($htmlCanvas) {
    return {
        restrict: "A",
        link(_scope, element) {
            $htmlCanvas.invalidate(getCanvasRoot(element));
        },
    };
}

export { ngHtmlCanvasDirective, ngHtmlCanvasInvalidateDirective, ngHtmlCanvasSourceDirective };
