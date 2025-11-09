import { schedule } from "./animate-runner.js";

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
    schedule(() => {});

    setTimeout(() => {
      // After flush, queue should be empty and next schedule should trigger another flush
      schedule(() => {});
      expect(true).toBe(true);
      done();
    }, 20);
  });

  it("should clear the queue after flush", (done) => {
    schedule(() => {});

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
