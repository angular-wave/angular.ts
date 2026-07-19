// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { createElementFromHTML, dealoc } from "../shared/dom.ts";
import { wait } from "../shared/test-utils.ts";
import { AnimationRegistry } from "./animate.ts";
import {
  addClass as addClassHelper,
  removeClass as removeClassHelper,
  setClass as setClassHelper,
  updateClass as updateClassHelper,
} from "./class-mutation.ts";

describe("AnimationRegistry", () => {
  it("owns normalized custom animation declarations", () => {
    const registry = new AnimationRegistry();
    const preset = { enter: [{ opacity: 0 }, { opacity: 1 }] };

    registry.register(".pulse", preset);

    expect(registry.get("pulse")).toBe(preset);
  });

  it("validates declarations and rejects use after teardown", () => {
    const registry = new AnimationRegistry();

    expect(() => registry.register("", {})).toThrowError(
      /Animation name must be a string/,
    );

    registry.destroy();
    registry.destroy();

    expect(() => registry.register("late", {})).toThrowError(
      "Animation registry has already been disposed.",
    );
    expect(() => registry.get("pulse")).toThrowError(
      "Animation registry has already been disposed.",
    );
    expect(() => registry.has("pulse")).toThrowError(
      "Animation registry has already been disposed.",
    );
  });
});

describe("$animate", () => {
  let host;

  let $animate;

  let style;

  beforeEach(() => {
    host = document.getElementById("app");
    host.innerHTML = "";
    style = document.createElement("style");
    document.head.append(style);

    const angular = new Angular();

    angular.bootstrap(host, []).invoke([
      "$animate",
      (_$animate_) => {
        $animate = _$animate_;
      },
    ]);
  });

  afterEach(() => {
    style.remove();
    dealoc(host);
  });

  it("inserts elements before running enter animations", async () => {
    const child = createElementFromHTML('<div animate="fade">child</div>');

    const handle = $animate.enter(child, host, null, { duration: 1 });

    expect(host.firstElementChild).toBe(child);
    await handle.finished;
  });

  it("removes elements after leave animations finish", async () => {
    const child = createElementFromHTML('<div animate="fade">child</div>');

    host.append(child);

    const handle = $animate.leave(child, { duration: 1 });

    expect(host.firstElementChild).toBe(child);
    await handle.finished;
    expect(host.firstElementChild).toBeNull();
  });

  it("moves elements immediately and returns a native handle", async () => {
    const first = createElementFromHTML('<div animate="fade">first</div>');

    const second = createElementFromHTML("<div>second</div>");

    host.append(first, second);

    const handle = $animate.move(first, host, second, { duration: 1 });

    expect(host.textContent).toBe("secondfirst");
    expect(handle.finished.then).toBeDefined();
    await handle.finished;
  });

  it("infers enter and move parents from the sibling", async () => {
    const anchor = document.createElement("div");
    const entered = document.createElement("div");
    const moved = document.createElement("div");

    host.append(anchor, moved);

    await $animate.enter(entered, undefined, anchor, { duration: 0 }).finished;
    await $animate.move(moved, undefined, entered, { duration: 0 }).finished;

    expect(Array.from(host.children)).toEqual([anchor, entered, moved]);
  });

  it("applies class changes directly", async () => {
    const child = createElementFromHTML('<div animate="fade"></div>');

    host.append(child);

    await $animate.addClass(child, "active", { duration: 1 }).finished;
    expect(child.classList.contains("active")).toBe(true);

    await $animate.removeClass(child, "active", { duration: 1 }).finished;
    expect(child.classList.contains("active")).toBe(false);
  });

  it("applies combined class changes directly", async () => {
    const child = createElementFromHTML(
      '<div animate="fade" class="old keep"></div>',
    );

    host.append(child);

    await $animate.setClass(child, "new extra", "old", { duration: 1 })
      .finished;

    expect(child.classList.contains("new")).toBe(true);
    expect(child.classList.contains("extra")).toBe(true);
    expect(child.classList.contains("old")).toBe(false);
    expect(child.classList.contains("keep")).toBe(true);
  });

  it("runs inline keyframe animations with final styles", async () => {
    const child = createElementFromHTML('<div animate="fade"></div>');

    host.append(child);

    await $animate.animate(
      child,
      { opacity: "0" },
      { opacity: "1", color: "red" },
      undefined,
      { duration: 1 },
    ).finished;

    expect(child.style.opacity).toBe("1");
    expect(child.style.color).toBe("red");
  });

  it("supports style-only animations without a named preset or to styles", async () => {
    const child = createElementFromHTML('<div animate="false"></div>');

    host.append(child);

    await $animate.animate(
      child,
      { opacity: "0" },
      undefined,
      "running highlighted",
      { duration: 1 },
    ).finished;

    expect(child.style.opacity).toBe("0");
    expect(child.classList.contains("running")).toBe(true);
    expect(child.classList.contains("highlighted")).toBe(true);
  });

  it("runs CSS custom property enter animations", async () => {
    style.textContent = `
      @keyframes css-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .css-fade {
        --ng-enter-animation: css-fade-in 20ms linear both;
      }
    `;

    const child = createElementFromHTML(
      '<div class="css-fade" data-animate="css-fade"></div>',
    );

    let started = false;

    child.addEventListener("animationstart", () => {
      started = true;
    });

    await $animate.enter(child, host, null).finished;

    expect(started).toBe(true);
    expect(child.style.animation).toBe("");
  });

  it("lets CSS custom properties override built-in presets", async () => {
    style.textContent = `
      @keyframes css-built-in-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .css-fade {
        --ng-enter-animation: css-built-in-fade 20ms linear both;
      }
    `;

    const child = createElementFromHTML(
      '<div class="css-fade" data-animate="fade"></div>',
    );

    let animationName;

    child.addEventListener("animationstart", (event) => {
      animationName = event.animationName;
    });

    await $animate.enter(child, host, null).finished;

    expect(animationName).toBe("css-built-in-fade");
  });

  it("keeps registered presets ahead of CSS custom properties", async () => {
    style.textContent = `
      @keyframes css-registered-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .css-fade {
        --ng-enter-animation: css-registered-fade 20ms linear both;
      }
    `;

    const child = createElementFromHTML(
      '<div class="css-fade" data-animate="registered-fade"></div>',
    );

    let cssStarted = false;

    child.addEventListener("animationstart", () => {
      cssStarted = true;
    });
    $animate.define("registered-fade", {
      enter: [{ opacity: 0.2 }, { opacity: 1 }],
    });

    await $animate.enter(child, host, null, { duration: 1 }).finished;

    expect(cssStarted).toBe(false);
  });

  it("runs CSS custom property leave animations before removal", async () => {
    style.textContent = `
      @keyframes css-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }

      .css-fade {
        --ng-leave-animation: css-fade-out 20ms linear both;
      }
    `;

    const child = createElementFromHTML(
      '<div class="css-fade" data-animate="css-fade"></div>',
    );

    let started = false;

    child.addEventListener("animationstart", () => {
      started = true;
    });
    host.append(child);

    await $animate.leave(child, { duration: 1 }).finished;

    expect(started).toBe(true);
    expect(host.firstElementChild).toBeNull();
  });

  it("switches from CSS enter to leave when animations overlap", async () => {
    style.textContent = `
      @keyframes css-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes css-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }

      .css-fade {
        --ng-enter-animation: css-fade-in 80ms linear both;
        --ng-leave-animation: css-fade-out 80ms linear both;
      }
    `;

    const child = createElementFromHTML('<div class="css-fade" animate></div>');

    const started = [];

    child.addEventListener("animationstart", (event) => {
      started.push(event.animationName);
    });

    $animate.enter(child, host, null);
    await wait(20);
    await $animate.leave(child).finished;

    expect(started).toContain("css-fade-out");
    expect(started[started.length - 1]).toBe("css-fade-out");
    expect(host.firstElementChild).toBeNull();
  });

  it("supports named JavaScript animation presets", async () => {
    const child = createElementFromHTML('<div animate="instant"></div>');

    let called = false;

    $animate.define("instant", {
      enter(element) {
        called = true;
        element.setAttribute("data-animated", "true");
      },
    });

    host.append(child);
    await $animate.enter(child, host, null).finished;

    expect(called).toBe(true);
    expect(child.getAttribute("data-animated")).toBe("true");
  });

  it("resolves injectable animation presets once", async () => {
    const registeredHost = document.createElement("div");
    const angular = new Angular();
    let factoryCalls = 0;

    angular.module("cached-animations", []).animation("cached", () => {
      factoryCalls += 1;

      return { enter: [{ opacity: 0 }, { opacity: 1 }] };
    });
    document.body.append(registeredHost);
    angular.bootstrap(registeredHost, ["cached-animations"]).invoke([
      "$animate",
      (_$animate_) => {
        $animate = _$animate_;
      },
    ]);

    await $animate.enter(
      createElementFromHTML('<div animate="cached"></div>'),
      registeredHost,
      null,
      { duration: 1 },
    ).finished;
    await $animate.enter(
      createElementFromHTML('<div animate="cached"></div>'),
      registeredHost,
      null,
      { duration: 1 },
    ).finished;

    expect(factoryCalls).toBe(1);
    dealoc(registeredHost);
    registeredHost.remove();
  });

  it("ships built-in presets through angular-animate.css", async () => {
    const child = createElementFromHTML('<div animate="scale"></div>');

    host.append(child);
    spyOn(child, "animate").and.callThrough();

    let animationName;

    child.addEventListener("animationstart", (event) => {
      animationName = event.animationName;
    });

    await $animate.enter(child, host, null).finished;

    expect(animationName).toBe("ng-scale-enter");
    expect(child.animate).not.toHaveBeenCalled();
  });

  it("supports CSS built-in presets selected through options", async () => {
    const child = createElementFromHTML("<div></div>");

    host.append(child);

    let animationName;

    child.addEventListener("animationstart", (event) => {
      animationName = event.animationName;
    });

    await $animate.enter(child, host, null, { animation: "scale" }).finished;

    expect(animationName).toBe("ng-scale-enter");
    expect(child.classList.contains("ng-animate-preset-scale")).toBe(false);
  });

  it("animates auto-height presets with cleanup", async () => {
    const child = createElementFromHTML(
      '<div animate="collapse" style="height: 40px">content</div>',
    );

    host.append(child);
    spyOn(child, "animate").and.callThrough();

    const handle = $animate.leave(child, { duration: 20 });
    const animation = child.getAnimations()[0];

    expect(animation.animationName).toBe("ng-auto-height-leave");
    expect(child.style.getPropertyValue("--ng-animate-auto-height")).toBe(
      "40px",
    );
    expect(animation.effect.getTiming().duration).toBe(20);

    await handle.finished;

    expect(child.animate).not.toHaveBeenCalled();
    expect(child.style.getPropertyValue("--ng-animate-auto-height")).toBe("");
    expect(child.style.height).toBe("40px");
  });

  it("measures auto-height entry and restores an existing custom property", async () => {
    const child = createElementFromHTML(
      '<div animate="expand" style="--ng-animate-auto-height: 12px">content</div>',
    );

    Object.defineProperty(child, "scrollHeight", { value: 48 });

    const handle = $animate.enter(child, host, null);

    expect(child.style.getPropertyValue("--ng-animate-auto-height")).toBe(
      "48px",
    );
    await handle.finished;
    expect(child.style.getPropertyValue("--ng-animate-auto-height")).toBe(
      "12px",
    );
  });

  it("falls back to scroll height when leave layout height is zero", async () => {
    const child = createElementFromHTML(
      '<div animate="collapse">content</div>',
    );

    Object.defineProperty(child, "offsetHeight", { value: 0 });
    Object.defineProperty(child, "scrollHeight", { value: 36 });
    host.append(child);

    const handle = $animate.leave(child);

    expect(child.style.getPropertyValue("--ng-animate-auto-height")).toBe(
      "36px",
    );
    await handle.finished;
  });

  it("runs updates directly when view transitions are unavailable", async () => {
    const original = Object.getOwnPropertyDescriptor(
      document,
      "startViewTransition",
    );
    let updated = false;

    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: undefined,
    });
    await $animate.transition(async () => {
      await Promise.resolve();
      updated = true;
    });

    expect(updated).toBe(true);

    if (original) {
      Object.defineProperty(document, "startViewTransition", original);
    } else {
      Reflect.deleteProperty(document, "startViewTransition");
    }
  });

  it("waits for native view transitions", async () => {
    const original = Object.getOwnPropertyDescriptor(
      document,
      "startViewTransition",
    );
    const calls = [];

    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value(update) {
        calls.push("start");
        update();

        return {
          finished: Promise.resolve().then(() => calls.push("finished")),
        };
      },
    });

    await $animate.transition(() => calls.push("update"));

    expect(calls).toEqual(["start", "update", "finished"]);

    if (original) {
      Object.defineProperty(document, "startViewTransition", original);
    } else {
      Reflect.deleteProperty(document, "startViewTransition");
    }
  });

  it("runs lifecycle callbacks and removes temporary classes", async () => {
    const child = createElementFromHTML('<div animate="fade"></div>');

    const events = [];

    host.append(child);

    await $animate.enter(child, host, null, {
      duration: 1,
      tempClasses: "is-animating",
      onStart(element, context) {
        events.push(`start:${context.phase}:${element.className}`);
      },
      onDone(element, context) {
        events.push(`done:${context.phase}:${element.className}`);
      },
    }).finished;

    expect(events).toEqual(["start:enter:is-animating", "done:enter:"]);
    expect(child.classList.contains("is-animating")).toBe(false);
  });

  it("runs cancel callbacks for cancelled animations", async () => {
    const child = createElementFromHTML('<div animate="fade"></div>');

    const events = [];

    host.append(child);

    const handle = $animate.enter(child, host, null, {
      duration: 1000,
      onCancel(element, context) {
        events.push(`cancel:${context.phase}:${element === child}`);
      },
    });

    handle.cancel();
    await wait(10);

    expect(events).toEqual(["cancel:enter:true"]);
  });

  it("skips animations for reduced motion by default", async () => {
    spyOn(window, "matchMedia").and.returnValue({ matches: true });

    const child = createElementFromHTML('<div animate="fade"></div>');

    host.append(child);
    spyOn(child, "animate").and.callThrough();

    await $animate.enter(child, host, null).finished;

    expect(child.animate).not.toHaveBeenCalled();
  });

  it("does not allow animation options to override reduced-motion preference", async () => {
    spyOn(window, "matchMedia").and.returnValue({ matches: true });

    const child = createElementFromHTML('<div animate="fade"></div>');

    host.append(child);
    spyOn(child, "animate").and.callThrough();

    await $animate.enter(child, host, null, {
      duration: 1,
      animation: "scale",
    }).finished;

    expect(child.animate).not.toHaveBeenCalled();
  });

  it("supports module registration without class selectors", async () => {
    const registeredHost = document.createElement("div");

    const angular = new Angular();

    angular.module("animations", []).animation("registered", () => ({
      enter(element) {
        element.setAttribute("data-registered", "true");
      },
    }));

    document.body.append(registeredHost);

    angular.bootstrap(registeredHost, ["animations"]).invoke([
      "$animate",
      (_$animate_) => {
        $animate = _$animate_;
      },
    ]);

    const child = createElementFromHTML('<div animate="registered"></div>');

    await $animate.enter(child, registeredHost, null).finished;

    expect(child.getAttribute("data-registered")).toBe("true");

    dealoc(registeredHost);
    registeredHost.remove();
  });

  it("cancels active native animations", async () => {
    const child = createElementFromHTML('<div animate="fade"></div>');

    host.append(child);

    const handle = $animate.enter(child, host, null, { duration: 1000 });

    let status;

    handle.done((ok) => {
      status = ok;
    });
    $animate.cancel(handle);
    await wait(10);

    expect(status).toBe(false);
  });
});

describe("class mutation helpers", () => {
  function splitClasses(className) {
    const trimmed = className.trim();

    return trimmed ? trimmed.split(/\s+/) : [];
  }

  it("applies class changes directly when animation is not enabled", () => {
    const element = document.createElement("div");
    const getAnimate = () => {
      throw new Error("animation should not be requested");
    };

    addClassHelper(element, "first extra", getAnimate);
    expect(element.classList.contains("first")).toBe(true);
    expect(element.classList.contains("extra")).toBe(true);

    updateClassHelper(element, "first second", "first third", getAnimate);
    expect(element.classList.contains("first")).toBe(true);
    expect(element.classList.contains("second")).toBe(true);
    expect(element.classList.contains("third")).toBe(false);

    removeClassHelper(element, "second extra", getAnimate);
    expect(element.classList.contains("second")).toBe(false);
    expect(element.classList.contains("extra")).toBe(false);
  });

  it("routes class changes through the matching animation phases", () => {
    const element = createElementFromHTML(
      '<div animate="fade" class="old keep"></div>',
    );
    const calls = [];
    const animate = {
      addClass(target, className) {
        calls.push(["addClass", className]);
        target.classList.add(...splitClasses(className));
      },
      removeClass(target, className) {
        calls.push(["removeClass", className]);
        target.classList.remove(...splitClasses(className));
      },
      setClass(target, add, remove) {
        calls.push(["setClass", add, remove]);
        target.classList.add(...splitClasses(add));
        target.classList.remove(...splitClasses(remove));
      },
    };
    const getAnimate = () => animate;

    addClassHelper(element, "added", getAnimate);
    removeClassHelper(element, "added", getAnimate);
    updateClassHelper(element, "keep next", "keep old", getAnimate);
    setClassHelper(element, "direct", "next", getAnimate);

    expect(calls).toEqual([
      ["addClass", "added"],
      ["removeClass", "added"],
      ["setClass", "next", "old"],
      ["setClass", "direct", "next"],
    ]);
    expect(element.classList.contains("old")).toBe(false);
    expect(element.classList.contains("direct")).toBe(true);
    expect(element.classList.contains("next")).toBe(false);
  });
});
