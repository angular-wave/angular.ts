// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { createElementFromHTML, dealoc } from "../shared/dom.ts";
import { wait } from "../shared/test-utils.ts";

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

    angular.bootstrap(host, []).invoke((_$animate_) => {
      $animate = _$animate_;
    });
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

  it("applies class changes directly", async () => {
    const child = createElementFromHTML('<div animate="fade"></div>');

    host.append(child);

    await $animate.addClass(child, "active", { duration: 1 }).finished;
    expect(child.classList.contains("active")).toBe(true);

    await $animate.removeClass(child, "active", { duration: 1 }).finished;
    expect(child.classList.contains("active")).toBe(false);
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

    await $animate.leave(child).finished;

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

    await $animate.leave(child, { duration: 1 }).finished;

    const keyframes = child.animate.calls.mostRecent().args[0];

    expect(keyframes[0].height).toBe("40px");
    expect(keyframes[1].height).toBe("0px");
    expect(child.style.height).toBe("40px");
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

  it("supports provider registration without class selectors", async () => {
    const registeredHost = document.createElement("div");

    const angular = new Angular();

    angular.module("animations", []).animation("registered", () => ({
      enter(element) {
        element.setAttribute("data-registered", "true");
      },
    }));

    document.body.append(registeredHost);

    angular.bootstrap(registeredHost, ["animations"]).invoke((_$animate_) => {
      $animate = _$animate_;
    });

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
