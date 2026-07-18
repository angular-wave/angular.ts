// @ts-nocheck
/// <reference types="jasmine" />
import {
  applyEventBusConfiguration,
  createEventBusRuntimeState,
  createEventBusService,
  destroyEventBusRuntimeState,
  EventBus,
} from "./event-bus.ts";
import { createInjector } from "../../core/di/injector.ts";
import { createScope } from "../../core/scope/scope.ts";
import { Angular } from "../../angular.ts";
import { wait } from "../../shared/utils.ts";
import { createAngular } from "../../runtime/index.ts";
import { eventBusModule } from "../../runtime/event-bus.ts";

describe("EventBus composition", () => {
  it("should be injectable", () => {
    const angular = new Angular();

    angular.module("test", ["ng"]);
    const $injector = createInjector(["test"]);

    expect($injector.has("$eventBus")).toBeTrue();
    expect($injector.get("$eventBus") instanceof EventBus).toBeTrue();
  });

  it("applies event bus delivery policy from module config", async () => {
    const angular = new Angular();
    const policy = jasmine.createSpy("deliveryPolicy").and.returnValue("drop");

    window.angular = angular;
    angular.module("configuredEventBusPolicy", ["ng"]).config({
      $eventBus: {
        deliveryPolicy: policy,
      },
    });
    const $injector = createInjector(["configuredEventBusPolicy"]);
    const $eventBus = $injector.get("$eventBus");
    const listener = jasmine.createSpy("listener");

    $eventBus.subscribe("configured:topic", listener);

    expect($eventBus.publish("configured:topic", "payload")).toBe(true);
    await wait();

    expect(listener).not.toHaveBeenCalled();
    expect(policy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        operation: "event.delivery",
        topic: "configured:topic",
        args: ["payload"],
      }),
    );
  });

  it("shares one application EventBus across injectors and runtime teardown", () => {
    const angular = new Angular();

    angular.module("firstEventBusInjector", ["ng"]);
    angular.module("secondEventBusInjector", ["ng"]);

    const first = createInjector(["firstEventBusInjector"]).get("$eventBus");
    const second = createInjector(["secondEventBusInjector"]).get("$eventBus");

    expect(second).toBe(first);
    expect(angular.$eventBus).toBe(first);

    angular._composition.destroy();

    expect(first.isDisposed()).toBeTrue();
  });

  it("keeps EventBus opt-in for custom runtimes", () => {
    const omitted = createAngular();
    const included = createAngular({
      modules: [eventBusModule],
    });

    expect(omitted.injector(["ng"]).has("$eventBus")).toBeFalse();
    expect(
      included.injector(["ng"]).get("$eventBus") instanceof EventBus,
    ).toBeTrue();

    omitted._composition.destroy();
    included._composition.destroy();
  });

  it("applies custom-runtime EventBus configuration", async () => {
    const deliveryPolicy = jasmine
      .createSpy("deliveryPolicy")
      .and.returnValue({ type: "drop" });
    const angular = createAngular({
      modules: [eventBusModule],
    });

    angular.module("configuredCustomEventBus", []).config({
      $eventBus: { deliveryPolicy },
    });

    const eventBus = angular
      .injector(["ng", "configuredCustomEventBus"])
      .get("$eventBus");
    const listener = jasmine.createSpy("listener");

    eventBus.subscribe("custom:configured", listener);
    eventBus.publish("custom:configured", "payload");
    await wait();

    expect(deliveryPolicy).toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();

    angular._composition.destroy();
  });

  it("does not dispose an externally owned EventBus", () => {
    const state = createEventBusRuntimeState();
    const external = new EventBus(() => undefined);
    const policy = jasmine.createSpy("deliveryPolicy").and.returnValue("drop");

    expect(createEventBusService(state, () => undefined, external)).toBe(
      external,
    );
    expect(createEventBusService(state, () => undefined)).toBe(external);

    applyEventBusConfiguration(state, { deliveryPolicy: policy });
    destroyEventBusRuntimeState(state);
    destroyEventBusRuntimeState(state);

    expect(external.isDisposed()).toBeFalse();
    expect(() =>
      applyEventBusConfiguration(state, { deliveryPolicy: policy }),
    ).toThrowError("EventBus runtime has already been disposed.");
    expect(() => createEventBusService(state, () => undefined)).toThrowError(
      "EventBus runtime has already been disposed.",
    );

    external.dispose();
  });
});

describe("EventBus", function () {
  let eventBus;

  beforeEach(function () {
    eventBus = new EventBus(() => undefined);
  });

  afterEach(function () {
    eventBus.dispose();
    eventBus.dispose();
  });

  it("should create a EventBus instance", function () {
    expect(eventBus).not.toBeNull();
    expect(eventBus instanceof EventBus).toBe(true);
  });

  it("should provide injecables", function () {
    expect(eventBus._exceptionHandler).not.toBeNull();
  });

  it("should dispose of the EventBus instance", function () {
    expect(eventBus.isDisposed()).toBe(false);
    eventBus.dispose();
    expect(eventBus.isDisposed()).toBe(true);
  });

  it("should subscribe and unsubscribe correctly", function () {
    function foo1() {}
    function bar1() {}
    function foo2() {}
    function bar2() {}

    expect(eventBus.getCount("foo")).toBe(0);
    expect(eventBus.getCount("bar")).toBe(0);

    eventBus.subscribe("foo", foo1);
    expect(eventBus.getCount("foo")).toBe(1);
    expect(eventBus.getCount("bar")).toBe(0);

    eventBus.subscribe("bar", bar1);
    expect(eventBus.getCount("foo")).toBe(1);
    expect(eventBus.getCount("bar")).toBe(1);

    eventBus.subscribe("foo", foo2);
    expect(eventBus.getCount("foo")).toBe(2);
    expect(eventBus.getCount("bar")).toBe(1);

    eventBus.subscribe("bar", bar2);
    expect(eventBus.getCount("foo")).toBe(2);
    expect(eventBus.getCount("bar")).toBe(2);

    expect(eventBus.unsubscribe("foo", foo1)).toBe(true);
    expect(eventBus.getCount("foo")).toBe(1);
    expect(eventBus.getCount("bar")).toBe(2);

    expect(eventBus.unsubscribe("foo", foo2)).toBe(true);
    expect(eventBus.getCount("foo")).toBe(0);
    expect(eventBus.getCount("bar")).toBe(2);

    expect(eventBus.unsubscribe("bar", bar1)).toBe(true);
    expect(eventBus.getCount("foo")).toBe(0);
    expect(eventBus.getCount("bar")).toBe(1);

    expect(eventBus.unsubscribe("bar", bar2)).toBe(true);
    expect(eventBus.getCount("foo")).toBe(0);
    expect(eventBus.getCount("bar")).toBe(0);

    expect(eventBus.unsubscribe("baz", foo1)).toBe(false);
    expect(
      eventBus.unsubscribe("foo", () => {
        /* empty */
      }),
    ).toBe(false);
  });

  it("should subscribe and unsubscribe with context correctly", function () {
    function foo() {}
    function bar() {}

    const contextA = {};

    const contextB = {};

    expect(eventBus.getCount("X")).toBe(0);

    eventBus.subscribe("X", foo, contextA);
    expect(eventBus.getCount("X")).toBe(1);

    eventBus.subscribe("X", bar);
    expect(eventBus.getCount("X")).toBe(2);

    eventBus.subscribe("X", bar, contextB);
    expect(eventBus.getCount("X")).toBe(3);

    expect(eventBus.unsubscribe("X", foo, contextB)).toBe(false);

    expect(eventBus.unsubscribe("X", foo, contextA)).toBe(true);
    expect(eventBus.getCount("X")).toBe(2);

    expect(eventBus.unsubscribe("X", bar)).toBe(true);
    expect(eventBus.getCount("X")).toBe(1);

    expect(eventBus.unsubscribe("X", bar, contextB)).toBe(true);
    expect(eventBus.getCount("X")).toBe(0);
  });

  it("should auto-unsubscribe scope context listeners on destroy", async function () {
    const scope = createScope({ count: 0 });

    eventBus.subscribe(
      "scopeTopic",
      function () {
        this.count++;
      },
      scope,
    );

    expect(eventBus.getCount("scopeTopic")).toBe(1);

    scope.$destroy();

    expect(eventBus.getCount("scopeTopic")).toBe(0);
    expect(eventBus.publish("scopeTopic")).toBe(false);

    await wait();
    expect(scope.count).toBe(0);
  });

  it("should remove scope destroy hook when cleanup is called manually", function () {
    const scope = createScope();
    const listener = jasmine.createSpy("listener");

    const cleanup = eventBus.subscribe("scopeTopic", listener, scope);

    expect(eventBus.getCount("scopeTopic")).toBe(1);
    expect(scope.$handler._listeners.get("$destroy").length).toBe(2);

    expect(cleanup()).toBe(true);

    expect(eventBus.getCount("scopeTopic")).toBe(0);
    expect(scope.$handler._listeners.get("$destroy").length).toBe(1);

    scope.$destroy();

    expect(cleanup()).toBe(false);
    expect(eventBus.getCount("scopeTopic")).toBe(0);
  });

  it("should keep plain context lifecycle behavior unchanged", function () {
    const listener = jasmine.createSpy("listener");
    const context = {
      $on: jasmine.createSpy("$on"),
    };

    const cleanup = eventBus.subscribe("plainTopic", listener, context);

    expect(context.$on).not.toHaveBeenCalled();
    expect(eventBus.getCount("plainTopic")).toBe(1);
    expect(cleanup()).toBe(true);
    expect(cleanup()).toBe(false);
  });

  it("should return an idempotent unsubscribe function for a listener", function () {
    const listener = jasmine.createSpy("listener");

    const unsubscribe = eventBus.subscribe("someTopic", listener);

    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(unsubscribe()).toBe(true);
    expect(eventBus.getCount("someTopic")).toBe(0);
    expect(unsubscribe()).toBe(false);
  });

  it("should clear listeners and make the instance reusable on reset", function () {
    const listener = jasmine.createSpy("listener");

    eventBus.subscribe("someTopic", listener);
    expect(eventBus.getCount("someTopic")).toBe(1);

    eventBus.dispose();
    expect(eventBus.isDisposed()).toBe(true);
    expect(eventBus.getCount("someTopic")).toBe(0);
    expect(eventBus.publish("someTopic")).toBe(false);

    eventBus.reset();
    expect(eventBus.isDisposed()).toBe(false);
    expect(eventBus.getCount("someTopic")).toBe(0);

    eventBus.subscribe("someTopic", listener);
    expect(eventBus.getCount("someTopic")).toBe(1);
  });

  it("should reject subscribe and unsubscribe work while disposed", function () {
    const listener = jasmine.createSpy("listener");

    eventBus.dispose();

    const unsubscribe = eventBus.subscribe("someTopic", listener);
    const unsubscribeOnce = eventBus.subscribeOnce("someTopic", listener);

    expect(eventBus.getCount("someTopic")).toBe(0);
    expect(unsubscribe()).toBe(false);
    expect(unsubscribeOnce()).toBe(false);
    expect(eventBus.unsubscribe("someTopic", listener)).toBe(false);
    expect(eventBus.publish("someTopic")).toBe(false);
  });

  it("should keep diagnostics limited to active listener counts", function () {
    const scope = createScope();
    const scopedListener = jasmine.createSpy("scopedListener");
    const plainListener = jasmine.createSpy("plainListener");

    eventBus.subscribe("diagnosticsTopic", scopedListener, scope);
    const cleanupPlain = eventBus.subscribe("diagnosticsTopic", plainListener);

    expect(eventBus.getCount("diagnosticsTopic")).toBe(2);

    scope.$destroy();

    expect(eventBus.getCount("diagnosticsTopic")).toBe(1);

    cleanupPlain();

    expect(eventBus.getCount("diagnosticsTopic")).toBe(0);
    expect(eventBus.getTopics).toBeUndefined();
    expect(eventBus.getScopedCount).toBeUndefined();
    expect(eventBus.getLeakReport).toBeUndefined();
    expect(eventBus.diagnostics).toBeUndefined();
  });

  it("should subscribe once correctly", async function () {
    let called;

    let context;

    called = false;
    eventBus.subscribeOnce("someTopic", () => {
      called = true;
    });
    await wait();
    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(called).toBe(false);

    eventBus.publish("someTopic");
    await wait();
    expect(eventBus.getCount("someTopic")).toBe(0);
    expect(called).toBe(true);

    context = { called: false };
    eventBus.subscribeOnce(
      "someTopic",
      function () {
        this.called = true;
      },
      context,
    );
    await wait();
    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(context.called).toBe(false);

    eventBus.publish("someTopic");
    await wait();
    expect(eventBus.getCount("someTopic")).toBe(0);
    expect(context.called).toBe(true);

    context = { called: false, value: 0 };
    eventBus.subscribeOnce(
      "someTopic",
      function (value) {
        this.called = true;
        this.value = value;
      },
      context,
    );
    await wait();
    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(context.called).toBe(false);
    expect(context.value).toBe(0);

    eventBus.publish("someTopic", 17);
    await wait();
    expect(eventBus.getCount("someTopic")).toBe(0);
    expect(context.called).toBe(true);
    expect(context.value).toBe(17);
  });

  it("should auto-clean scope subscribe once listeners on destroy before delivery", async function () {
    const scope = createScope({ called: false });

    eventBus.subscribeOnce(
      "someTopic",
      function () {
        this.called = true;
      },
      scope,
    );

    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(scope.$handler._listeners.get("$destroy").length).toBe(2);

    eventBus.publish("someTopic");
    scope.$destroy();

    await wait();

    expect(scope.called).toBe(false);
    expect(eventBus.getCount("someTopic")).toBe(0);
  });

  it("should remove scope destroy hook after subscribe once delivery", async function () {
    const scope = createScope({ callCount: 0, value: "" });

    const cleanup = eventBus.subscribeOnce(
      "someTopic",
      function (value) {
        this.callCount++;
        this.value = value;
      },
      scope,
    );

    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(scope.$handler._listeners.get("$destroy").length).toBe(2);

    eventBus.publish("someTopic", "first");
    eventBus.publish("someTopic", "second");

    await wait();

    expect(scope.callCount).toBe(1);
    expect(scope.value).toBe("first");
    expect(eventBus.getCount("someTopic")).toBe(0);
    expect(scope.$handler._listeners.get("$destroy").length).toBe(1);
    expect(cleanup()).toBe(false);
  });

  it("should async subscribe once correctly", function (done) {
    let callCount = 0;

    eventBus.subscribeOnce("someTopic", () => {
      callCount++;
    });
    expect(eventBus.getCount("someTopic")).toBe(1);
    eventBus.publish("someTopic");

    setTimeout(() => {
      expect(eventBus.getCount("someTopic")).toBe(0);
      expect(callCount).toBe(1);
      done();
    }, 0);
  });

  it("should async subscribe once with context correctly", function (done) {
    const context = { callCount: 0 };

    eventBus.subscribeOnce(
      "someTopic",
      function () {
        this.callCount++;
      },
      context,
    );
    expect(eventBus.getCount("someTopic")).toBe(1);

    eventBus.publish("someTopic");
    eventBus.publish("someTopic");

    setTimeout(() => {
      expect(eventBus.getCount("someTopic")).toBe(0);
      expect(context.callCount).toBe(1);
      done();
    }, 0);
  });

  it("should async subscribe once with context and value correctly", function (done) {
    const context = { callCount: 0, value: 0 };

    eventBus.subscribeOnce(
      "someTopic",
      function (value) {
        this.callCount++;
        this.value = value;
      },
      context,
    );
    expect(eventBus.getCount("someTopic")).toBe(1);

    eventBus.publish("someTopic", 17);
    eventBus.publish("someTopic", 42);

    setTimeout(() => {
      expect(eventBus.getCount("someTopic")).toBe(0);
      expect(context.callCount).toBe(1);
      expect(context.value).toBe(17);
      done();
    }, 0);
  });

  it("should subscribe once with bound function correctly", async function () {
    const context = { called: false, value: 0 };

    function subscriber(value) {
      this.called = true;
      this.value = value;
    }

    eventBus.subscribeOnce("someTopic", subscriber.bind(context));
    await wait();

    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(context.called).toBe(false);
    expect(context.value).toBe(0);

    eventBus.publish("someTopic", 17);
    await wait();

    expect(eventBus.getCount("someTopic")).toBe(0);
    expect(context.called).toBe(true);
    expect(context.value).toBe(17);
  });

  it("should subscribe once with partial function correctly", async function () {
    let called = false;

    let value = 0;

    function subscriber(hasBeenCalled, newValue) {
      called = hasBeenCalled;
      value = newValue;
    }

    eventBus.subscribeOnce("someTopic", subscriber.bind(null, true));
    await wait();

    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(called).toBe(false);
    expect(value).toBe(0);

    eventBus.publish("someTopic", 17);
    await wait();

    expect(eventBus.getCount("someTopic")).toBe(0);
    expect(called).toBe(true);
    expect(value).toBe(17);
  });

  it("should handle self resubscribe correctly", async function () {
    let value = null;

    function resubscribe(iteration, newValue) {
      eventBus.subscribeOnce(
        "someTopic",
        resubscribe.bind(null, iteration + 1),
      );
      value = `${newValue}:${iteration}`;
    }

    eventBus.subscribeOnce("someTopic", resubscribe.bind(null, 0));
    await wait();

    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(value).toBeNull();

    eventBus.publish("someTopic", "foo");
    await wait();

    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(value).toBe("foo:0");

    eventBus.publish("someTopic", "bar");
    await wait();

    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(value).toBe("bar:1");

    eventBus.publish("someTopic", "baz");
    await wait();

    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(value).toBe("baz:2");
  });

  it("should handle async self resubscribe correctly", function (done) {
    let value = null;

    function resubscribe(iteration, newValue) {
      eventBus.subscribeOnce(
        "someTopic",
        resubscribe.bind(null, iteration + 1),
      );
      value = `${newValue}:${iteration}`;
    }

    eventBus.subscribeOnce("someTopic", resubscribe.bind(null, 0));
    expect(eventBus.getCount("someTopic")).toBe(1);
    expect(value).toBeNull();

    eventBus.publish("someTopic", "foo");

    setTimeout(() => {
      expect(eventBus.getCount("someTopic")).toBe(1);
      expect(value).toBe("foo:0");

      eventBus.publish("someTopic", "bar");

      setTimeout(() => {
        expect(eventBus.getCount("someTopic")).toBe(1);
        expect(value).toBe("bar:1");

        eventBus.publish("someTopic", "baz");

        setTimeout(() => {
          expect(eventBus.getCount("someTopic")).toBe(1);
          expect(value).toBe("baz:2");
          done();
        }, 0);
      }, 0);
    }, 0);
  });

  describe("publish", () => {
    let context, fooCalled, barCalled, SOME_TOPIC;

    beforeEach(function () {
      context = {};
      fooCalled = false;
      barCalled = false;
      SOME_TOPIC = "someTopic";
    });

    function foo(record) {
      fooCalled = true;
      expect(record.x).toBe("x");
      expect(record.y).toBe("y");
    }

    function bar(record) {
      barCalled = true;
      expect(this).toBe(context);
      expect(record.x).toBe("x");
      expect(record.y).toBe("y");
    }

    it("should call subscribed functions on publish", async function () {
      eventBus.subscribe(SOME_TOPIC, foo);
      eventBus.subscribe(SOME_TOPIC, bar, context);

      expect(eventBus.publish(SOME_TOPIC, { x: "x", y: "y" })).toBe(true);
      await wait();
      expect(fooCalled).toBe(true, "foo() must have been called");
      expect(barCalled).toBe(true, "bar() must have been called");
    });

    it("should skip scope listeners destroyed after publish is queued", async function () {
      const scope = createScope({ calls: [] });
      const calls = [];

      eventBus.subscribe(
        SOME_TOPIC,
        function (value) {
          this.calls.push(value);
          calls.push("scope");
        },
        scope,
      );
      eventBus.subscribe(SOME_TOPIC, () => {
        calls.push("plain");
      });

      expect(eventBus.publish(SOME_TOPIC, "queued")).toBe(true);

      scope.$destroy();

      await wait();

      expect(scope.calls).toEqual([]);
      expect(calls).toEqual(["plain"]);
      expect(eventBus.getCount(SOME_TOPIC)).toBe(1);
    });

    it("should defer scope listeners while scope is retention-paused", async function () {
      const scope = createScope({ calls: [] });
      const calls = [];

      eventBus.subscribe(
        SOME_TOPIC,
        function (value) {
          this.calls.push(value);
          calls.push(value);
        },
        scope,
      );

      scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });
      expect(eventBus.publish(SOME_TOPIC, "first")).toBe(true);
      expect(eventBus.publish(SOME_TOPIC, "second")).toBe(true);

      await wait();

      expect(scope.calls).toEqual([]);
      expect(calls).toEqual([]);

      scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });

      await wait();

      expect(scope.calls).toEqual(["first", "second"]);
      expect(calls).toEqual(["first", "second"]);
    });

    it("should reuse scope retention state for multiple listeners on the same scope", async function () {
      const scope = createScope({ calls: [] });

      eventBus.subscribe(
        SOME_TOPIC,
        function (value) {
          this.calls.push(`first:${value}`);
        },
        scope,
      );
      eventBus.subscribe(
        SOME_TOPIC,
        function (value) {
          this.calls.push(`second:${value}`);
        },
        scope,
      );

      scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });
      expect(eventBus.publish(SOME_TOPIC, "queued")).toBe(true);

      await wait();

      expect(scope.calls).toEqual([]);

      scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });

      await wait();

      expect(scope.calls).toEqual(["first:queued", "second:queued"]);
      expect(scope.$handler._listeners.get("$viewRetentionPause").length).toBe(
        1,
      );
      expect(scope.$handler._listeners.get("$viewRetentionResume").length).toBe(
        1,
      );
    });

    it("should leave paused deliveries queued if scope pauses again before the drain", async function () {
      const scope = createScope({ calls: [] });

      eventBus.subscribe(
        SOME_TOPIC,
        function (value) {
          this.calls.push(value);
        },
        scope,
      );

      scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });
      expect(eventBus.publish(SOME_TOPIC, "queued")).toBe(true);

      scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });
      scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });

      await wait();

      expect(scope.calls).toEqual([]);

      scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });

      await wait();

      expect(scope.calls).toEqual(["queued"]);
    });

    it("should ignore unrelated retention resume modes and unpaused resumes", async function () {
      const scope = createScope({ calls: [] });

      eventBus.subscribe(
        SOME_TOPIC,
        function (value) {
          this.calls.push(value);
        },
        scope,
      );

      scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });
      scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });
      expect(eventBus.publish(SOME_TOPIC, "queued")).toBe(true);

      scope.$broadcast("$viewRetentionResume", { _pause: "background" });

      await wait();

      expect(scope.calls).toEqual([]);

      scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });

      await wait();

      expect(scope.calls).toEqual(["queued"]);
    });

    it("ignores retention pause for unrelated modes", async function () {
      const scope = createScope({ calls: [] });
      const calls = [];

      eventBus.subscribe(
        SOME_TOPIC,
        function (value) {
          this.calls.push(value);
          calls.push(value);
        },
        scope,
      );

      eventBus.publish(SOME_TOPIC, "immediate");
      await wait();
      expect(scope.calls).toEqual(["immediate"]);
      expect(calls).toEqual(["immediate"]);

      eventBus.publish(SOME_TOPIC, "first");
      scope.$broadcast("$viewRetentionPause", { _pause: "background" });
      eventBus.publish(SOME_TOPIC, "background");
      await wait();

      expect(scope.calls).toEqual(["immediate", "first", "background"]);
      expect(calls).toEqual(["immediate", "first", "background"]);
    });

    it("should drop pending paused scope listeners when scope is destroyed", async function () {
      const scope = createScope({ calls: [] });
      const calls = [];

      eventBus.subscribe(
        SOME_TOPIC,
        function (value) {
          this.calls.push(value);
          calls.push(value);
        },
        scope,
      );

      scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });
      expect(eventBus.publish(SOME_TOPIC, "first")).toBe(true);

      scope.$destroy();
      await wait();

      expect(scope.calls).toEqual([]);
      expect(calls).toEqual([]);
      expect(eventBus.getCount(SOME_TOPIC)).toBe(0);
    });

    it("should preserve plain listener snapshot delivery after unsubscribe", async function () {
      const listener = jasmine.createSpy("listener");

      const unsubscribe = eventBus.subscribe(SOME_TOPIC, listener);

      expect(eventBus.publish(SOME_TOPIC, "queued")).toBe(true);
      expect(unsubscribe()).toBe(true);
      expect(eventBus.getCount(SOME_TOPIC)).toBe(0);

      await wait();

      expect(listener).toHaveBeenCalledOnceWith("queued");
    });

    it("should deliver active listeners in subscription order", async function () {
      const calls = [];

      eventBus.subscribe(SOME_TOPIC, () => calls.push("first"));
      eventBus.subscribe(SOME_TOPIC, () => calls.push("second"));
      eventBus.subscribe(SOME_TOPIC, () => calls.push("third"));

      expect(eventBus.publish(SOME_TOPIC)).toBe(true);

      await wait();

      expect(calls).toEqual(["first", "second", "third"]);
    });

    it("should evaluate delivery policy with normalized listener context", async function () {
      const policy = jasmine
        .createSpy("deliveryPolicy")
        .and.returnValues(Promise.resolve("deliver"), Promise.resolve("drop"));
      const calls = [];

      eventBus.setDeliveryPolicy(policy);
      eventBus.subscribe(SOME_TOPIC, () => calls.push("first"));
      eventBus.subscribe(SOME_TOPIC, () => calls.push("second"));

      expect(eventBus.publish(SOME_TOPIC, "payload")).toBe(true);

      await wait();

      expect(calls).toEqual(["first"]);
      expect(policy).toHaveBeenCalledWith({
        operation: "event.delivery",
        topic: SOME_TOPIC,
        args: ["payload"],
        listenerIndex: 0,
        scopeOwned: false,
        targetAlive: true,
      });
      expect(policy).toHaveBeenCalledWith({
        operation: "event.delivery",
        topic: SOME_TOPIC,
        args: ["payload"],
        listenerIndex: 1,
        scopeOwned: false,
        targetAlive: true,
      });
    });

    it("should report unsupported delivery policy decisions", async function () {
      const receivedErrors = [];
      const listener = jasmine.createSpy("listener");

      eventBus = new EventBus((err) => {
        receivedErrors.push(err);
      });
      eventBus.setDeliveryPolicy(() => "retry" as never);
      eventBus.subscribe(SOME_TOPIC, listener);

      expect(eventBus.publish(SOME_TOPIC)).toBe(true);

      await wait();

      expect(listener).not.toHaveBeenCalled();
      expect(receivedErrors.length).toBe(1);
      expect(receivedErrors[0].message).toBe(
        "Unsupported event delivery policy decision: retry",
      );
    });

    it("should route delivery policy errors through the exception handler", async function () {
      const policyError = new Error("policy failed");
      const receivedErrors = [];
      const listener = jasmine.createSpy("listener");

      eventBus = new EventBus((err) => {
        receivedErrors.push(err);
      });
      eventBus.setDeliveryPolicy(() => {
        throw policyError;
      });
      eventBus.subscribe(SOME_TOPIC, listener);

      expect(eventBus.publish(SOME_TOPIC)).toBe(true);

      await wait();

      expect(listener).not.toHaveBeenCalled();
      expect(receivedErrors).toEqual([policyError]);
    });

    it("should ignore stale paused-scope queue entries", async function () {
      const scope = createScope();
      const pending = [
        {
          _topic: SOME_TOPIC,
          _args: [],
          _listenerIndex: 0,
          _entry: {
            _scopeLifecycleContext: true,
            _context: scope,
          },
        },
      ];
      const state = {
        _paused: true,
        _pending: pending,
        _flushing: true,
      };

      expect(() => {
        eventBus._queuePausedScopeDelivery(SOME_TOPIC, [], 0, {
          _scopeLifecycleContext: false,
        });
        eventBus._queuePausedScopeDelivery(SOME_TOPIC, [], 0, {
          _scopeLifecycleContext: true,
          _context: scope,
        });
      }).not.toThrow();

      await eventBus._drainScopeDeliveryQueue(state);

      expect(state._flushing).toBeFalse();
      expect(state._pending).toBe(pending);
    });

    it("should not call unsubscribed functions on publish", async function () {
      eventBus.subscribe(SOME_TOPIC, foo);
      eventBus.subscribe(SOME_TOPIC, bar, context);

      eventBus.publish(SOME_TOPIC, { x: "x", y: "y" });
      await wait();
      expect(fooCalled).toBe(true, "foo() must have been called");
      expect(barCalled).toBe(true, "bar() must have been called");
      fooCalled = false;
      barCalled = false;
      expect(eventBus.unsubscribe(SOME_TOPIC, foo)).toBe(true);
      expect(eventBus.publish(SOME_TOPIC, { x: "x", y: "y" })).toBe(true);

      await wait();
      expect(fooCalled).toBe(false, "foo() must not have been called");
      expect(barCalled).toBe(true, "bar() must have been called");
    });

    it("should only call functions subscribed to the correct topic", async function () {
      eventBus.subscribe(SOME_TOPIC, bar, context);
      eventBus.subscribe("differentTopic", foo);

      eventBus.publish(SOME_TOPIC, { x: "x", y: "y" });
      fooCalled = false;
      barCalled = false;

      await wait();
      expect(eventBus.publish(SOME_TOPIC, { x: "x", y: "y" })).toBe(true);
      expect(fooCalled).toBe(false, "foo() must not have been called");
      expect(barCalled).toBe(true, "bar() must have been called");
    });

    it("should trigger functions if not arguments are provided", async function () {
      let called = false;

      eventBus.subscribe(SOME_TOPIC, () => {
        called = true;
        0;
      });

      eventBus.publish(SOME_TOPIC);
      await wait();

      expect(eventBus.publish(SOME_TOPIC)).toBe(true);
      expect(called).toBeTrue();
    });

    it("should delegate to exception handler if an error is thrown", async function () {
      let thrown = false;

      const thrownError = new Error();

      let receivedErr;

      eventBus = new EventBus((err) => {
        thrown = true;
        receivedErr = err;
      });

      eventBus.subscribe(SOME_TOPIC, () => {
        throw thrownError;
      });

      eventBus.publish(SOME_TOPIC);
      await wait();

      expect(thrown).toBe(true);
      expect(receivedErr).toBe(thrownError);
    });

    it("should keep delivering active listeners after a listener throws", async function () {
      const thrownError = new Error("boom");
      const calls = [];
      let receivedErr;

      eventBus = new EventBus((err) => {
        receivedErr = err;
      });

      eventBus.subscribe(SOME_TOPIC, () => {
        calls.push("first");
      });
      eventBus.subscribe(SOME_TOPIC, () => {
        calls.push("throwing");
        throw thrownError;
      });
      eventBus.subscribe(SOME_TOPIC, () => {
        calls.push("third");
      });

      expect(eventBus.publish(SOME_TOPIC)).toBe(true);

      await wait();

      expect(receivedErr).toBe(thrownError);
      expect(calls).toEqual(["first", "throwing", "third"]);
    });
  });
});
