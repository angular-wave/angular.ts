/// <reference types="jasmine" />
import { waitUntil } from "../../shared/test-utils.ts";
import { afterRender, queueAfterRender } from "./after-render.ts";

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

  it("uses setTimeout scheduling when requestAnimationFrame is unavailable", async () => {
    const realRequestAnimationFrame = window.requestAnimationFrame;
    const callback = jasmine.createSpy("afterRender");

    try {
      (window as any).requestAnimationFrame = undefined;

      afterRender(callback);

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
