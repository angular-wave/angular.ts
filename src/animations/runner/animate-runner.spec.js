import { AnimateRunner } from "./animate-runner.js";

describe("AnimateRunner", () => {
  let runner;

  beforeEach(() => {
    runner = new AnimateRunner();
  });

  it("should call done callbacks on complete()", (done) => {
    runner.done((ok) => {
      expect(ok).toBe(true);
      done();
    });

    runner.complete();
  });

  it("should call done callbacks on cancel()", (done) => {
    runner.done((ok) => {
      expect(ok).toBe(false);
      done();
    });

    runner.cancel();
  });

  it("should call done eventually if already completed", (done) => {
    let called = false;

    runner.complete();

    runner.done(() => {
      called = true;
      expect(called).toBe(true);
      done();
    });
  });

  it("should resolve promise when complete() called", async () => {
    runner.complete();
    await expectAsync(runner.getPromise()).toBeResolved();
  });

  it("should reject promise when cancel() called", async () => {
    const promise = runner.getPromise();
    runner.cancel();
    await expectAsync(promise).toBeRejected();
  });

  it("should chain multiple runners sequentially", (done) => {
    const r1 = new AnimateRunner();
    const r2 = new AnimateRunner();

    let order = [];

    r1.done(() => {
      order.push("r1");
      r1.complete();
    });

    r2.done(() => {
      order.push("r2");
      r2.complete();
    });

    AnimateRunner._chain([r1, r2], (ok) => {
      expect(ok).toBe(true);
      expect(order).toEqual(["r1", "r2"]);
      done();
    });

    r1.complete();
    r2.complete();
  });

  it("should wait for all runners in AnimateRunner.all()", (done) => {
    const r1 = new AnimateRunner();
    const r2 = new AnimateRunner();

    AnimateRunner._all([r1, r2], (ok) => {
      expect(ok).toBe(true);
      done();
    });

    r1.complete();
    r2.complete();
  });

  it("should call host methods if provided", () => {
    const host = {
      pause: jasmine.createSpy("pause"),
      resume: jasmine.createSpy("resume"),
      end: jasmine.createSpy("end"),
      cancel: jasmine.createSpy("cancel"),
      progress: jasmine.createSpy("progress"),
    };

    const r = new AnimateRunner(host);

    r.pause();
    r.resume();
    r.progress("tick");
    r.progress("tick");
    r.progress("tick");
    r.end();
    r.cancel();

    expect(host.pause).toHaveBeenCalled();
    expect(host.resume).toHaveBeenCalled();
    expect(host.progress).toHaveBeenCalledWith("tick");
    expect(host.progress).toHaveBeenCalledTimes(3);
    expect(host.end).toHaveBeenCalled();
    expect(host.cancel).toHaveBeenCalled();
  });

  it("should not call callbacks twice", (done) => {
    let calls = 0;
    runner.done(() => calls++);
    runner.complete();
    runner.complete();
    runner.cancel();

    setTimeout(() => {
      expect(calls).toBe(1);
      done();
    }, 10);
  });
});
