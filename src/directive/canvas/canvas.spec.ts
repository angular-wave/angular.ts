/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createAngular } from "../../runtime/index.ts";
import { canvasModule } from "../../runtime/canvas.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import {
  ngCanvasDirective,
  type CanvasRenderer,
  type CanvasSurface,
} from "./canvas.ts";

describe("ng-canvas", () => {
  let scope: ng.Scope;
  let canvas: HTMLCanvasElement;
  let browser: Window & typeof globalThis;
  let frames: Map<number, FrameRequestCallback>;
  let errors: jasmine.Spy;
  let renderer: CanvasRenderer;
  let surface: CanvasSurface;
  let dimensions: { width: number; height: number };
  let target: EventTarget;
  let resize: () => void;
  let disconnect: jasmine.Spy;
  let sequence: number;

  beforeEach(() => {
    const app = document.getElementById("app")!;
    dealoc(app);
    app.innerHTML = "";
    const angular = new Angular();
    scope = angular.bootstrap(app, []).get("$rootScope").new();
    canvas = document.createElement("canvas");
    canvas.setAttribute("ng-canvas", "renderer");
    dimensions = { width: 200, height: 100 };
    spyOn(canvas, "getBoundingClientRect").and.callFake(
      () => dimensions as DOMRect,
    );
    target = new EventTarget();
    frames = new Map();
    sequence = 0;
    errors = jasmine.createSpy("exceptions");
    disconnect = jasmine.createSpy("disconnect");
    browser = {
      HTMLCanvasElement,
      devicePixelRatio: 2,
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.set(++sequence, callback);
        return sequence;
      },
      cancelAnimationFrame: (id: number) => frames.delete(id),
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      ResizeObserver: class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    } as unknown as Window & typeof globalThis;
    renderer = {
      mount: jasmine.createSpy("mount").and.callFake((value) => {
        surface = value;
      }),
      resize: jasmine.createSpy("resize"),
      render: jasmine.createSpy("render"),
      suspend: jasmine.createSpy("suspend"),
      resume: jasmine.createSpy("resume"),
      dispose: jasmine.createSpy("dispose"),
    };
  });

  afterEach(() => {
    scope.destroy();
    dealoc(document.getElementById("app")!);
  });

  function link(element: Element = canvas): void {
    const directive = ngCanvasDirective(
      browser,
      errors as unknown as ng.ExceptionHandlerService,
    );
    (directive.link as (scope: ng.Scope, element: Element) => void)(
      scope,
      element,
    );
  }

  async function mount(): Promise<void> {
    scope.renderer = renderer;
    link();
    await wait();
  }

  function draw(time = 1000): void {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(time);
  }

  it("is optional and can be installed in a custom runtime", async () => {
    const angular = createAngular({ modules: [canvasModule] });
    expect(canvasModule(angular)).toBe(canvasModule(angular));
    const injector = angular.injector(["ng"]);
    const customScope = injector.get("$rootScope").new();
    customScope.renderer = { $nonscope: true, render: renderer.render };
    injector.get("$compile")(canvas)(customScope);
    await wait(30);
    expect(renderer.render).toHaveBeenCalled();
    customScope.destroy();
    const plain = new Angular().injector(["ng"]);
    const plainScope = plain.get("$rootScope").new();
    const element = document.createElement("canvas");
    element.setAttribute("ng-canvas", "renderer");
    const render = jasmine.createSpy("default runtime drawing");
    plainScope.renderer = { render };
    plain.get("$compile")(element)(plainScope);
    await wait(30);
    expect(render).not.toHaveBeenCalled();
    plainScope.destroy();
  });

  it("rejects non-canvas elements and missing expressions", () => {
    expect(() => link(document.createElement("div"))).toThrowError(
      /canvas element/,
    );
    canvas.removeAttribute("ng-canvas");
    expect(() => link()).toThrowError(/renderer expression/);
    canvas.setAttribute("ng-canvas", "  ");
    expect(() => link()).toThrowError(/renderer expression/);
  });

  it("mounts native resources and scales the backing store without a drawing transform", async () => {
    await mount();
    expect(surface.canvas).toBe(canvas);
    expect(surface.context).toBe(canvas.getContext("2d")!);
    draw();
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(200);
    expect(renderer.render).toHaveBeenCalledWith({
      time: 1,
      delta: 0,
      size: {
        width: 200,
        height: 100,
        pixelRatio: 2,
        pixelWidth: 400,
        pixelHeight: 200,
      },
    });
    expect(frames.size).toBe(0);
  });

  it("coalesces invalidations and redraws when watched state changes", async () => {
    scope.value = 1;
    canvas.setAttribute("ng-canvas-watch", "value");
    await mount();
    draw();
    surface.invalidate();
    surface.invalidate();
    resize();
    expect(frames.size).toBe(1);
    draw(1100);
    scope.value = 2;
    await wait();
    expect(frames.size).toBe(1);
    draw(1200);
    expect(renderer.render).toHaveBeenCalledTimes(3);
  });

  it("animates continuously and detects CSS size and pixel-ratio changes", async () => {
    renderer.animate = true;
    await mount();
    draw();
    draw(1016);
    expect(
      (renderer.render as jasmine.Spy).calls.mostRecent().args[0].delta,
    ).toBeCloseTo(0.016);
    dimensions.width = 120;
    browser.devicePixelRatio = 3;
    draw(1032);
    expect(canvas.width).toBe(360);
    expect(renderer.resize).toHaveBeenCalledTimes(2);
    expect(frames.size).toBe(1);
  });

  it("caps pixel ratio and supports a device without a reported ratio", async () => {
    renderer.maxPixelRatio = 1.5;
    await mount();
    draw();
    expect(canvas.width).toBe(300);
    browser.devicePixelRatio = 0;
    target.dispatchEvent(new Event("resize"));
    draw(1100);
    expect(canvas.width).toBe(200);
  });

  it("skips zero-sized canvases and resets elapsed frame time", async () => {
    renderer.animate = true;
    await mount();
    draw();
    dimensions.height = 0;
    draw(2000);
    expect(renderer.render).toHaveBeenCalledTimes(1);
    dimensions.height = 100;
    draw(5000);
    expect(
      (renderer.render as jasmine.Spy).calls.mostRecent().args[0].delta,
    ).toBe(0);
  });

  it("pauses retained views, ignores unrelated modes, and resumes with zero delta", async () => {
    renderer.animate = true;
    await mount();
    draw();
    scope.broadcast("$viewRetentionPause", { _pause: "background" });
    expect(frames.size).toBe(1);
    scope.broadcast("$viewRetentionResume", { _pause: "background" });
    expect(renderer.resume).not.toHaveBeenCalled();
    scope.broadcast("$viewRetentionPause");
    scope.broadcast("$viewRetentionPause");
    surface.invalidate();
    resize();
    expect(frames.size).toBe(0);
    expect(renderer.suspend).toHaveBeenCalledTimes(1);
    scope.broadcast("$viewRetentionResume");
    scope.broadcast("$viewRetentionResume");
    draw(9000);
    expect(renderer.resume).toHaveBeenCalledTimes(1);
    expect(
      (renderer.render as jasmine.Spy).calls.mostRecent().args[0].delta,
    ).toBe(0);
  });

  it("replaces renderers, disposes once, and does not retain observers or listeners", async () => {
    await mount();
    const original = renderer;
    const replacement = {
      render: jasmine.createSpy("replacement"),
      dispose: jasmine.createSpy("dispose"),
    };
    scope.renderer = replacement;
    await wait();
    expect(original.dispose).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
    draw();
    expect(replacement.render).toHaveBeenCalled();
    scope.destroy();
    scope.destroy();
    expect(replacement.dispose).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(2);
    target.dispatchEvent(new Event("resize"));
    surface.invalidate();
    expect(frames.size).toBe(0);
  });

  it("waits for a renderer and releases it when the expression becomes empty", async () => {
    link();
    await wait();
    expect(frames.size).toBe(0);
    scope.renderer = renderer;
    await wait();
    expect(frames.size).toBe(1);
    scope.renderer = null;
    await wait();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });

  it("works without optional hooks or ResizeObserver", async () => {
    renderer = { render: jasmine.createSpy("render") };
    browser.ResizeObserver = undefined as unknown as typeof ResizeObserver;
    await mount();
    draw();
    scope.broadcast("$viewRetentionPause");
    scope.broadcast("$viewRetentionResume");
    draw();
    expect(renderer.render).toHaveBeenCalledTimes(2);
  });

  for (const mode of ["webgl", "webgl2"] as const) {
    it(`acquires an explicit ${mode} context`, async () => {
      renderer.context = mode;
      const context = {} as WebGLRenderingContext;
      spyOn(canvas, "getContext").and.returnValue(context);
      await mount();
      expect(surface.context).toBe(context);
      expect(canvas.getContext).toHaveBeenCalledWith(mode);
    });
  }

  for (const [index, invalid] of [
    { render: null },
    { render() {}, context: "webgpu" },
    { render() {}, maxPixelRatio: 0 },
    { render() {}, maxPixelRatio: Infinity },
  ].entries()) {
    it(`reports invalid adapter ${index} without scheduling drawing`, async () => {
      scope.renderer = invalid;
      link();
      await wait();
      expect(errors).toHaveBeenCalledTimes(1);
      expect(frames.size).toBe(0);
    });
  }

  it("reports unavailable native contexts without substituting a renderer", async () => {
    spyOn(canvas, "getContext").and.returnValue(null);
    await mount();
    expect(errors.calls.mostRecent().args[0].message).toContain(
      "could not acquire 2d",
    );
    expect(frames.size).toBe(0);
  });

  for (const hook of [
    "mount",
    "resize",
    "render",
    "suspend",
    "resume",
  ] as const) {
    it(`stops and disposes on a ${hook} failure`, async () => {
      (renderer[hook] as jasmine.Spy).and.throwError("renderer failure");
      await mount();
      if (hook === "resize" || hook === "render") draw();
      if (hook === "suspend" || hook === "resume") {
        scope.broadcast("$viewRetentionPause");
        scope.broadcast("$viewRetentionResume");
      }
      expect(errors).toHaveBeenCalledTimes(1);
      expect(renderer.dispose).toHaveBeenCalledTimes(1);
      expect(frames.size).toBe(0);
    });
  }

  it("reports disposal failures during destruction", async () => {
    (renderer.dispose as jasmine.Spy).and.throwError("dispose failure");
    await mount();
    scope.destroy();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });

  it("reports both draw and disposal failures", async () => {
    (renderer.render as jasmine.Spy).and.throwError("draw failure");
    (renderer.dispose as jasmine.Spy).and.throwError("dispose failure");
    await mount();
    draw();
    expect(errors).toHaveBeenCalledTimes(2);
    expect(frames.size).toBe(0);
  });

  it("ignores a cancelled frame after suspension or destruction", async () => {
    await mount();
    const pending = [...frames.values()][0];
    scope.broadcast("$viewRetentionPause");
    pending(1000);
    expect(renderer.render).not.toHaveBeenCalled();
    scope.destroy();
    pending(2000);
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it("suspends a renderer installed while the view is retained", async () => {
    link();
    await wait();
    scope.broadcast("$viewRetentionPause");
    scope.renderer = renderer;
    await wait();
    expect(renderer.suspend).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    scope.broadcast("$viewRetentionResume");
    draw();
    expect(renderer.render).toHaveBeenCalledTimes(1);
  });

  it("reports disposal failure during renderer replacement", async () => {
    await mount();
    (renderer.dispose as jasmine.Spy).and.throwError("dispose failure");
    scope.renderer = { render() {} };
    await wait();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });

  for (const hook of ["mount", "resize", "render", "suspend"] as const) {
    it(`allows the ${hook} callback to destroy its view`, async () => {
      (renderer[hook] as jasmine.Spy).and.callFake(() => scope.destroy());
      if (hook === "suspend") {
        link();
        await wait();
        scope.broadcast("$viewRetentionPause");
        scope.renderer = renderer;
        await wait();
      } else {
        await mount();
        draw();
      }
      expect(renderer.dispose).toHaveBeenCalledTimes(1);
      expect(frames.size).toBe(0);
      expect(errors).not.toHaveBeenCalled();
      if (hook === "mount" || hook === "suspend") {
        expect(disconnect).not.toHaveBeenCalled();
      } else {
        expect(disconnect).toHaveBeenCalledTimes(1);
      }
    });
  }

  it("allows resize to suspend the view before drawing", async () => {
    (renderer.resize as jasmine.Spy).and.callFake(() =>
      scope.broadcast("$viewRetentionPause"),
    );
    await mount();
    draw();
    expect(renderer.render).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
    scope.broadcast("$viewRetentionResume");
    draw();
    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(errors).not.toHaveBeenCalled();
  });
});
