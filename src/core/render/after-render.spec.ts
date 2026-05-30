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
});
