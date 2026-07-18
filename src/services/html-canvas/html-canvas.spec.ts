/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createAngular } from "../../runtime/index.ts";
import { htmlCanvasModule } from "../../runtime/html-canvas.ts";
import { dealoc } from "../../shared/dom.ts";
import {
  ngHtmlCanvasDirective,
  ngHtmlCanvasInvalidateDirective,
  ngHtmlCanvasSourceDirective,
} from "../../directive/html-canvas/html-canvas.ts";
import {
  assertHtmlCanvasConfigInactive,
  applyHtmlCanvasConfiguration,
  assertHtmlCanvasRuntimeSupported,
  createHtmlCanvasRuntimeState,
  createHtmlCanvasService,
  destroyHtmlCanvasRuntimeState,
  getHtmlCanvasRuntimeSupport,
  NativeHtmlCanvasService,
  htmlCanvasRuntimeDisabledMessage,
  htmlCanvasRuntimeUnsupportedMessage,
  normalizeHtmlCanvasConfig,
  type HtmlCanvasRuntimeSupport,
} from "./html-canvas.ts";

type TestLinkFn = (scope: ng.Scope, element: Element) => void;

const unsupportedRuntime: HtmlCanvasRuntimeSupport = {
  layoutSubtree: false,
  paintEvent: false,
  requestPaint: false,
  drawElementImage: false,
  texElementImage2D: false,
  copyElementImageToTexture: false,
  modes: {
    "2d": false,
    webgl: false,
    webgpu: false,
  },
  supported: false,
};

const supported2dRuntime: HtmlCanvasRuntimeSupport = {
  layoutSubtree: true,
  paintEvent: true,
  requestPaint: true,
  drawElementImage: true,
  texElementImage2D: false,
  copyElementImageToTexture: false,
  modes: {
    "2d": true,
    webgl: false,
    webgpu: false,
  },
  supported: true,
};

const supportedWebglRuntime: HtmlCanvasRuntimeSupport = {
  ...supported2dRuntime,
  drawElementImage: false,
  texElementImage2D: true,
  modes: {
    "2d": false,
    webgl: true,
    webgpu: false,
  },
};

describe("HTML-in-Canvas", () => {
  let $compile: ng.CompileService;
  let $rootScope: ng.Scope;

  beforeEach(() => {
    const app = document.getElementById("app") as HTMLElement;

    dealoc(app);
    window.angular = new Angular();
    const injector = window.angular.bootstrap(app, []);

    injector.invoke((_$compile_, _$rootScope_) => {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });
  });

  function bootstrapCustomHtmlCanvasRuntime(): void {
    const app = document.getElementById("app") as HTMLElement;

    dealoc(app);
    window.angular = createAngular({
      modules: [htmlCanvasModule],
    }) as unknown as Angular;

    const injector = window.angular.bootstrap(app, []);

    injector.invoke((_$compile_, _$rootScope_) => {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });
  }

  it("reports native runtime support without enabling a fallback", () => {
    const support = getHtmlCanvasRuntimeSupport();

    expect(typeof support.layoutSubtree).toBe("boolean");
    expect(typeof support.paintEvent).toBe("boolean");
    expect(typeof support.drawElementImage).toBe("boolean");
    expect(typeof support.texElementImage2D).toBe("boolean");
    expect(typeof support.copyElementImageToTexture).toBe("boolean");
    expect(typeof support.supported).toBe("boolean");
  });

  it("reports unsupported when no document or window is available", () => {
    expect(
      getHtmlCanvasRuntimeSupport({ document: null, window: null }),
    ).toEqual(unsupportedRuntime);
  });

  it("reports 2d, webgl, and webgpu native mode support", () => {
    const canvas = document.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "canvas",
    ) as HTMLCanvasElement;
    const fakeWindow = {
      navigator: { gpu: {} },
      GPUQueue: {
        prototype: {
          copyElementImageToTexture() {
            return undefined;
          },
        },
      },
    } as unknown as Window;
    const fakeDocument = {
      createElementNS() {
        Object.defineProperty(canvas, "layoutSubTree", { value: true });
        Object.defineProperty(canvas, "onpaint", { value: null });
        Object.defineProperty(canvas, "requestPaint", {
          value() {
            return undefined;
          },
        });
        canvas.getContext = ((type: string) => {
          if (type === "2d") {
            return {
              drawElementImage() {
                return undefined;
              },
            };
          }

          if (type === "webgl2") {
            return {
              texElementImage2D() {
                return undefined;
              },
            };
          }

          return null;
        }) as HTMLCanvasElement["getContext"];

        return canvas;
      },
    } as unknown as Document;

    expect(
      getHtmlCanvasRuntimeSupport({
        document: fakeDocument,
        window: fakeWindow,
      }),
    ).toEqual({
      layoutSubtree: true,
      paintEvent: true,
      requestPaint: true,
      drawElementImage: true,
      texElementImage2D: true,
      copyElementImageToTexture: true,
      modes: {
        "2d": true,
        webgl: true,
        webgpu: true,
      },
      supported: true,
    });
  });

  it("reports unsupported when a document cannot create a canvas", () => {
    const fakeDocument = {
      createElementNS() {
        return document.createElementNS("http://www.w3.org/1999/xhtml", "div");
      },
    } as unknown as Document;

    expect(
      getHtmlCanvasRuntimeSupport({
        document: fakeDocument,
        window: null,
      }),
    ).toEqual(unsupportedRuntime);
  });

  it("keeps inactive and active config accepted after the runtime slice lands", () => {
    expect(() =>
      assertHtmlCanvasConfigInactive({ enabled: false }),
    ).not.toThrow();
    expect(() =>
      assertHtmlCanvasConfigInactive({
        enabled: "auto",
        throwOnUnsupported: true,
        defaultScheduler: "paint",
        defaultMode: "2d",
      }),
    ).not.toThrow();
  });

  it("allows disabled config through the runtime gate", () => {
    expect(
      assertHtmlCanvasRuntimeSupported(
        { enabled: false },
        { support: unsupportedRuntime },
      ),
    ).toBe(unsupportedRuntime);
  });

  it("throws for active config when the browser has no native support", () => {
    expect(() =>
      assertHtmlCanvasRuntimeSupported(
        {
          enabled: true,
          throwOnUnsupported: true,
          defaultScheduler: "paint",
          defaultMode: "2d",
        },
        { support: unsupportedRuntime },
      ),
    ).toThrowError(`${htmlCanvasRuntimeUnsupportedMessage} Missing 2d.`);
  });

  it("allows auto config to remain inactive when unsupported and configured not to throw", () => {
    expect(
      assertHtmlCanvasRuntimeSupported(
        {
          enabled: "auto",
          throwOnUnsupported: false,
          defaultScheduler: "paint",
          defaultMode: "2d",
        },
        { support: unsupportedRuntime },
      ),
    ).toBe(unsupportedRuntime);
  });

  it("accepts active config only when the requested native mode exists", () => {
    expect(
      assertHtmlCanvasRuntimeSupported(
        {
          enabled: true,
          throwOnUnsupported: true,
          defaultScheduler: "paint",
          defaultMode: "2d",
        },
        { support: supported2dRuntime },
      ),
    ).toBe(supported2dRuntime);
  });

  it("checks the current runtime when no support override is provided", () => {
    expect(() =>
      assertHtmlCanvasRuntimeSupported({
        enabled: true,
        throwOnUnsupported: true,
        defaultScheduler: "paint",
        defaultMode: "webgpu",
      }),
    ).toThrowError(`${htmlCanvasRuntimeUnsupportedMessage} Missing webgpu.`);
  });

  it("keeps directives fail-fast when html canvas is not configured", () => {
    bootstrapCustomHtmlCanvasRuntime();

    expect(() =>
      $compile("<canvas ng-html-canvas></canvas>")($rootScope),
    ).toThrowError(htmlCanvasRuntimeDisabledMessage);
    expect(() =>
      $compile(
        "<canvas ng-html-canvas><div ng-html-canvas-source></div></canvas>",
      )($rootScope),
    ).toThrowError(htmlCanvasRuntimeDisabledMessage);
  });

  it("registers disabled source invalidation directives", () => {
    bootstrapCustomHtmlCanvasRuntime();

    expect(() =>
      $compile("<canvas><div ng-html-canvas-invalidate></div></canvas>")(
        $rootScope,
      ),
    ).toThrowError(htmlCanvasRuntimeDisabledMessage);
  });

  it("links canvas roots and disposes them with their scope", () => {
    const dispose = jasmine.createSpy("dispose");
    const registerRoot = jasmine
      .createSpy("registerRoot")
      .and.returnValue({ dispose });
    const directive = ngHtmlCanvasDirective({
      registerRoot,
    } as unknown as ng.HtmlCanvasService);
    const canvas = document.createElement("canvas");
    const scope = $rootScope.$new();
    const link = directive.compile?.(canvas) as TestLinkFn;

    expect(canvas.getAttribute("layoutsubtree")).toBe("true");

    link(scope, canvas);
    expect(registerRoot).toHaveBeenCalledOnceWith(canvas);

    scope.$destroy();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("allows the root directive contract to validate non-canvas elements", () => {
    const registerRoot = jasmine
      .createSpy("registerRoot")
      .and.returnValue({ dispose: jasmine.createSpy("dispose") });
    const directive = ngHtmlCanvasDirective({
      registerRoot,
    } as unknown as ng.HtmlCanvasService);
    const element = document.createElement("div");
    const scope = $rootScope.$new();
    const link = directive.compile?.(
      element as unknown as HTMLCanvasElement,
    ) as TestLinkFn;

    expect(element.hasAttribute("layoutsubtree")).toBeFalse();
    link(scope, element);
    expect(registerRoot).toHaveBeenCalledOnceWith(element);
  });

  it("registers source geometry from standard and data attributes", () => {
    const destroy = jasmine.createSpy("destroy");
    const registerSource = jasmine
      .createSpy("registerSource")
      .and.returnValue(destroy);
    const directive = ngHtmlCanvasSourceDirective({
      registerSource,
    } as unknown as ng.HtmlCanvasService);
    const canvas = document.createElement("canvas");
    const source = document.createElement("div");
    const scope = $rootScope.$new();

    source.setAttribute("x", "12");
    source.setAttribute("data-y", "3");
    source.setAttribute("width", " ");
    source.setAttribute("height", "invalid");
    canvas.append(source);

    (directive.link as TestLinkFn)(scope, source);

    const options = registerSource.calls.mostRecent().args[2];

    expect(registerSource.calls.mostRecent().args.slice(0, 2)).toEqual([
      canvas,
      source,
    ]);
    expect(options.x).toBe(12);
    expect(options.y).toBe(3);
    expect(options.width).toBeUndefined();
    expect(options.height).toBeUndefined();

    source.setAttribute("width", "20");
    source.setAttribute("height", "30");
    expect(options.width).toBe(20);
    expect(options.height).toBe(30);

    scope.$destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("accepts a canvas as its own source root", () => {
    const registerSource = jasmine
      .createSpy("registerSource")
      .and.returnValue(jasmine.createSpy("destroy"));
    const directive = ngHtmlCanvasSourceDirective({
      registerSource,
    } as unknown as ng.HtmlCanvasService);
    const canvas = document.createElement("canvas");

    (directive.link as TestLinkFn)($rootScope.$new(), canvas);

    expect(registerSource.calls.mostRecent().args.slice(0, 2)).toEqual([
      canvas,
      canvas,
    ]);
  });

  it("rejects source and invalidation directives outside a canvas", () => {
    const service = {
      invalidate: jasmine.createSpy("invalidate"),
      registerSource: jasmine.createSpy("registerSource"),
    } as unknown as ng.HtmlCanvasService;
    const sourceDirective = ngHtmlCanvasSourceDirective(service);
    const invalidateDirective = ngHtmlCanvasInvalidateDirective(service);
    const element = document.createElement("div");

    expect(() =>
      (sourceDirective.link as TestLinkFn)($rootScope.$new(), element),
    ).toThrowError(
      "HTML-in-Canvas source and invalidation directives require a parent canvas root.",
    );
    expect(() =>
      (invalidateDirective.link as TestLinkFn)($rootScope, element),
    ).toThrowError(
      "HTML-in-Canvas source and invalidation directives require a parent canvas root.",
    );
  });

  it("invalidates canvas roots directly and through child elements", () => {
    const invalidate = jasmine.createSpy("invalidate");
    const directive = ngHtmlCanvasInvalidateDirective({
      invalidate,
    } as unknown as ng.HtmlCanvasService);
    const canvas = document.createElement("canvas");
    const child = document.createElement("div");

    canvas.append(child);
    (directive.link as TestLinkFn)($rootScope, canvas);
    (directive.link as TestLinkFn)($rootScope, child);

    expect(invalidate.calls.allArgs()).toEqual([[canvas], [canvas]]);
  });

  it("keeps the service absent when the custom runtime omits the slice", () => {
    const app = document.getElementById("app") as HTMLElement;

    dealoc(app);
    const angular = createAngular();
    const injector = angular.bootstrap(app, []);

    expect(injector.has("$htmlCanvas")).toBeFalse();
  });

  it("owns service construction and teardown in the runtime state", () => {
    const state = createHtmlCanvasRuntimeState();

    applyHtmlCanvasConfiguration(state, { enabled: false });

    const service = createHtmlCanvasService(state, window, document);

    expect(service.enabled).toBeFalse();
    expect(createHtmlCanvasService(state, window, document)).toBe(service);

    destroyHtmlCanvasRuntimeState(state);
    destroyHtmlCanvasRuntimeState(state);

    expect(() =>
      service.registerRoot(document.createElement("canvas")),
    ).toThrowError("HTML-in-Canvas runtime has already been disposed.");
    expect(() => createHtmlCanvasService(state, window, document)).toThrowError(
      "HTML-in-Canvas runtime has already been disposed.",
    );
    expect(() =>
      applyHtmlCanvasConfiguration(state, { enabled: false }),
    ).toThrowError("HTML-in-Canvas runtime has already been disposed.");
  });

  it("applies typed module config through the custom runtime registrar", () => {
    const app = document.getElementById("app") as HTMLElement;

    dealoc(app);
    const angular = createAngular({
      modules: [htmlCanvasModule],
    });

    angular.module("configuredHtmlCanvas", []).config({
      $htmlCanvas: {
        enabled: false,
        defaultMode: "webgpu",
        defaultScheduler: "raf",
      },
    });

    const injector = angular.bootstrap(app, ["configuredHtmlCanvas"]);
    const service = injector.get("$htmlCanvas");

    expect(service.config).toEqual({
      enabled: false,
      throwOnUnsupported: true,
      defaultScheduler: "raf",
      defaultMode: "webgpu",
      requireFlag: true,
    });

    angular._composition.destroy();

    expect(() =>
      service.invalidate(document.createElement("canvas")),
    ).toThrowError("HTML-in-Canvas runtime has already been disposed.");
  });

  it("registers roots, sources, and schedules native paint requests", () => {
    const canvas = document.createElement("canvas");
    const source = document.createElement("div");
    const drawElementImage = jasmine
      .createSpy("drawElementImage")
      .and.returnValue("matrix(1, 0, 0, 1, 0, 0)");
    const requestPaint = jasmine.createSpy("requestPaint");

    canvas.append(source);
    Object.defineProperty(canvas, "requestPaint", { value: requestPaint });
    canvas.getContext = ((type: string) => {
      if (type !== "2d") return null;

      return {
        drawElementImage,
        reset() {
          return undefined;
        },
      };
    }) as HTMLCanvasElement["getContext"];

    const service = new NativeHtmlCanvasService(
      {
        enabled: true,
        throwOnUnsupported: true,
        defaultScheduler: "paint",
        defaultMode: "2d",
      },
      window,
      document,
      { support: supported2dRuntime },
    );

    const root = service.registerRoot(canvas);
    const destroy = service.registerSource(canvas, source);

    expect(root.canvas).toBe(canvas);
    expect(canvas.getAttribute("layoutsubtree")).toBe("true");
    expect(requestPaint).toHaveBeenCalled();

    canvas.dispatchEvent(
      new CustomEvent("paint", {
        detail: undefined,
      }),
    );

    expect(drawElementImage).toHaveBeenCalledWith(source, 0, 0);
    expect(source.style.transform).toBe("matrix(1, 0, 0, 1, 0, 0)");

    destroy();
    service.dispose();

    expect(() => service.registerRoot(canvas)).toThrowError(
      "HTML-in-Canvas runtime has already been disposed.",
    );
  });

  it("draws registered sources with explicit source rectangles", () => {
    const canvas = document.createElement("canvas");
    const source = document.createElement("div");
    const drawElementImage = jasmine.createSpy("drawElementImage");
    const requestPaint = jasmine.createSpy("requestPaint");

    canvas.append(source);
    Object.defineProperty(canvas, "requestPaint", { value: requestPaint });
    canvas.getContext = ((type: string) => {
      if (type !== "2d") return null;

      return {
        drawElementImage,
        reset() {
          return undefined;
        },
      };
    }) as HTMLCanvasElement["getContext"];

    const service = new NativeHtmlCanvasService(
      {
        enabled: true,
        throwOnUnsupported: true,
        defaultScheduler: "paint",
        defaultMode: "2d",
      },
      window,
      document,
      { support: supported2dRuntime },
    );

    const root = service.registerRoot(canvas);
    const destroy = service.registerSource(canvas, source, {
      x: 12,
      y: 24,
      width: 240,
      height: 120,
    });

    canvas.dispatchEvent(new Event("paint"));

    expect(drawElementImage).toHaveBeenCalledWith(source, 12, 24, 240, 120);

    destroy();
    root.dispose();
  });

  it("redraws a source when a paint event reports a changed descendant", () => {
    const canvas = document.createElement("canvas");
    const source = document.createElement("div");
    const child = document.createElement("span");
    const otherSource = document.createElement("aside");
    const drawElementImage = jasmine.createSpy("drawElementImage");

    source.append(child);
    canvas.append(source, otherSource);
    Object.defineProperty(canvas, "requestPaint", {
      value() {
        return undefined;
      },
    });
    canvas.getContext = ((type: string) => {
      if (type !== "2d") return null;

      return {
        drawElementImage,
        reset() {
          return undefined;
        },
      };
    }) as HTMLCanvasElement["getContext"];

    const service = new NativeHtmlCanvasService(
      {
        enabled: true,
        throwOnUnsupported: true,
        defaultScheduler: "paint",
        defaultMode: "2d",
      },
      window,
      document,
      { support: supported2dRuntime },
    );

    const root = service.registerRoot(canvas);
    const destroySource = service.registerSource(canvas, source);
    const destroyOtherSource = service.registerSource(canvas, otherSource);
    const event = new Event("paint");

    Object.defineProperty(event, "changedElements", { value: [child] });
    canvas.dispatchEvent(event);

    expect(drawElementImage).toHaveBeenCalledOnceWith(source, 0, 0);

    destroySource();
    destroyOtherSource();
    root.dispose();
  });

  it("observes source changes and disconnects observers owned by a root", () => {
    let mutationCallback: MutationCallback | undefined;
    let resizeCallback: ResizeObserverCallback | undefined;
    const mutationDisconnect = jasmine.createSpy("mutationDisconnect");
    const resizeDisconnect = jasmine.createSpy("resizeDisconnect");
    const originalMutationObserver = globalThis.MutationObserver;
    const originalResizeObserver = globalThis.ResizeObserver;

    class TestMutationObserver {
      constructor(callback: MutationCallback) {
        mutationCallback = callback;
      }

      observe(): void {}
      disconnect(): void {
        mutationDisconnect();
      }
    }

    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe(): void {}
      disconnect(): void {
        resizeDisconnect();
      }
    }

    Object.defineProperty(globalThis, "MutationObserver", {
      configurable: true,
      value: TestMutationObserver,
    });
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: TestResizeObserver,
    });

    try {
      const canvas = document.createElement("canvas");
      const source = document.createElement("div");
      const requestPaint = jasmine.createSpy("requestPaint");

      canvas.append(source);
      Object.defineProperty(canvas, "requestPaint", { value: requestPaint });

      const service = new NativeHtmlCanvasService(
        {
          enabled: true,
          throwOnUnsupported: true,
          defaultScheduler: "paint",
          defaultMode: "2d",
        },
        window,
        document,
        { support: supported2dRuntime },
      );
      const root = service.registerRoot(canvas);

      service.registerSource(canvas, source);
      const invalidate = spyOn(root, "invalidate");

      mutationCallback?.([], {} as MutationObserver);
      resizeCallback?.([], {} as ResizeObserver);

      expect(invalidate).toHaveBeenCalledTimes(2);

      root.dispose();
      root.dispose();

      expect(mutationDisconnect).toHaveBeenCalledTimes(1);
      expect(resizeDisconnect).toHaveBeenCalledTimes(1);
      expect(() =>
        (
          root as unknown as {
            addSource(element: Element, options: object): () => void;
          }
        ).addSource(source, {}),
      ).toThrowError("HTML-in-Canvas root has already been disposed.");
    } finally {
      Object.defineProperty(globalThis, "MutationObserver", {
        configurable: true,
        value: originalMutationObserver,
      });
      Object.defineProperty(globalThis, "ResizeObserver", {
        configurable: true,
        value: originalResizeObserver,
      });
    }
  });

  it("schedules paint through animation frames and ignores disposed frames", () => {
    const canvas = document.createElement("canvas");
    const source = document.createElement("div");
    const requestPaint = jasmine.createSpy("requestPaint");
    const frames: FrameRequestCallback[] = [];
    const testWindow = {
      requestAnimationFrame(callback: FrameRequestCallback) {
        frames.push(callback);
        return frames.length;
      },
    } as unknown as Window;

    canvas.append(source);
    Object.defineProperty(canvas, "requestPaint", { value: requestPaint });

    const service = new NativeHtmlCanvasService(
      {
        enabled: true,
        throwOnUnsupported: true,
        defaultScheduler: "raf",
        defaultMode: "2d",
      },
      testWindow,
      document,
      { support: supported2dRuntime },
    );
    const root = service.registerRoot(canvas);

    service.registerSource(canvas, source);
    expect(requestPaint).not.toHaveBeenCalled();

    frames.shift()?.(0);
    expect(requestPaint).toHaveBeenCalledTimes(1);

    root.invalidate();
    root.dispose();
    frames.shift()?.(1);

    expect(requestPaint).toHaveBeenCalledTimes(1);
  });

  it("validates roots, paint methods, and rendering modes", () => {
    const canvas = document.createElement("canvas");
    const source = document.createElement("div");
    const outsider = document.createElement("div");
    const requestPaint = jasmine.createSpy("requestPaint");

    canvas.append(source);
    Object.defineProperty(canvas, "requestPaint", { value: requestPaint });

    const service = new NativeHtmlCanvasService(
      {
        enabled: true,
        throwOnUnsupported: true,
        defaultScheduler: "paint",
        defaultMode: "2d",
      },
      window,
      document,
      { support: supported2dRuntime },
    );
    const root = service.registerRoot(canvas);

    expect(service.registerRoot(canvas)).toBe(root);
    expect(() => service.registerSource(canvas, outsider)).toThrowError(
      "ng-html-canvas-source must be a direct child of the ng-html-canvas root.",
    );
    expect(() =>
      service.invalidate(document.createElement("canvas")),
    ).not.toThrow();
    expect(() =>
      service.requestPaint(document.createElement("canvas")),
    ).toThrowError(`${htmlCanvasRuntimeUnsupportedMessage} Missing paint.`);

    canvas.getContext = (() => null) as HTMLCanvasElement["getContext"];
    expect(() =>
      (
        root as unknown as {
          _paint(event: Event): void;
        }
      )._paint(new Event("paint")),
    ).toThrowError(`${htmlCanvasRuntimeUnsupportedMessage} Missing 2d.`);

    const webglService = new NativeHtmlCanvasService(
      {
        enabled: true,
        throwOnUnsupported: true,
        defaultScheduler: "paint",
        defaultMode: "webgl",
      },
      window,
      document,
      { support: supportedWebglRuntime },
    );
    const webglRoot = webglService.registerRoot(
      document.createElement("canvas"),
    );

    expect(() =>
      (
        webglRoot as unknown as {
          _paint(event: Event): void;
        }
      )._paint(new Event("paint")),
    ).not.toThrow();
  });

  it("normalizes defaults and rejects inactive auto runtimes at use time", () => {
    expect(normalizeHtmlCanvasConfig()).toEqual({
      enabled: false,
      throwOnUnsupported: true,
      defaultScheduler: "paint",
      defaultMode: "2d",
      requireFlag: true,
    });

    const service = new NativeHtmlCanvasService(
      {
        enabled: "auto",
        throwOnUnsupported: false,
        defaultScheduler: "paint",
        defaultMode: "2d",
      },
      window,
      document,
      { support: unsupportedRuntime },
    );

    expect(service.enabled).toBeFalse();
    expect(() =>
      service.registerRoot(document.createElement("canvas")),
    ).toThrowError(`${htmlCanvasRuntimeUnsupportedMessage} Missing 2d.`);

    service.dispose();
    service.dispose();
  });
});
