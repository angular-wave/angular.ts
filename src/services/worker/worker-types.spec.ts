/// <reference types="jasmine" />
import type { WorkerConfig, WorkerService } from "./worker.ts";

describe("$worker types", () => {
  it("requires restart for automatic restart configuration", () => {
    const service = null as unknown as WorkerService;
    const restarting: WorkerConfig<string> = {
      restart: true,
      restartDelay: 100,
      maxRestarts: 3,
      decode: String,
    };
    const stable: WorkerConfig<string> = {
      restart: false,
    };

    service<string, string>("/worker.js", restarting);
    const handle = service<{ type: string }, string>("/worker.js", stable);
    const transfer = [new ArrayBuffer(4)] as const;

    handle.post({ type: "transfer" }, transfer);
    const response: Promise<string> = handle.request({ type: "calculate" });
    const target = handle.model<{ score: number }>("player");

    target.write?.({ score: 1 }, { keys: ["score"], snapshotVersion: 1 });

    // @ts-expect-error restart configuration requires restart: true.
    service("/worker.js", { restartDelay: 100 });
    // @ts-expect-error disabled restart cannot include restart configuration.
    service("/worker.js", { restart: false, maxRestarts: 3 });
    // @ts-expect-error request payload must match the handle send type.
    handle.request({ value: 1 });

    expect(response).toBeDefined();
    expect(restarting.restart).toBeTrue();
    expect(stable.restart).toBeFalse();
  });
});
