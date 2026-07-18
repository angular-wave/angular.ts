/** Scheduler used by the native HTML-in-Canvas renderer. */
export type HtmlCanvasScheduler = "paint" | "raf";

/** Rendering target requested by an HTML-in-Canvas root. */
export type HtmlCanvasMode = "2d" | "webgl" | "webgpu";

export interface HtmlCanvasRuntimeSupport {
  /** Native layout-subtree support or an implied drawing primitive. */
  layoutSubtree: boolean;

  /** Native canvas `paint` event support. */
  paintEvent: boolean;

  /** Native canvas `requestPaint()` support. */
  requestPaint: boolean;

  /** Native 2D `drawElementImage(...)` support. */
  drawElementImage: boolean;

  /** Native WebGL `texElementImage2D(...)` support. */
  texElementImage2D: boolean;

  /** Native WebGPU `copyElementImageToTexture(...)` support. */
  copyElementImageToTexture: boolean;

  /** Supported rendering modes for the current runtime. */
  modes: Record<HtmlCanvasMode, boolean>;

  /** Whether any native HTML-in-Canvas rendering mode is available. */
  supported: boolean;
}

export interface HtmlCanvasRuntimeSupportOptions {
  document?: Document | null;
  window?: Window | null;
  support?: HtmlCanvasRuntimeSupport;
}

export interface HtmlCanvasSourceOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface HtmlCanvasRootOptions {
  mode?: HtmlCanvasMode;
  scheduler?: HtmlCanvasScheduler;
}

export interface HtmlCanvasRoot {
  readonly canvas: HTMLCanvasElement;
  readonly mode: HtmlCanvasMode;
  readonly scheduler: HtmlCanvasScheduler;
  invalidate(): void;
  dispose(): void;
}

export interface HtmlCanvasService {
  readonly config: NormalizedHtmlCanvasConfig;
  readonly support: HtmlCanvasRuntimeSupport;
  readonly enabled: boolean;
  readonly supported: boolean;
  registerRoot(
    canvas: HTMLCanvasElement,
    options?: HtmlCanvasRootOptions,
  ): HtmlCanvasRoot;
  registerSource(
    canvas: HTMLCanvasElement,
    source: Element,
    options?: HtmlCanvasSourceOptions,
  ): () => void;
  invalidate(canvas: HTMLCanvasElement): void;
  requestPaint(canvas: HTMLCanvasElement): void;
}

interface HtmlCanvasConfigBase {
  /**
   * Throw when HTML-in-Canvas is enabled on a runtime that does not support the
   * native browser feature. AngularTS does not provide a fallback renderer.
   */
  throwOnUnsupported?: boolean;

  /** Default invalidation scheduler for canvas-backed HTML layers. */
  defaultScheduler?: HtmlCanvasScheduler;

  /** Default canvas rendering target for directives that do not specify one. */
  defaultMode?: HtmlCanvasMode;

  /**
   * Require an explicit browser/engine feature flag before activation.
   * This stays strict by default while the browser API is experimental.
   */
  requireFlag?: boolean;
}

/** Disabled or omitted HTML-in-Canvas config. */
export interface HtmlCanvasDisabledConfig extends HtmlCanvasConfigBase {
  enabled?: false;
}

/** Active HTML-in-Canvas config. */
export interface HtmlCanvasActiveConfig extends HtmlCanvasConfigBase {
  enabled: true | "auto";
  throwOnUnsupported: boolean;
  defaultScheduler: HtmlCanvasScheduler;
  defaultMode: HtmlCanvasMode;
}

/**
 * Declarative config accepted by `NgModule.config({ $htmlCanvas: ... })`.
 *
 * The integration is disabled by default and has no AngularTS fallback.
 */
export type HtmlCanvasConfig =
  | HtmlCanvasDisabledConfig
  | HtmlCanvasActiveConfig;

export interface NormalizedHtmlCanvasConfig {
  enabled: false | true | "auto";
  throwOnUnsupported: boolean;
  defaultScheduler: HtmlCanvasScheduler;
  defaultMode: HtmlCanvasMode;
  requireFlag: boolean;
}

export const htmlCanvasRuntimeDisabledMessage =
  "HTML-in-Canvas is disabled; configure $htmlCanvas.enabled before using canvas rendering directives.";

export const htmlCanvasRuntimeUnsupportedMessage =
  "HTML-in-Canvas requires native browser support; AngularTS does not provide a fallback renderer.";

const defaultHtmlCanvasConfig: NormalizedHtmlCanvasConfig = {
  enabled: false,
  throwOnUnsupported: true,
  defaultScheduler: "paint",
  defaultMode: "2d",
  requireFlag: true,
};

type ExperimentalCanvas = HTMLCanvasElement & {
  layoutSubTree?: boolean;
  layoutSubtree?: boolean;
  requestPaint?: () => void;
};

type ExperimentalPaintEvent = Event & {
  changedElements?: readonly Element[];
};

type Experimental2DContext = CanvasRenderingContext2D & {
  drawElementImage?: (
    element: Element,
    ...args: [number, number] | [number, number, number, number]
  ) => DOMMatrix | string | undefined;
  reset?: () => void;
};

interface RegisteredSource {
  element: Element;
  options: HtmlCanvasSourceOptions;
  observer?: MutationObserver;
  resizeObserver?: ResizeObserver;
}

class NativeHtmlCanvasRoot implements HtmlCanvasRoot {
  readonly canvas: HTMLCanvasElement;
  readonly mode: HtmlCanvasMode;
  readonly scheduler: HtmlCanvasScheduler;

  private readonly _service: NativeHtmlCanvasService;
  private readonly _onDispose: () => void;
  private readonly _sources = new Set<RegisteredSource>();
  private _disposed = false;
  private _paintQueued = false;
  private readonly _paintListener = (event: Event) => {
    this._paintQueued = false;
    this._paint(event as ExperimentalPaintEvent);
  };

  constructor(
    service: NativeHtmlCanvasService,
    canvas: HTMLCanvasElement,
    options: Required<HtmlCanvasRootOptions>,
    onDispose: () => void,
  ) {
    this._service = service;
    this._onDispose = onDispose;
    this.canvas = canvas;
    this.mode = options.mode;
    this.scheduler = options.scheduler;
    this.canvas.setAttribute("layoutsubtree", "true");
    (this.canvas as ExperimentalCanvas).layoutSubTree = true;
    this.canvas.addEventListener("paint", this._paintListener);
  }

  addSource(source: Element, options: HtmlCanvasSourceOptions): () => void {
    if (this._disposed) {
      throw new Error("HTML-in-Canvas root has already been disposed.");
    }

    if (source.parentElement !== this.canvas) {
      throw new Error(
        "ng-html-canvas-source must be a direct child of the ng-html-canvas root.",
      );
    }

    const entry: RegisteredSource = { element: source, options };

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

  invalidate(): void {
    if (this._disposed || this._paintQueued) return;

    this._paintQueued = true;

    if (this.scheduler === "raf") {
      this._service.requestAnimationFrame(() => {
        if (this._disposed) return;

        this._paintQueued = false;
        this._service.requestPaint(this.canvas);
      });

      return;
    }

    this._service.requestPaint(this.canvas);
  }

  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;
    this.canvas.removeEventListener("paint", this._paintListener);

    for (const source of this._sources) {
      source.observer?.disconnect();
      source.resizeObserver?.disconnect();
    }

    this._sources.clear();
    this._onDispose();
  }

  private _paint(event: ExperimentalPaintEvent): void {
    if (this.mode !== "2d") {
      return;
    }

    const changed = event.changedElements;
    const context = this.canvas.getContext(
      "2d",
    ) as Experimental2DContext | null;

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

function shouldDrawSource(
  source: Element,
  changedElements?: readonly Element[],
): boolean {
  if (!changedElements?.length) return true;

  return changedElements.some((changed) => {
    return changed === source || source.contains(changed);
  });
}

function drawSource(
  context: Experimental2DContext,
  drawElementImage: NonNullable<Experimental2DContext["drawElementImage"]>,
  source: RegisteredSource,
): DOMMatrix | string | undefined {
  const x = source.options.x ?? 0;
  const y = source.options.y ?? 0;

  if (
    source.options.width !== undefined &&
    source.options.height !== undefined
  ) {
    return drawElementImage.call(
      context,
      source.element,
      x,
      y,
      source.options.width,
      source.options.height,
    );
  }

  return drawElementImage.call(context, source.element, x, y);
}

function isCallable(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

function createCanvas(
  doc: Document | null | undefined,
): HTMLCanvasElement | undefined {
  if (!doc || typeof HTMLCanvasElement === "undefined") return undefined;

  const canvas = doc.createElementNS("http://www.w3.org/1999/xhtml", "canvas");

  return canvas instanceof HTMLCanvasElement ? canvas : undefined;
}

function getCanvas2dSupport(canvas: HTMLCanvasElement | undefined): boolean {
  if (!canvas) return false;

  const context = canvas.getContext("2d") as
    | (CanvasRenderingContext2D & { drawElementImage?: unknown })
    | null
    | undefined;

  return isCallable(context?.drawElementImage);
}

function getWebGlSupport(canvas: HTMLCanvasElement | undefined): boolean {
  if (!canvas) return false;

  const context = (canvas.getContext("webgl2") ??
    canvas.getContext("webgl")) as
    | (WebGLRenderingContext & { texElementImage2D?: unknown })
    | null
    | undefined;

  return isCallable(context?.texElementImage2D);
}

function getWebGpuSupport(win: Window | null | undefined): boolean {
  if (!win) return false;

  const target = win as Window & {
    GPUQueue?: { prototype?: Record<string, unknown> };
    navigator: Navigator & { gpu?: unknown };
  };
  const queue = target.GPUQueue;

  return Boolean(
    target.navigator.gpu &&
    queue?.prototype &&
    isCallable(queue.prototype.copyElementImageToTexture),
  );
}

export function getHtmlCanvasRuntimeSupport(
  options: HtmlCanvasRuntimeSupportOptions = {},
): HtmlCanvasRuntimeSupport {
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
    ? isCallable((canvas as ExperimentalCanvas).requestPaint)
    : false;
  const layoutSubtree = Boolean(
    canvas &&
    ("layoutSubTree" in canvas ||
      "layoutSubtree" in canvas ||
      drawElementImage ||
      texElementImage2D ||
      copyElementImageToTexture),
  );
  const modes = {
    "2d": layoutSubtree && paintEvent && requestPaint && drawElementImage,
    webgl: layoutSubtree && paintEvent && requestPaint && texElementImage2D,
    webgpu:
      layoutSubtree && paintEvent && requestPaint && copyElementImageToTexture,
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

export function assertHtmlCanvasConfigInactive(config: HtmlCanvasConfig): void {
  void config;
}

export function normalizeHtmlCanvasConfig(
  config: HtmlCanvasConfig | NormalizedHtmlCanvasConfig = {},
): NormalizedHtmlCanvasConfig {
  return {
    ...defaultHtmlCanvasConfig,
    ...config,
  };
}

export function assertHtmlCanvasRuntimeSupported(
  config: HtmlCanvasConfig | NormalizedHtmlCanvasConfig,
  options: HtmlCanvasRuntimeSupportOptions = {},
): HtmlCanvasRuntimeSupport {
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

export class NativeHtmlCanvasService implements HtmlCanvasService {
  readonly config: NormalizedHtmlCanvasConfig;
  readonly support: HtmlCanvasRuntimeSupport;
  readonly enabled: boolean;
  readonly supported: boolean;

  private readonly _roots = new WeakMap<
    HTMLCanvasElement,
    NativeHtmlCanvasRoot
  >();
  private readonly _ownedRoots = new Set<NativeHtmlCanvasRoot>();
  private readonly _window: Window;
  private _disposed = false;

  constructor(
    config: HtmlCanvasConfig | NormalizedHtmlCanvasConfig,
    win: Window,
    doc: Document,
    supportOptions: HtmlCanvasRuntimeSupportOptions = {},
  ) {
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

  registerRoot(
    canvas: HTMLCanvasElement,
    options: HtmlCanvasRootOptions = {},
  ): HtmlCanvasRoot {
    this.assertActive();
    this.assertEnabled();

    const existing = this._roots.get(canvas);

    if (existing) return existing;

    const root = new NativeHtmlCanvasRoot(
      this,
      canvas,
      {
        mode: options.mode ?? this.config.defaultMode,
        scheduler: options.scheduler ?? this.config.defaultScheduler,
      },
      () => {
        this._roots.delete(canvas);
        this._ownedRoots.delete(root);
      },
    );

    this._roots.set(canvas, root);
    this._ownedRoots.add(root);

    return root;
  }

  registerSource(
    canvas: HTMLCanvasElement,
    source: Element,
    options: HtmlCanvasSourceOptions = {},
  ): () => void {
    const root = this.getRoot(canvas);

    return root.addSource(source, options);
  }

  invalidate(canvas: HTMLCanvasElement): void {
    this.assertActive();
    this.assertEnabled();
    this._roots.get(canvas)?.invalidate();
  }

  requestPaint(canvas: HTMLCanvasElement): void {
    this.assertActive();
    const requestPaint = (canvas as ExperimentalCanvas).requestPaint;

    if (!isCallable(requestPaint)) {
      throw new Error(`${htmlCanvasRuntimeUnsupportedMessage} Missing paint.`);
    }

    requestPaint.call(canvas);
  }

  requestAnimationFrame(callback: () => void): void {
    this.assertActive();
    this._window.requestAnimationFrame(callback);
  }

  /** @internal */
  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;

    for (const root of Array.from(this._ownedRoots)) root.dispose();

    this._ownedRoots.clear();
  }

  private getRoot(canvas: HTMLCanvasElement): NativeHtmlCanvasRoot {
    const existing = this._roots.get(canvas);

    if (existing) return existing;

    return this.registerRoot(canvas) as NativeHtmlCanvasRoot;
  }

  private assertEnabled(): void {
    if (this.enabled) return;

    if (this.config.enabled === false) {
      throw new Error(htmlCanvasRuntimeDisabledMessage);
    }

    throw new Error(
      `${htmlCanvasRuntimeUnsupportedMessage} Missing ${this.config.defaultMode}.`,
    );
  }

  private assertActive(): void {
    if (this._disposed) {
      throw new Error("HTML-in-Canvas runtime has already been disposed.");
    }
  }
}

/** @internal */
export interface HtmlCanvasRuntimeState {
  config: NormalizedHtmlCanvasConfig;
  service?: NativeHtmlCanvasService;
  destroyed: boolean;
}

/** @internal */
export function createHtmlCanvasRuntimeState(): HtmlCanvasRuntimeState {
  return {
    config: defaultHtmlCanvasConfig,
    destroyed: false,
  };
}

/** @internal */
export function applyHtmlCanvasConfiguration(
  state: HtmlCanvasRuntimeState,
  config: HtmlCanvasConfig,
): void {
  if (state.destroyed) {
    throw new Error("HTML-in-Canvas runtime has already been disposed.");
  }

  state.config = normalizeHtmlCanvasConfig({
    ...state.config,
    ...config,
  });
}

/** @internal */
export function createHtmlCanvasService(
  state: HtmlCanvasRuntimeState,
  win: Window,
  doc: Document,
): HtmlCanvasService {
  if (state.destroyed) {
    throw new Error("HTML-in-Canvas runtime has already been disposed.");
  }

  state.service ??= new NativeHtmlCanvasService(state.config, win, doc);

  return state.service;
}

/** @internal */
export function destroyHtmlCanvasRuntimeState(
  state: HtmlCanvasRuntimeState,
): void {
  if (state.destroyed) return;

  state.destroyed = true;
  state.service?.dispose();
  state.service = undefined;
}
