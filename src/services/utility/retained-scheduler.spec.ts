// @ts-nocheck
/// <reference types="jasmine" />
import { createScope } from "../../core/scope/scope.ts";
import { createCanvasWorkAdapter } from "./retained-scheduler.ts";
import { waitUntil } from "../../shared/test-utils.ts";

describe("Canvas work adapter", () => {
  it("defers canvas callbacks while scope is retention-paused", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];
    const adapter = createCanvasWorkAdapter(scope);

    adapter.schedule(() => calls.push("immediate"));

    expect(calls).toEqual(["immediate"]);
    calls.length = 0;

    scope.$broadcast("$viewRetentionPause");
    adapter.schedule(() => calls.push("during-pause"));

    await waitUntil(() => calls.length === 0);
    expect(calls).toEqual([]);

    scope.$broadcast("$viewRetentionResume");

    await waitUntil(() => calls.length === 1);
    expect(calls).toEqual(["during-pause"]);
  });

  it("is resilient to duplicate pause/resume events", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];
    const adapter = createCanvasWorkAdapter(scope);

    scope.$broadcast("$viewRetentionPause");
    scope.$broadcast("$viewRetentionPause");

    adapter.schedule(() => calls.push("first"));
    adapter.schedule(() => calls.push("second"));

    expect(calls).toEqual([]);

    scope.$broadcast("$viewRetentionResume");
    scope.$broadcast("$viewRetentionResume");

    await waitUntil(() => calls.length === 2);

    expect(calls).toEqual(["first", "second"]);
  });

  it("does not pause for unrelated retention mode", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];
    const adapter = createCanvasWorkAdapter(scope);

    adapter.schedule(() => calls.push("immediate"));

    scope.$broadcast("$viewRetentionPause", { _pause: "background" });
    adapter.schedule(() => calls.push("background"));

    await waitUntil(() => calls.length === 2);
    expect(calls).toEqual(["immediate", "background"]);
  });

  it("ignores unrelated resume events", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];
    const adapter = createCanvasWorkAdapter(scope);

    scope.$broadcast("$viewRetentionPause");
    adapter.schedule(() => calls.push("deferred"));
    scope.$broadcast("$viewRetentionResume", { _pause: "background" });

    await Promise.resolve();
    expect(calls).toEqual([]);

    scope.$broadcast("$viewRetentionResume");
    await waitUntil(() => calls.length === 1);
    expect(calls).toEqual(["deferred"]);
  });

  it("keeps queued work deferred when paused again before its flush", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];
    const adapter = createCanvasWorkAdapter(scope);

    scope.$broadcast("$viewRetentionPause");
    adapter.schedule(() => calls.push("deferred"));
    scope.$broadcast("$viewRetentionResume");
    scope.$broadcast("$viewRetentionPause");
    scope.$broadcast("$viewRetentionResume");
    scope.$broadcast("$viewRetentionPause");

    await Promise.resolve();
    expect(calls).toEqual([]);

    scope.$broadcast("$viewRetentionResume");
    await waitUntil(() => calls.length === 1);
    expect(calls).toEqual(["deferred"]);
  });

  it("does not run queued work after destroy", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];
    const adapter = createCanvasWorkAdapter(scope);

    scope.$broadcast("$viewRetentionPause");
    adapter.schedule(() => calls.push("discarded"));
    adapter.dispose();
    scope.$broadcast("$viewRetentionResume");

    await waitUntil(() => calls.length === 0);
    expect(calls).toEqual([]);
  });

  it("clears queued work when its scope is destroyed", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];
    const adapter = createCanvasWorkAdapter(scope);

    scope.$broadcast("$viewRetentionPause");
    adapter.schedule(() => calls.push("discarded"));
    scope.$destroy();
    adapter.schedule(() => calls.push("after-destroy"));

    await Promise.resolve();
    expect(calls).toEqual([]);
  });

  it("does not run a scheduled flush after scope destruction", async () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];
    const adapter = createCanvasWorkAdapter(scope);

    scope.$broadcast("$viewRetentionPause");
    adapter.schedule(() => calls.push("discarded"));
    scope.$broadcast("$viewRetentionResume");
    scope.$destroy();

    await Promise.resolve();
    expect(calls).toEqual([]);
  });

  it("disposes idempotently and ignores later work", () => {
    const scope = createScope() as ng.Scope;
    const calls: string[] = [];
    const adapter = createCanvasWorkAdapter(scope);

    adapter.dispose();
    adapter.dispose();
    adapter.schedule(() => calls.push("discarded"));

    expect(calls).toEqual([]);
  });
});
