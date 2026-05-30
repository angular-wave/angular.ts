export interface AfterRenderOptions {
  /**
   * Wait for `document.fonts.ready` before invoking the callback.
   *
   * This is opt-in because font loading can depend on external resources and
   * should not delay ordinary post-render layout reads.
   */
  fonts?: boolean;
}

export type AfterRenderCallback = () => void;

export const AFTER_RENDER_EVENT_SCHEDULER_KEY = "$$ar";

export type AfterRenderEventScheduler = () => void;

interface AfterRenderEntry {
  _callback: AfterRenderCallback;
  _fonts: boolean;
}

const afterRenderQueue = new Map<object, AfterRenderEntry>();

let afterRenderScheduled = false;

/**
 * Queue one post-render callback for an instance.
 *
 * Multiple calls for the same instance before the next render flush are
 * coalesced into one callback. The callback runs after the current JavaScript
 * turn, after AngularTS has applied synchronous DOM work, and after one browser
 * animation frame gives layout a chance to settle.
 */
export function queueAfterRender(
  instance: object,
  callback: AfterRenderCallback,
  options?: AfterRenderOptions,
): void {
  const pending = afterRenderQueue.get(instance);

  afterRenderQueue.set(instance, {
    _callback: callback,
    _fonts: !!options?.fonts || !!pending?._fonts,
  });

  scheduleAfterRenderFlush();
}

/**
 * Queue a post-render callback using the callback itself as the coalescing key.
 */
export function afterRender(
  callback: AfterRenderCallback,
  options?: AfterRenderOptions,
): void {
  queueAfterRender(callback, callback, options);
}

function scheduleAfterRenderFlush(): void {
  if (afterRenderScheduled) {
    return;
  }

  afterRenderScheduled = true;
  queueMicrotask(() => {
    requestFrame(flushAfterRenderQueue);
  });
}

function flushAfterRenderQueue(): void {
  afterRenderScheduled = false;

  const entries = Array.from(afterRenderQueue.values());

  afterRenderQueue.clear();

  for (let i = 0; i < entries.length; i++) {
    runAfterRenderEntry(entries[i]);
  }
}

function runAfterRenderEntry(entry: AfterRenderEntry): void {
  if (entry._fonts) {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;

    if (fonts?.ready) {
      void fonts.ready
        .catch(() => undefined)
        .then(() => {
          invokeAfterRenderCallback(entry._callback);
          return undefined;
        });
      return;
    }
  }

  invokeAfterRenderCallback(entry._callback);
}

function invokeAfterRenderCallback(callback: AfterRenderCallback): void {
  try {
    callback();
  } catch (err) {
    setTimeout(() => {
      throw err;
    });
  }
}

function requestFrame(callback: FrameRequestCallback): void {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(callback);
    return;
  }

  setTimeout(() => {
    callback(Date.now());
  });
}
