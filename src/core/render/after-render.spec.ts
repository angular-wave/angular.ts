/// <reference types="jasmine" />
import { waitUntil } from "../../shared/test-utils.ts";
import { createScope } from "../scope/scope.ts";
import {
  afterRender,
  queueAfterRender,
  queueScopedAfterRender,
} from "./after-render.ts";

describe("afterRender", () => {
  it("runs callbacks asynchronously after a frame", async () => {
    const callback = jasmine.createSpy("afterRender");

    afterRender(callback);

    expect(callback).not.toHaveBeenCalled();

    await waitUntil(() => callback.calls.count() === 1);
  });

  it("coalesces queued callbacks by instance", async () => {
    const instance = {};
    const calls: string[] = [];

    queueAfterRender(instance, () => {
      calls.push("first");
    });
    queueAfterRender(instance, () => {
      calls.push("second");
    });

    await waitUntil(() => calls.length === 1);

    expect(calls).toEqual(["second"]);
  });

  it("defers scoped callbacks while retained routes are paused", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];

    queueScopedAfterRender({}, scope, () => {
      calls.push("before-pause");
    });

    scope.$broadcast("$viewRetentionPause");

    queueScopedAfterRender({}, scope, () => {
      calls.push("during-pause");
    });
    afterRender(() => {
      calls.push("global");
    });

    await waitUntil(() => calls.length === 1);

    expect(calls).toEqual(["global"]);

    scope.$broadcast("$viewRetentionResume");

    await waitUntil(() => calls.length === 3);

    expect(calls).toEqual(["global", "before-pause", "during-pause"]);
  });

  it("ignores unrelated retention pause modes for scoped callbacks", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];

    queueScopedAfterRender({}, scope, () => {
      calls.push("before-background-pause");
    });
    await waitUntil(() => calls.length === 1);

    scope.$broadcast("$viewRetentionPause", { _pause: "background" });
    queueScopedAfterRender({}, scope, () => {
      calls.push("scheduler-callback");
    });

    await waitUntil(() => calls.length === 2);

    expect(calls).toEqual(["before-background-pause", "scheduler-callback"]);
  });

  it("does not flush scheduler callbacks for unrelated retention resume modes", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];

    queueScopedAfterRender({}, scope, () => {
      calls.push("scheduler-callback");
    });
    scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toEqual([]);

    scope.$broadcast("$viewRetentionResume", { _pause: "background" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toEqual([]);

    scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });

    await waitUntil(() => calls.length === 1);

    expect(calls).toEqual(["scheduler-callback"]);
  });

  it("allows empty retention resumes without scheduling work", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];

    queueScopedAfterRender({}, scope, () => {
      calls.push("before-resume");
    });
    await waitUntil(() => calls.length === 1);

    scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });
    queueScopedAfterRender({}, scope, () => {
      calls.push("scheduler-callback");
    });

    await waitUntil(() => calls.length === 2);

    expect(calls).toEqual(["before-resume", "scheduler-callback"]);
  });

  it("resumes paused scoped callbacks when no work is pending", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];

    queueScopedAfterRender({}, scope, () => {
      calls.push("before-empty-resume");
    });
    await waitUntil(() => calls.length === 1);

    scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });
    scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });

    queueScopedAfterRender({}, scope, () => {
      calls.push("after-empty-resume");
    });

    await waitUntil(() => calls.length === 2);

    expect(calls).toEqual(["before-empty-resume", "after-empty-resume"]);
  });

  it("uses setTimeout scheduling when requestAnimationFrame is unavailable", async () => {
    const realRequestAnimationFrame = window.requestAnimationFrame;
    const callback = jasmine.createSpy("afterRender");

    try {
      (window as any).requestAnimationFrame = undefined;

      afterRender(callback);
      await Promise.resolve();
      window.requestAnimationFrame = realRequestAnimationFrame;

      await waitUntil(() => callback.calls.count() === 1);

      expect(callback).toHaveBeenCalled();
    } finally {
      window.requestAnimationFrame = realRequestAnimationFrame;
    }
  });

  it("waits for document fonts when requested", async () => {
    const realFonts = (document as any).fonts;
    let resolveFonts: () => void;
    const callback = jasmine.createSpy("afterRender");
    const ready = new Promise<void>((resolve) => {
      resolveFonts = resolve;
    });

    try {
      Object.defineProperty(document, "fonts", {
        configurable: true,
        value: { ready },
      });

      afterRender(callback, { fonts: true });

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(callback).not.toHaveBeenCalled();

      resolveFonts!();
      await waitUntil(() => callback.calls.count() === 1);
    } finally {
      Object.defineProperty(document, "fonts", {
        configurable: true,
        value: realFonts,
      });
    }
  });

  it("still runs font-aware callbacks when document fonts reject", async () => {
    const realFonts = (document as any).fonts;
    const callback = jasmine.createSpy("afterRender");
    let rejectFonts: (error: Error) => void;
    const ready = new Promise<void>((_resolve, reject) => {
      rejectFonts = reject;
    });

    try {
      Object.defineProperty(document, "fonts", {
        configurable: true,
        value: { ready },
      });

      afterRender(callback, { fonts: true });

      await new Promise((resolve) => setTimeout(resolve, 20));
      rejectFonts!(new Error("fonts failed"));
      await waitUntil(() => callback.calls.count() === 1);

      expect(callback).toHaveBeenCalled();
    } finally {
      Object.defineProperty(document, "fonts", {
        configurable: true,
        value: realFonts,
      });
    }
  });

  it("keeps font waiting when any coalesced call requests it", async () => {
    const realFonts = (document as any).fonts;
    const instance = {};
    const callback = jasmine.createSpy("afterRender");
    let resolveFonts: () => void;
    const ready = new Promise<void>((resolve) => {
      resolveFonts = resolve;
    });

    try {
      Object.defineProperty(document, "fonts", {
        configurable: true,
        value: { ready },
      });

      queueAfterRender(instance, () => undefined, { fonts: true });
      queueAfterRender(instance, callback);

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(callback).not.toHaveBeenCalled();

      resolveFonts!();
      await waitUntil(() => callback.calls.count() === 1);
    } finally {
      Object.defineProperty(document, "fonts", {
        configurable: true,
        value: realFonts,
      });
    }
  });
});
