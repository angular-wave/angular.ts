/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngViewport", () => {
  let $compile: any, $rootScope: any, el: any, $test, $log;

  class FakeIntersectionObserver {
    static instances: FakeIntersectionObserver[] = [];

    callback: IntersectionObserverCallback;
    options: IntersectionObserverInit | undefined;
    disconnected = false;
    observed: Element[] = [];

    constructor(
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit,
    ) {
      this.callback = callback;
      this.options = options;
      FakeIntersectionObserver.instances.push(this);
    }

    observe(element: Element): void {
      this.observed.push(element);
    }

    disconnect(): void {
      this.disconnected = true;
    }

    emit(entry: Partial<IntersectionObserverEntry>): void {
      this.callback(
        [entry as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
  }

  async function withFakeIntersectionObserver(
    action: () => Promise<void> | void,
  ): Promise<void> {
    const original = window.IntersectionObserver;

    FakeIntersectionObserver.instances = [];
    window.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver;

    try {
      await action();
    } finally {
      window.IntersectionObserver = original;
    }
  }

  beforeEach(() => {
    el = document.getElementById("app");
    dealoc(el);
    el.innerHTML = "";
    const angular = new Angular();

    angular.module("default", []);
    angular
      .bootstrap(el, ["default"])
      .invoke((_$compile_: any, _$rootScope_: any, _$log_: any) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      });
  });

  it("should detect element being scrolled into view", async () => {
    el.innerHTML = `<div
      ng-viewport
      on-enter="viewable = true"
      on-leave="viewable = false"
    >
      Test
    </div>`;
    $compile(el)($rootScope);
    await wait();
    expect($rootScope.viewable).toEqual(undefined);

    window.scrollTo(0, 1500);
    await wait(100);
    expect($rootScope.viewable).toEqual(true);

    window.scrollTo(0, 0);
    await wait(100);
    expect($rootScope.viewable).toEqual(false);
  });

  it("passes the observer entry into enter and leave expressions", async () => {
    await withFakeIntersectionObserver(async () => {
      el.innerHTML = `<div
        ng-viewport
        on-enter="ratio = $entry.intersectionRatio"
        on-leave="left = !$entry.isIntersecting"
      >
        Test
      </div>`;
      $compile(el)($rootScope);
      await wait();

      const observer = FakeIntersectionObserver.instances[0];

      observer.emit({ isIntersecting: true, intersectionRatio: 0.75 });
      expect($rootScope.ratio).toBe(0.75);

      observer.emit({ isIntersecting: false, intersectionRatio: 0 });
      expect($rootScope.left).toBe(true);
    });
  });

  it("configures threshold and root margin", async () => {
    await withFakeIntersectionObserver(async () => {
      el.innerHTML = `<div
        ng-viewport
        data-viewport-threshold="0, 0.5, 1"
        data-viewport-margin="200px 0px"
      >
        Test
      </div>`;
      $compile(el)($rootScope);
      await wait();

      const observer = FakeIntersectionObserver.instances[0];

      expect(observer.options?.threshold).toEqual([0, 0.5, 1]);
      expect(observer.options?.rootMargin).toBe("200px 0px");
    });
  });

  it("configures a single threshold as a number", async () => {
    await withFakeIntersectionObserver(async () => {
      el.innerHTML = `<div
        ng-viewport
        data-viewport-threshold="0.25"
      >
        Test
      </div>`;
      $compile(el)($rootScope);
      await wait();

      const observer = FakeIntersectionObserver.instances[0];

      expect(observer.options?.threshold).toBe(0.25);
    });
  });

  it("rejects non-numeric thresholds", async () => {
    await withFakeIntersectionObserver(() => {
      el.innerHTML = `<div
        ng-viewport
        data-viewport-threshold="not-a-number"
      >
        Test
      </div>`;

      expect(() => $compile(el)($rootScope)).toThrowError(
        "Invalid ng-viewport threshold 'not-a-number'",
      );
    });
  });

  it("rejects thresholds outside the intersection observer range", async () => {
    await withFakeIntersectionObserver(() => {
      el.innerHTML = `<div
        ng-viewport
        data-viewport-threshold="0, 2"
      >
        Test
      </div>`;

      expect(() => $compile(el)($rootScope)).toThrowError(
        "Invalid ng-viewport threshold '0, 2'. Threshold values must be between 0 and 1.",
      );
    });
  });

  it("supports one-shot enter behavior", async () => {
    await withFakeIntersectionObserver(async () => {
      $rootScope.count = 0;
      el.innerHTML = `<div
        ng-viewport
        data-viewport-once
        on-enter="count = count + 1"
        on-leave="count = count + 100"
      >
        Test
      </div>`;
      $compile(el)($rootScope);
      await wait();

      const observer = FakeIntersectionObserver.instances[0];

      observer.emit({ isIntersecting: true });
      expect($rootScope.count).toBe(1);
      expect(observer.disconnected).toBe(true);

      observer.emit({ isIntersecting: false });
      observer.emit({ isIntersecting: true });
      expect($rootScope.count).toBe(1);
    });
  });
});
