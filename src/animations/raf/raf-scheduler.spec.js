import { RafScheduler } from "./raf-scheduler.js";
import { wait } from "../../shared/utils.js";

describe("RafScheduler", function () {
  let scheduler;
  let rAFCallbacks;
  let originalRequestAnimationFrame;
  let originalCancelAnimationFrame;

  beforeEach(function () {
    rAFCallbacks = [];
    scheduler = new RafScheduler();

    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;

    spyOn(window, "requestAnimationFrame").and.callFake(function (cb) {
      const id = rAFCallbacks.length;
      rAFCallbacks.push(cb);
      return id;
    });

    spyOn(window, "cancelAnimationFrame").and.callFake(function (id) {
      rAFCallbacks[id] = null;
    });
  });

  afterEach(function () {
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  function flushRAF() {
    const callbacks = rAFCallbacks.slice();
    rAFCallbacks.length = 0;
    callbacks.forEach((cb) => cb && cb());
  }

  it("can be instatiated", () => {
    const ref = new RafScheduler();
    expect(ref).toBeDefined();
    expect(ref._queue.length).toEqual(0);
  });

  it("should schedule tasks and process them", async () => {
    const task1 = jasmine.createSpy("task1");
    const task2 = jasmine.createSpy("task2");

    scheduler._schedule([task1, task2]);
    await wait();
    expect(task1).toHaveBeenCalled();
    expect(task2).toHaveBeenCalled();
  });

  it("should process tasks in the correct order", function () {
    const callOrder = [];
    const task1 = function () {
      callOrder.push("task1");
    };
    const task2 = function () {
      callOrder.push("task2");
    };

    scheduler._schedule([task1, task2]);

    expect(callOrder).toEqual(["task1", "task2"]);
  });

  it("should wait until quiet before running the final function", function () {
    const quietFn = jasmine.createSpy("quietFn");
    const task1 = jasmine.createSpy("task1");

    scheduler._schedule([task1]);
    scheduler._waitUntilQuiet(quietFn);

    expect(quietFn).not.toHaveBeenCalled();

    flushRAF();

    expect(task1).toHaveBeenCalled();
    expect(quietFn).toHaveBeenCalled();
  });

  it("should cancel the previous animation frame when scheduling a new waitUntilQuiet", function () {
    const quietFn1 = jasmine.createSpy("quietFn1");
    const quietFn2 = jasmine.createSpy("quietFn2");

    scheduler._waitUntilQuiet(quietFn1);
    scheduler._waitUntilQuiet(quietFn2);

    expect(quietFn1).not.toHaveBeenCalled();
    expect(quietFn2).not.toHaveBeenCalled();

    flushRAF();

    expect(quietFn1).not.toHaveBeenCalled();
    expect(quietFn2).toHaveBeenCalled();
  });
});
