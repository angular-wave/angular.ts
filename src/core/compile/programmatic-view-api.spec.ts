// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { addElementDisposer, dealoc } from "../../shared/dom.ts";
import {
  attrs,
  each,
  event,
  props,
  tag,
  tagNS,
  tags,
} from "./programmatic-view.ts";

describe("programmatic view API", () => {
  let host: HTMLElement;
  let moduleIndex = 0;

  beforeEach(() => {
    host = document.createElement("main");
    document.body.appendChild(host);
  });

  afterEach(() => {
    dealoc(host);
    host.remove();
  });

  function bootstrap(
    html: string,
    register: (module: ng.IModule) => void,
  ): ng.InjectorService {
    new Angular();
    const name = `programmaticViewApiSpec${moduleIndex++}`;
    const module = window.angular.createModule(name, ["ng"]);

    register(module);
    host.innerHTML = html;

    return window.angular.bootstrap(host, [name]);
  }

  function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 32));
  }

  it("creates named HTML and namespaced elements", () => {
    const keyed = each(
      () => [1],
      (value) => value,
      (value) => String(value()),
    );
    const emptyKeyed = each(
      () => null,
      (value) => value,
      () => null,
    );

    expect(tag("my-widget").localName).toBe("my-widget");
    expect(tagNS("http://www.w3.org/2000/svg", "circle").namespaceURI).toBe(
      "http://www.w3.org/2000/svg",
    );
    expect(keyed()).toEqual(["1"]);
    expect(emptyKeyed()).toEqual([]);
    expect(Reflect.get(tags, "then")).toBeUndefined();
    expect(
      Reflect.get(tags("http://www.w3.org/2000/svg"), "then"),
    ).toBeUndefined();
  });

  it("supports cancellable element-owned cleanup", () => {
    const element = document.createElement("div");
    const cancelled = jasmine.createSpy("cancelled");
    const active = jasmine.createSpy("active");
    const cancel = addElementDisposer(element, cancelled);

    addElementDisposer(element, active);
    cancel();
    dealoc(element);
    dealoc(element);

    expect(cancelled).not.toHaveBeenCalled();
    expect(active).toHaveBeenCalledTimes(1);
  });

  it("supports object listeners and explicit removal semantics", () => {
    const handleEvent = jasmine.createSpy("handleEvent");
    const listener = event({ handleEvent });
    const element = tags.div(
      attrs({ hidden: null, inert: false, itemscope: true }),
    );
    const value = new Event("activate");

    listener.call(element, value);

    expect(handleEvent).toHaveBeenCalledOnceWith(value);
    expect(element.hasAttribute("hidden")).toBeFalse();
    expect(element.hasAttribute("inert")).toBeFalse();
    expect(element.getAttribute("itemscope")).toBe("");
  });

  it("reports assignments to read-only explicit properties", () => {
    expect(() => tags.input(props({ form: "immutable" }))).toThrowError(
      "DOM property 'form' cannot be assigned.",
    );
  });

  it("omits false children and moves existing nodes", () => {
    const node = document.createElement("span");
    const source = document.createElement("div");

    source.appendChild(node);
    const target = tags.div([false, null, undefined, node]);

    expect(target.childNodes.length).toBe(1);
    expect(target.firstChild).toBe(node);
    expect(source.childNodes.length).toBe(0);
  });

  it("supports reactive readers, literal properties, and event bindings", async () => {
    let context;
    const clicks = jasmine.createSpy("clicks");
    const callback = jasmine.createSpy("callback");

    bootstrap("<binding-view></binding-view>", (module) => {
      module.component("bindingView", {
        view: (value) => {
          context = value;
          value.scope.label = "first";

          return tags.button(
            {
              ...attrs({
                "aria-hidden": false,
                "data-label": () => value.scope.label,
              }),
              ...props({ callback }),
              class: () => value.scope.label,
              customValue: () => value.scope.label,
              activate: event(clicks, { once: true }),
            },
            () => value.scope.label,
          );
        },
      });
    });

    const button = host.querySelector("button") as HTMLButtonElement & {
      callback: typeof callback;
      customValue: string;
    };

    expect(button.getAttribute("data-label")).toBe("first");
    expect(button.className).toBe("first");
    expect(button.getAttribute("aria-hidden")).toBe("false");
    expect(button.callback).toBe(callback);
    expect(callback).not.toHaveBeenCalled();
    expect(button.customValue).toBe("first");
    expect(button.textContent).toBe("first");

    button.dispatchEvent(new Event("activate"));
    button.dispatchEvent(new Event("activate"));
    expect(clicks).toHaveBeenCalledTimes(1);

    context.scope.label = "second";
    await settle();

    expect(button.getAttribute("data-label")).toBe("second");
    expect(button.className).toBe("second");
    expect(button.customValue).toBe("second");
    expect(button.textContent).toBe("second");
  });

  it("retains keyed nodes across reorders and replaces changed identities", async () => {
    let context;
    const first = { id: 1, label: "one" };
    const second = { id: 2, label: "two" };

    bootstrap("<keyed-view></keyed-view>", (module) => {
      module.component("keyedView", {
        view: (value) => {
          context = value;
          value.scope.items = [first, second];

          return tags.ul(
            each(
              () => value.scope.items,
              (item) => item.id,
              (item) =>
                tags.li({ "data-id": () => item().id }, () => item().label),
            ),
          );
        },
      });
    });

    const initial = Array.from(host.querySelectorAll("li"));

    context.scope.items = [second, first];
    await settle();

    const reordered = Array.from(host.querySelectorAll("li"));
    expect(reordered).toEqual([initial[1], initial[0]]);

    context.scope.items.push({ id: 3, label: "three" });
    await settle();
    expect(host.querySelectorAll("li").length).toBe(3);

    const third = host.querySelectorAll("li")[2];

    context.scope.items[0] = context.scope.items[2];
    context.scope.items[2] = second;
    await settle();
    expect(Array.from(host.querySelectorAll("li"))).toEqual([
      third,
      initial[0],
      initial[1],
    ]);

    context.scope.items.splice(1, 1);
    await settle();
    expect(Array.from(host.querySelectorAll("li"))).toEqual([
      third,
      initial[1],
    ]);

    const list = host.querySelector("ul");
    const insertBefore = spyOn(list, "insertBefore").and.callThrough();

    context.scope.items = [{ id: 3, label: "three" }, second];
    await settle();
    expect(insertBefore).not.toHaveBeenCalled();

    context.scope.items = [
      { id: 3, label: "three" },
      { id: 2, label: "replacement" },
    ];
    await settle();

    const replaced = Array.from(host.querySelectorAll("li"));
    expect(replaced[0]).toBe(third);
    expect(replaced[1]).toBe(initial[1]);
    expect(replaced[1].textContent).toBe("replacement");

    context.scope.items = null;
    await settle();
    expect(host.querySelectorAll("li").length).toBe(0);

    context.scope.items = [first];
    await settle();

    const walker = document.createTreeWalker(host, NodeFilter.SHOW_COMMENT);
    let anchor;

    while ((anchor = walker.nextNode())) {
      if (anchor.data === "ng-view-each") break;
    }

    anchor.remove();
    context.scope.items = [];
    await settle();

    context.scope.destroy();
    dealoc(context.host);
    context.host.remove();
  });

  it("rejects duplicate keyed items without replacing existing DOM", async () => {
    let context;
    const errors: unknown[] = [];

    bootstrap("<duplicate-view></duplicate-view>", (module) => {
      module
        .decorator("$exceptionHandler", () => (error) => errors.push(error))
        .component("duplicateView", {
          view: (value) => {
            context = value;
            value.scope.items = [{ id: 1 }];
            return tags.div(
              each(
                () => value.scope.items,
                (item) => item.id,
                (item) => tags.span(() => String(item().id)),
              ),
            );
          },
        });
    });

    const original = host.querySelector("span");

    context.scope.items = [{ id: 1 }, { id: 1 }];
    await settle();

    expect(host.querySelector("span")).toBe(original);
    expect(errors[0].message).toBe("Duplicate programmatic view key '1'.");
  });

  it("preserves keyed DOM when a staged renderer fails", async () => {
    let context;
    const errors: unknown[] = [];

    bootstrap("<transactional-view></transactional-view>", (module) => {
      module
        .decorator("$exceptionHandler", () => (error) => errors.push(error))
        .component("transactionalView", {
          view: (value) => {
            context = value;
            value.scope.items = [{ id: 1, label: "stable" }];
            return tags.div(
              each(
                () => value.scope.items,
                (item) => item.id,
                (item) => {
                  if (item().id === 2) throw new Error("render failed");
                  return tags.span(() => item().label);
                },
              ),
            );
          },
        });
    });

    const original = host.querySelector("span");

    context.scope.items = [{ id: 2, label: "replacement" }];
    await settle();

    expect(host.querySelector("span")).toBe(original);
    expect(original.textContent).toBe("stable");
    expect(errors[0].message).toBe("render failed");

    context.scope.items = [{ id: 3, label: "committed" }];
    await settle();

    expect(host.querySelector("span")).not.toBe(original);
    expect(host.textContent).toBe("committed");
    expect(errors.length).toBe(1);
  });

  it("routes programmatic event errors through the exception handler", () => {
    const errors: unknown[] = [];
    const handled = jasmine.createSpy("handled");
    const blurred = jasmine.createSpy("blurred");

    bootstrap("<event-error-view></event-error-view>", (module) => {
      module
        .decorator("$exceptionHandler", () => (error) => errors.push(error))
        .component("eventErrorView", {
          view: () =>
            tags.button(
              {
                onClick: () => {
                  throw new Error("event failed");
                },
                onfocus: { handleEvent: handled },
                onblur: event(blurred),
                once: "ordinary-property",
              },
              "trigger",
            ),
        });
    });

    const button = host.querySelector("button");

    button.click();
    button.dispatchEvent(new Event("focus"));
    button.dispatchEvent(new Event("blur"));

    expect(button.getAttribute("once")).toBe("ordinary-property");
    expect(errors[0].message).toBe("event failed");
    expect(handled).toHaveBeenCalledTimes(1);
    expect(blurred).toHaveBeenCalledTimes(1);
  });

  it("omits false reactive children", async () => {
    let context;

    bootstrap("<false-child-view></false-child-view>", (module) => {
      module.component("falseChildView", {
        view: (value) => {
          context = value;
          value.scope.visible = "shown";
          return tags.div(() => value.scope.visible);
        },
      });
    });

    expect(host.querySelector("div").textContent).toBe("shown");

    context.scope.visible = false;
    await settle();

    expect(host.querySelector("div").textContent).toBe("");
  });

  it("sanitizes deferred static HTML properties", () => {
    const errors: unknown[] = [];

    bootstrap("<static-html-view></static-html-view>", (module) => {
      module
        .decorator("$exceptionHandler", () => (error) => errors.push(error))
        .component("staticHtmlView", {
          view: () =>
            tags.div(props({ innerHTML: '<img src="x" onerror="alert(1)">' })),
        });
    });

    expect(host.querySelector("img")).toBeNull();
    expect(errors.length).toBe(1);
  });

  it("applies trusted deferred static HTML properties", () => {
    bootstrap("<div trusted-static></div>", (module) => {
      module.directive("trustedStatic", [
        "$sce",
        ($sce) => ({
          view: () =>
            tags.div(
              props({
                innerHTML: $sce.trustAsHtml("<strong>trusted</strong>"),
              }),
            ),
        }),
      ]);
    });

    expect(host.querySelector("strong").textContent).toBe("trusted");
  });

  it("routes deferred static assignment failures", () => {
    const errors: unknown[] = [];
    const invalid = {
      toString() {
        throw new Error("static assignment failed");
      },
    };

    bootstrap("<static-failure-view></static-failure-view>", (module) => {
      module
        .decorator("$exceptionHandler", () => (error) => errors.push(error))
        .component("staticFailureView", {
          view: () => tags.iframe(props({ srcdoc: invalid })),
        });
    });

    expect(errors[0].message).toContain("$sce:unsafe");
  });

  it("routes deferred read-only property failures", () => {
    const errors: unknown[] = [];
    const name = "readonly-html-view-test";

    if (!customElements.get(name)) {
      customElements.define(
        name,
        class extends HTMLElement {
          constructor() {
            super();
            Object.defineProperty(this, "innerHTML", {
              value: "",
              writable: false,
            });
          }
        },
      );
    }

    bootstrap("<div readonly-static></div>", (module) => {
      module
        .decorator("$exceptionHandler", () => (error) => errors.push(error))
        .directive("readonlyStatic", [
          "$sce",
          ($sce) => ({
            view: () =>
              tag(
                name,
                props({ innerHTML: $sce.trustAsHtml("<b>trusted</b>") }),
              ),
          }),
        ]);
    });

    expect(errors[0].message).toBe(
      "DOM property 'innerHTML' cannot be assigned.",
    );
  });

  it("runs active cleanup once and permits cancellation", () => {
    const active = jasmine.createSpy("active");
    const cancelled = jasmine.createSpy("cancelled");
    const late = jasmine.createSpy("late");
    let context;
    let cancelActive;

    bootstrap("<cleanup-view></cleanup-view>", (module) => {
      module.component("cleanupView", {
        view: (value) => {
          context = value;
          cancelActive = value.onDestroy(active);
          const cancel = value.onDestroy(cancelled);

          cancel();
          cancel();
          return tags.span("alive");
        },
      });
    });

    context.scope.destroy();
    context.scope.destroy();
    dealoc(context.host.querySelector("span"));
    cancelActive();
    cancelActive();
    context.onDestroy(late)();

    expect(active).toHaveBeenCalledTimes(1);
    expect(cancelled).not.toHaveBeenCalled();
    expect(late).toHaveBeenCalledTimes(1);
  });

  it("routes cleanup failures through the exception handler", () => {
    const errors: unknown[] = [];
    let context;

    bootstrap("<failing-cleanup></failing-cleanup>", (module) => {
      module
        .decorator("$exceptionHandler", () => (error) => errors.push(error))
        .component("failingCleanup", {
          view: (value) => {
            context = value;
            value.onDestroy(() => {
              throw new Error("cleanup failed");
            });
            return null;
          },
        });
    });

    context.scope.destroy();
    context.onDestroy(() => {
      throw new Error("late cleanup failed");
    });

    expect(errors[0].message).toBe("cleanup failed");
    expect(errors[1].message).toBe("late cleanup failed");
  });

  it("owns null-view cleanup through the host fragment", () => {
    const cleanup = jasmine.createSpy("cleanup");
    let context;

    bootstrap("<div host-cleanup></div>", (module) => {
      module.directive("hostCleanup", () => ({
        view: (value) => {
          context = value;
          value.onDestroy(cleanup);
          return null;
        },
      }));
    });

    dealoc(context.host);
    context.host.remove();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("validates cleanup callbacks", () => {
    expect(() => {
      bootstrap("<invalid-cleanup></invalid-cleanup>", (module) => {
        module.component("invalidCleanup", {
          view: ({ onDestroy }) => {
            onDestroy(null);
            return null;
          },
        });
      });
    }).toThrowError("Programmatic view cleanup must be a function.");
  });
});
