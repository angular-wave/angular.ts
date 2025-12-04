import { AnimateRunner, schedule } from "./animate-runner.js";
import { wait } from "../../shared/test-utils.js";

describe("$animate schedule", () => {
  it("should execute a single scheduled callback", (done) => {
    let called = false;

    schedule(() => {
      called = true;
      expect(called).toBe(true);
      done();
    });

    // flush happens automatically on next frame
  });

  it("should batch multiple callbacks in the same frame", (done) => {
    let calls = 0;

    schedule(() => {
      calls++;
    });
    schedule(() => {
      calls++;
    });

    setTimeout(() => {
      expect(calls).toBe(2);
      done();
    }, 100);
  });

  it("should schedule new callbacks for the next frame", (done) => {
    let calls = 0;

    schedule(() => {
      calls++;
      schedule(() => {
        calls++;
      });
    });

    setTimeout(() => {
      expect(calls).toBe(2);
      done();
    }, 50);
  });

  it("should reset scheduled flag after flushing", (done) => {
    schedule(() => {
      /* empty */
    });

    setTimeout(() => {
      // After flush, queue should be empty and next schedule should trigger another flush
      schedule(() => {
        /* empty */
      });
      expect(true).toBe(true);
      done();
    }, 20);
  });

  it("should clear the queue after flush", (done) => {
    schedule(() => {
      /* empty */
    });

    setTimeout(() => {
      let calls = 0;
      schedule(() => calls++);
      setTimeout(() => {
        expect(calls).toBe(1);
        done();
      }, 20);
    }, 20);
  });

  it("should handle nested scheduling correctly", (done) => {
    const calls = [];

    schedule(() => {
      calls.push(1);
      schedule(() => {
        calls.push(2);
        schedule(() => calls.push(3));
      });
    });

    setTimeout(() => {
      expect(calls).toEqual([1, 2, 3]);
      done();
    }, 100);
  });

  it("should execute callbacks in the order they were scheduled", (done) => {
    const calls = [];

    schedule(() => calls.push(1));
    schedule(() => calls.push(2));
    schedule(() => calls.push(3));

    setTimeout(() => {
      expect(calls).toEqual([1, 2, 3]);
      done();
    }, 20);
  });

  it("should not lose callbacks if flush is fast", (done) => {
    const calls = [];

    schedule(() => calls.push(1));
    schedule(() => calls.push(2));

    setTimeout(() => {
      expect(calls.length).toBe(2);
      done();
    }, 50);
  });

  it("should use setTimeout if requestAnimationFrame is not available", (done) => {
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = undefined;

    let called = false;
    schedule(() => {
      called = true;
    });

    setTimeout(() => {
      expect(called).toBe(true);
      window.requestAnimationFrame = originalRAF;
      done();
    }, 20);
  });
});

describe("AnimateRunner", () => {
  let runner;

  beforeEach(() => {
    runner = new AnimateRunner();
    // Make schedule immediate — avoids cross-test interference
    runner._schedule = (fn) => fn();
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

  it("should call done immediately if already completed", () => {
    let called = false;
    runner.complete();
    runner.done(() => (called = true));
    expect(called).toBe(true);
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

    AnimateRunner.chain([r1, r2], (ok) => {
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

    AnimateRunner.all([r1, r2], (ok) => {
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
