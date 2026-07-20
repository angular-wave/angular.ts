const htmlCanvasRuntimeDisabledMessage = "HTML-in-Canvas is disabled; configure $htmlCanvas.enabled before using canvas rendering directives.";
const htmlCanvasRuntimeUnsupportedMessage = "HTML-in-Canvas requires native browser support; AngularTS does not provide a fallback renderer.";
const defaultHtmlCanvasConfig = {
    enabled: false,
    throwOnUnsupported: true,
    defaultScheduler: "paint",
    defaultMode: "2d",
    requireFlag: true,
};
class NativeHtmlCanvasRoot {
    constructor(service, canvas, options, onDispose) {
        this._sources = new Set();
        this._disposed = false;
        this._paintQueued = false;
        this._paintListener = (event) => {
            this._paintQueued = false;
            this._paint(event);
        };
        this._service = service;
        this._onDispose = onDispose;
        this.canvas = canvas;
        this.mode = options.mode;
        this.scheduler = options.scheduler;
        this.canvas.setAttribute("layoutsubtree", "true");
        this.canvas.layoutSubTree = true;
        this.canvas.addEventListener("paint", this._paintListener);
    }
    addSource(source, options) {
        if (this._disposed) {
            throw new Error("HTML-in-Canvas root has already been disposed.");
        }
        if (source.parentElement !== this.canvas) {
            throw new Error("ng-html-canvas-source must be a direct child of the ng-html-canvas root.");
        }
        const entry = { element: source, options };
        if (typeof MutationObserver !== "undefined") {
            entry.observer = new MutationObserver(() => {
                this.invalidate();
            });
            entry.observer.observe(source, {
                attributes: true,
                characterData: true,
                childList: true,
                subtree: true,
            });
        }
        if (typeof ResizeObserver !== "undefined") {
            entry.resizeObserver = new ResizeObserver(() => {
                this.invalidate();
            });
            entry.resizeObserver.observe(source);
        }
        this._sources.add(entry);
        this.invalidate();
        return () => {
            entry.observer?.disconnect();
            entry.resizeObserver?.disconnect();
            this._sources.delete(entry);
            this.invalidate();
        };
    }
    invalidate() {
        if (this._disposed || this._paintQueued)
            return;
        this._paintQueued = true;
        if (this.scheduler === "raf") {
            this._service.requestAnimationFrame(() => {
                if (this._disposed)
                    return;
                this._paintQueued = false;
                this._service.requestPaint(this.canvas);
            });
            return;
        }
        this._service.requestPaint(this.canvas);
    }
    dispose() {
        if (this._disposed)
            return;
        this._disposed = true;
        this.canvas.removeEventListener("paint", this._paintListener);
        for (const source of this._sources) {
            source.observer?.disconnect();
            source.resizeObserver?.disconnect();
        }
        this._sources.clear();
        this._onDispose();
    }
    _paint(event) {
        if (this.mode !== "2d") {
            return;
        }
        const changed = event.changedElements;
        const context = this.canvas.getContext("2d");
        if (!context?.drawElementImage) {
            throw new Error(`${htmlCanvasRuntimeUnsupportedMessage} Missing 2d.`);
        }
        context.reset();
        for (const source of this._sources) {
            if (!shouldDrawSource(source.element, changed)) {
                continue;
            }
            const transform = drawSource(context, context.drawElementImage, source);
            if (transform !== undefined && source.element instanceof HTMLElement) {
                source.element.style.transform = String(transform);
            }
        }
    }
}
function shouldDrawSource(source, changedElements) {
    if (!changedElements?.length)
        return true;
    return changedElements.some((changed) => {
        return changed === source || source.contains(changed);
    });
}
function drawSource(context, drawElementImage, source) {
    const x = source.options.x ?? 0;
    const y = source.options.y ?? 0;
    if (source.options.width !== undefined &&
        source.options.height !== undefined) {
        return drawElementImage.call(context, source.element, x, y, source.options.width, source.options.height);
    }
    return drawElementImage.call(context, source.element, x, y);
}
function isCallable(value) {
    return typeof value === "function";
}
function createCanvas(doc) {
    if (!doc || typeof HTMLCanvasElement === "undefined")
        return undefined;
    const canvas = doc.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
    return canvas instanceof HTMLCanvasElement ? canvas : undefined;
}
function getCanvas2dSupport(canvas) {
    if (!canvas)
        return false;
    const context = canvas.getContext("2d");
    return isCallable(context?.drawElementImage);
}
function getWebGlSupport(canvas) {
    if (!canvas)
        return false;
    const context = (canvas.getContext("webgl2") ??
        canvas.getContext("webgl"));
    return isCallable(context?.texElementImage2D);
}
function getWebGpuSupport(win) {
    if (!win)
        return false;
    const target = win;
    const queue = target.GPUQueue;
    return Boolean(target.navigator.gpu &&
        queue?.prototype &&
        isCallable(queue.prototype.copyElementImageToTexture));
}
function getHtmlCanvasRuntimeSupport(options = {}) {
    if (options.support) {
        return options.support;
    }
    const doc = "document" in options ? options.document : globalThis.document;
    const win = "window" in options ? options.window : globalThis.window;
    const canvas = createCanvas(doc);
    const drawElementImage = getCanvas2dSupport(canvas);
    const texElementImage2D = getWebGlSupport(canvas);
    const copyElementImageToTexture = getWebGpuSupport(win);
    const paintEvent = Boolean(canvas && "onpaint" in canvas);
    const requestPaint = canvas
        ? isCallable(canvas.requestPaint)
        : false;
    const layoutSubtree = Boolean(canvas &&
        ("layoutSubTree" in canvas ||
            "layoutSubtree" in canvas ||
            drawElementImage ||
            texElementImage2D ||
            copyElementImageToTexture));
    const modes = {
        "2d": layoutSubtree && paintEvent && requestPaint && drawElementImage,
        webgl: layoutSubtree && paintEvent && requestPaint && texElementImage2D,
        webgpu: layoutSubtree && paintEvent && requestPaint && copyElementImageToTexture,
    };
    return {
        layoutSubtree,
        paintEvent,
        requestPaint,
        drawElementImage,
        texElementImage2D,
        copyElementImageToTexture,
        modes,
        supported: modes["2d"] || modes.webgl || modes.webgpu,
    };
}
function assertHtmlCanvasConfigInactive(config) {
}
function normalizeHtmlCanvasConfig(config = {}) {
    return {
        ...defaultHtmlCanvasConfig,
        ...config,
    };
}
function assertHtmlCanvasRuntimeSupported(config, options = {}) {
    const support = getHtmlCanvasRuntimeSupport(options);
    const normalized = normalizeHtmlCanvasConfig(config);
    if (normalized.enabled === false) {
        return support;
    }
    const mode = normalized.defaultMode;
    if (!support.modes[mode]) {
        if (normalized.enabled === "auto" && !normalized.throwOnUnsupported) {
            return support;
        }
        throw new Error(`${htmlCanvasRuntimeUnsupportedMessage} Missing ${mode}.`);
    }
    return support;
}
class NativeHtmlCanvasService {
    constructor(config, win, doc, supportOptions = {}) {
        this._roots = new WeakMap();
        this._ownedRoots = new Set();
        this._disposed = false;
        this._window = win;
        this.config = normalizeHtmlCanvasConfig(config);
        this.support = assertHtmlCanvasRuntimeSupported(this.config, {
            document: doc,
            window: win,
            ...supportOptions,
        });
        this.supported = this.support.modes[this.config.defaultMode];
        this.enabled =
            this.config.enabled === true ||
                (this.config.enabled === "auto" && this.supported);
    }
    registerRoot(canvas, options = {}) {
        this.assertActive();
        this.assertEnabled();
        const existing = this._roots.get(canvas);
        if (existing)
            return existing;
        const root = new NativeHtmlCanvasRoot(this, canvas, {
            mode: options.mode ?? this.config.defaultMode,
            scheduler: options.scheduler ?? this.config.defaultScheduler,
        }, () => {
            this._roots.delete(canvas);
            this._ownedRoots.delete(root);
        });
        this._roots.set(canvas, root);
        this._ownedRoots.add(root);
        return root;
    }
    registerSource(canvas, source, options = {}) {
        const root = this.getRoot(canvas);
        return root.addSource(source, options);
    }
    invalidate(canvas) {
        this.assertActive();
        this.assertEnabled();
        this._roots.get(canvas)?.invalidate();
    }
    requestPaint(canvas) {
        this.assertActive();
        const requestPaint = canvas.requestPaint;
        if (!isCallable(requestPaint)) {
            throw new Error(`${htmlCanvasRuntimeUnsupportedMessage} Missing paint.`);
        }
        requestPaint.call(canvas);
    }
    requestAnimationFrame(callback) {
        this.assertActive();
        this._window.requestAnimationFrame(callback);
    }
    /** @internal */
    dispose() {
        if (this._disposed)
            return;
        this._disposed = true;
        for (const root of Array.from(this._ownedRoots))
            root.dispose();
        this._ownedRoots.clear();
    }
    getRoot(canvas) {
        const existing = this._roots.get(canvas);
        if (existing)
            return existing;
        return this.registerRoot(canvas);
    }
    assertEnabled() {
        if (this.enabled)
            return;
        if (this.config.enabled === false) {
            throw new Error(htmlCanvasRuntimeDisabledMessage);
        }
        throw new Error(`${htmlCanvasRuntimeUnsupportedMessage} Missing ${this.config.defaultMode}.`);
    }
    assertActive() {
        if (this._disposed) {
            throw new Error("HTML-in-Canvas runtime has already been disposed.");
        }
    }
}
/** @internal */
function createHtmlCanvasRuntimeState() {
    return {
        config: defaultHtmlCanvasConfig,
        destroyed: false,
    };
}
/** @internal */
function applyHtmlCanvasConfiguration(state, config) {
    if (state.destroyed) {
        throw new Error("HTML-in-Canvas runtime has already been disposed.");
    }
    state.config = normalizeHtmlCanvasConfig({
        ...state.config,
        ...config,
    });
}
/** @internal */
function createHtmlCanvasService(state, win, doc) {
    if (state.destroyed) {
        throw new Error("HTML-in-Canvas runtime has already been disposed.");
    }
    state.service ?? (state.service = new NativeHtmlCanvasService(state.config, win, doc));
    return state.service;
}
/** @internal */
function destroyHtmlCanvasRuntimeState(state) {
    if (state.destroyed)
        return;
    state.destroyed = true;
    state.service?.dispose();
    state.service = undefined;
}

export { NativeHtmlCanvasService, applyHtmlCanvasConfiguration, assertHtmlCanvasConfigInactive, assertHtmlCanvasRuntimeSupported, createHtmlCanvasRuntimeState, createHtmlCanvasService, destroyHtmlCanvasRuntimeState, getHtmlCanvasRuntimeSupport, htmlCanvasRuntimeDisabledMessage, htmlCanvasRuntimeUnsupportedMessage, normalizeHtmlCanvasConfig };
