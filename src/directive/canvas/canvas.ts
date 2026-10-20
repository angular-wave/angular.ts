import { _exceptionHandler, _window } from "../../injection-tokens.ts";
import { getNormalizedAttr } from "../../shared/dom.ts";
import { deProxy, shouldHandleViewRetentionPause } from "../../shared/utils.ts";

/** CSS dimensions and the corresponding canvas backing-store dimensions. */
export interface CanvasSize {
  width: number;
  height: number;
  pixelRatio: number;
  pixelWidth: number;
  pixelHeight: number;
}

/** Frame timestamps are in seconds; delta is zero after mounting or resuming. */
export interface CanvasFrame {
  time: number;
  delta: number;
  size: CanvasSize;
}

/** Native drawing resources owned by one linked ng-canvas element. */
export interface CanvasSurface {
  canvas: HTMLCanvasElement;
  context: RenderingContext;
  invalidate(): void;
}

/** Application renderer contract for the optional ng-canvas directive. */
export interface CanvasRenderer {
  /** Keep native drawing resources outside scope proxies when held on this adapter. */
  readonly $nonscope?: true;
  /** Native context type. Defaults to 2d. */
  context?: "2d" | "webgl" | "webgl2";
  /** Continuous frames are opt-in. Otherwise render only after invalidation. */
  animate?: boolean;
  /** Optional backing-store pixel-ratio cap. */
  maxPixelRatio?: number;
  mount?(surface: CanvasSurface): void;
  resize?(size: CanvasSize): void;
  render(frame: CanvasFrame): void;
  suspend?(): void;
  resume?(): void;
  dispose?(): void;
}

ngCanvasDirective.$inject = [_window, _exceptionHandler];

/** Owns native canvas sizing, drawing schedules, retention, and teardown. */
export function ngCanvasDirective(
  $window: Window & typeof globalThis,
  $exceptionHandler: ng.ExceptionHandlerService,
): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope, element: Element) {
      if (!(element instanceof $window.HTMLCanvasElement)) {
        throw new Error("ng-canvas requires a canvas element.");
      }
      const expression = getNormalizedAttr(element, "ngCanvas");
      if (!expression?.trim()) {
        throw new Error("ng-canvas requires a renderer expression.");
      }
      const canvas = element;
      let renderer: CanvasRenderer | undefined;
      let size: CanvasSize | undefined;
      let frame: number | undefined;
      let lastTime: number | undefined;
      let paused = false;
      let destroyed = false;
      let observer: ResizeObserver | undefined;
      const isDestroyed = () => destroyed;
      const isInactive = () => destroyed || paused;

      const cancel = () => {
        if (frame !== undefined) $window.cancelAnimationFrame(frame);
        frame = undefined;
        lastTime = undefined;
      };
      const release = () => {
        cancel();
        observer?.disconnect();
        observer = undefined;
        size = undefined;
        const previous = renderer;
        renderer = undefined;
        previous?.dispose?.();
      };
      const fail = (error: unknown) => {
        try {
          release();
        } catch (disposeError) {
          $exceptionHandler(disposeError);
        }
        $exceptionHandler(error);
      };
      const measure = (): CanvasSize => {
        const rect = canvas.getBoundingClientRect();
        const pixelRatio = Math.min(
          $window.devicePixelRatio || 1,
          renderer?.maxPixelRatio ?? Infinity,
        );
        return {
          width: rect.width,
          height: rect.height,
          pixelRatio,
          pixelWidth: Math.round(rect.width * pixelRatio),
          pixelHeight: Math.round(rect.height * pixelRatio),
        };
      };
      const draw = (milliseconds: number) => {
        frame = undefined;
        if (destroyed || paused || !renderer) return;
        const animate = renderer.animate;
        try {
          const next = measure();
          if (
            next.width !== size?.width ||
            next.height !== size.height ||
            next.pixelRatio !== size.pixelRatio
          ) {
            size = next;
            // Updating either dimension resets the native drawing state.
            canvas.width = next.pixelWidth;
            canvas.height = next.pixelHeight;
            renderer.resize?.(next);
            if (isInactive()) return;
          }
          if (size.width > 0 && size.height > 0) {
            const time = milliseconds / 1000;
            const delta =
              lastTime === undefined ? 0 : Math.max(0, time - lastTime);
            lastTime = time;
            renderer.render({ time, delta, size });
          } else {
            lastTime = undefined;
          }
          if (animate) invalidate();
        } catch (error) {
          fail(error);
        }
      };
      const invalidate = () => {
        if (!destroyed && !paused && renderer && frame === undefined) {
          frame = $window.requestAnimationFrame(draw);
        }
      };
      const suspend = () => {
        if (paused || destroyed) return;
        paused = true;
        cancel();
        try {
          renderer?.suspend?.();
        } catch (error) {
          fail(error);
        }
      };
      const resume = () => {
        if (!paused || destroyed) return;
        paused = false;
        try {
          renderer?.resume?.();
          invalidate();
        } catch (error) {
          fail(error);
        }
      };
      const stopRenderer = scope.watch(expression, (value: unknown) => {
        try {
          release();
          if (value == null || destroyed) return;
          const next = deProxy(value) as CanvasRenderer;
          if (typeof next.render !== "function") {
            throw new Error("ng-canvas renderer must provide render(frame).");
          }
          const mode = next.context ?? "2d";
          if (!["2d", "webgl", "webgl2"].includes(mode)) {
            throw new Error("ng-canvas context must be 2d, webgl, or webgl2.");
          }
          if (
            next.maxPixelRatio !== undefined &&
            (!Number.isFinite(next.maxPixelRatio) || next.maxPixelRatio <= 0)
          ) {
            throw new Error(
              "ng-canvas maxPixelRatio must be a positive finite number.",
            );
          }
          const context = canvas.getContext(mode);
          if (!context)
            throw new Error(`ng-canvas could not acquire ${mode} context.`);
          renderer = next;
          renderer.mount?.({ canvas, context, invalidate });
          if (isDestroyed()) return;
          if (paused) renderer.suspend?.();
          if (isDestroyed()) return;
          const Resize = (
            $window as unknown as {
              ResizeObserver?: typeof ResizeObserver;
            }
          ).ResizeObserver;
          if (Resize) {
            observer = new Resize(invalidate);
            observer.observe(canvas);
          }
          invalidate();
        } catch (error) {
          fail(error);
        }
      });
      const watchExpression = getNormalizedAttr(canvas, "ngCanvasWatch");
      const stopWatch = watchExpression
        ? scope.watch(watchExpression, invalidate)
        : () => undefined;
      $window.addEventListener("resize", invalidate);
      const stopPause = scope.on("$viewRetentionPause", (...args) => {
        if (shouldHandleViewRetentionPause(args)) suspend();
      });
      const stopResume = scope.on("$viewRetentionResume", (...args) => {
        if (shouldHandleViewRetentionPause(args)) resume();
      });
      scope.on("$destroy", () => {
        destroyed = true;
        stopRenderer?.();
        stopWatch?.();
        stopPause();
        stopResume();
        $window.removeEventListener("resize", invalidate);
        try {
          release();
        } catch (error) {
          $exceptionHandler(error);
        }
      });
    },
  };
}
