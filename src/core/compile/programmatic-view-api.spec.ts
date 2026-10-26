import type { ProgrammaticViewProperties } from "./programmatic-view.ts";
import { defined, instance } from "../../shared/test-fixtures.spec.ts";
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { addElementDisposer, dealoc } from "../../shared/dom.ts";
import * as viewFactories from "./programmatic-view.ts";
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
    register: (module: ng.NgModule) => void,
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
    const emptyKeyed = each<never>(
      () => null,
      (value) => value,
      () => null,
    );

    expect(tag("my-widget").localName).toBe("my-widget");
    expect(tagNS("http://www.w3.org/2000/svg", "circle").namespaceURI).toBe(
      "http://www.w3.org/2000/svg",
    );
    expect<unknown>(keyed()).toEqual(["1"]);
    expect<unknown>(emptyKeyed()).toEqual([]);
    expect(Reflect.get(tags, "then")).toBeUndefined();
    expect(
      Reflect.get(tags("http://www.w3.org/2000/svg"), "then"),
    ).toBeUndefined();
  });

  it("creates legacy elements through tag without obsolete named exports", () => {
    for (const name of ["applet", "blink", "font"]) {
      expect(Object.hasOwn(viewFactories, name)).toBeFalse();

      const element = tag(name, attrs({ "data-legacy": name }), "content");

      expect(element.localName).toBe(name);
      expect(element.getAttribute("data-legacy")).toBe(name);
      expect(element.textContent).toBe("content");
    }
  });

  it("supports cancellable element-owned cleanup", () => {
    const element = document.createElement("div");
    const cancelled = jasmine.createSpy<() => void>("cancelled");
    const active = jasmine.createSpy<() => void>("active");
    const cancel = addElementDisposer(element, cancelled);

    addElementDisposer(element, active);
    cancel();
    dealoc(element);
    dealoc(element);

    expect(cancelled).not.toHaveBeenCalled();
    expect(active).toHaveBeenCalledTimes(1);
  });

  it("supports object listeners and explicit removal semantics", () => {
    const handleEvent =
      jasmine.createSpy<(event: Event) => void>("handleEvent");
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
    let context: ViewContext | undefined;
    const clicks = jasmine.createSpy<(event: Event) => void>("clicks");
    const callback = jasmine.createSpy<() => void>("callback");

    bootstrap("<binding-view></binding-view>", (module) => {
      module.component("bindingView", {
        view: (value: ViewContext) => {
          context = value;
          value.scope.label = "first";

          const bindings: ProgrammaticViewProperties<
            HTMLButtonElement & { customValue: string }
          > & { activate: EventListener } = {
            ...attrs({
              "aria-hidden": false,
              "data-label": () => value.scope.label,
            }),
            ...props({ callback }),
            class: () => value.scope.label,
            customValue: () => value.scope.label,
            activate: event(clicks, { once: true }),
          };
          return tags.button(bindings, () => value.scope.label);
        },
      });
    });

    const button = defined(host.querySelector("button"));

    expect(button.getAttribute("data-label")).toBe("first");
    expect(button.className).toBe("first");
    expect(button.getAttribute("aria-hidden")).toBe("false");
    expect(Reflect.get(button, "callback")).toBe(callback);
    expect(callback).not.toHaveBeenCalled();
    expect(Reflect.get(button, "customValue")).toBe("first");
    expect(button.textContent).toBe("first");

    button.dispatchEvent(new Event("activate"));
    button.dispatchEvent(new Event("activate"));
    expect(clicks).toHaveBeenCalledTimes(1);

    defined(context).scope.label = "second";
    await settle();

    expect(button.getAttribute("data-label")).toBe("second");
    expect(button.className).toBe("second");
    expect(Reflect.get(button, "customValue")).toBe("second");
    expect(button.textContent).toBe("second");
  });

  it("retains keyed nodes across reorders and replaces changed identities", async () => {
    let context: ViewContext | undefined;
    const first = { id: 1, label: "one" };
    const second = { id: 2, label: "two" };

    bootstrap("<keyed-view></keyed-view>", (module) => {
      module.component("keyedView", {
        view: (value: ViewContext) => {
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

    defined(context).scope.items = [second, first];
    await settle();

    const reordered = Array.from(host.querySelectorAll("li"));
    expect(reordered).toEqual([initial[1], initial[0]]);

    defined(defined(context).scope.items).push({ id: 3, label: "three" });
    await settle();
    expect(host.querySelectorAll("li").length).toBe(3);

    const third = host.querySelectorAll("li")[2];

    defined(defined(context).scope.items)[0] = defined(
      defined(context).scope.items,
    )[2];
    defined(defined(context).scope.items)[2] = second;
    await settle();
    expect(Array.from(host.querySelectorAll("li"))).toEqual([
      third,
      initial[0],
      initial[1],
    ]);

    defined(defined(context).scope.items).splice(1, 1);
    await settle();
    expect(Array.from(host.querySelectorAll("li"))).toEqual([
      third,
      initial[1],
    ]);

    const list = host.querySelector("ul");
    const insertBefore = spyOn(defined(list), "insertBefore").and.callThrough();

    defined(context).scope.items = [{ id: 3, label: "three" }, second];
    await settle();
    expect(insertBefore).not.toHaveBeenCalled();

    defined(context).scope.items = [
      { id: 3, label: "three" },
      { id: 2, label: "replacement" },
    ];
    await settle();

    const replaced = Array.from(host.querySelectorAll("li"));
    expect(replaced[0]).toBe(third);
    expect(replaced[1]).toBe(initial[1]);
    expect(replaced[1].textContent).toBe("replacement");

    defined(context).scope.items = null;
    await settle();
    expect(host.querySelectorAll("li").length).toBe(0);

    defined(context).scope.items = [first];
    await settle();

    const walker = document.createTreeWalker(host, NodeFilter.SHOW_COMMENT);
    let anchor: Comment | undefined;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node instanceof Comment && node.data === "ng-view-each") {
        anchor = node;
        break;
      }
    }

    defined(anchor).remove();
    defined(context).scope.items = [];
    await settle();

    defined(context).scope.destroy();
    dealoc(defined(context).host);
    defined(context).host.remove();
  });

  it("rejects duplicate keyed items without replacing existing DOM", async () => {
    let context: ViewContext | undefined;
    const errors: unknown[] = [];

    bootstrap("<duplicate-view></duplicate-view>", (module) => {
      module
        .decorator(
          "$exceptionHandler",
          () => (error: unknown) => errors.push(error),
        )
        .component("duplicateView", {
          view: (value: ViewContext) => {
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

    defined(context).scope.items = [{ id: 1 }, { id: 1 }];
    await settle();

    expect(host.querySelector("span")).toBe(original);
    expect(instance(errors[0], Error).message).toBe(
      "Duplicate programmatic view key '1'.",
    );
  });

  it("preserves keyed DOM when a staged renderer fails", async () => {
    let context: ViewContext | undefined;
    const errors: unknown[] = [];

    bootstrap("<transactional-view></transactional-view>", (module) => {
      module
        .decorator(
          "$exceptionHandler",
          () => (error: unknown) => errors.push(error),
        )
        .component("transactionalView", {
          view: (value: ViewContext) => {
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

    defined(context).scope.items = [{ id: 2, label: "replacement" }];
    await settle();

    expect(host.querySelector("span")).toBe(original);
    expect(defined(original).textContent).toBe("stable");
    expect(instance(errors[0], Error).message).toBe("render failed");

    defined(context).scope.items = [{ id: 3, label: "committed" }];
    await settle();

    expect(host.querySelector("span")).not.toBe(original);
    expect(host.textContent).toBe("committed");
    expect(errors.length).toBe(1);
  });

  it("keeps keyed DOM identity and disposes removed items exactly once", async () => {
    let context: ViewContext | undefined;
    let nextId = 6;
    let seed = 0x51ced;
    const disposed = new Map<number, number>();

    bootstrap("<random-keyed-view></random-keyed-view>", (module) => {
      module.component("randomKeyedView", {
        view: (value: ViewContext) => {
          context = value;
          value.scope.items = Array.from({ length: 6 }, (_, id) => ({
            id,
            label: `item-${id}`,
          }));

          return tags.ul(
            each(
              () => value.scope.items,
              (item) => item.id,
              (item) => {
                const id = item().id;
                const element = tags.li(
                  attrs({ "data-id": () => item().id }),
                  () => item().label,
                );

                addElementDisposer(element, () => {
                  disposed.set(id, (disposed.get(id) ?? 0) + 1);
                });

                return element;
              },
            ),
          );
        },
      });
    });

    const nodes = new Map(
      Array.from(host.querySelectorAll("li"), (node) => [
        Number(node.dataset.id),
        node,
      ]),
    );
    const removed = new Set<number>();
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };

    for (let step = 0; step < 40; step++) {
      const items = defined(defined(context).scope.items).slice();
      const operation = Math.floor(random() * 6);

      if (operation === 0 || items.length === 0) {
        const id = nextId++;
        items.splice(Math.floor(random() * (items.length + 1)), 0, {
          id,
          label: `item-${id}`,
        });
      } else if (operation === 1) {
        const [item] = items.splice(Math.floor(random() * items.length), 1);
        removed.add(item.id);
      } else if (operation === 2) {
        const left = Math.floor(random() * items.length);
        const right = Math.floor(random() * items.length);
        [items[left], items[right]] = [items[right], items[left]];
      } else if (operation === 3) {
        items.reverse();
      } else if (operation === 4) {
        const index = Math.floor(random() * items.length);
        items[index] = { ...items[index], label: `changed-${step}` };
      } else {
        const index = Math.floor(random() * items.length);
        removed.add(items[index].id);
        const id = nextId++;
        items[index] = { id, label: `item-${id}` };
      }

      defined(context).scope.items = items;
      await settle();

      const rendered = Array.from(host.querySelectorAll("li"));
      expect(rendered.map((node) => Number(node.dataset.id)))
        .withContext(`step ${step}`)
        .toEqual(items.map((item) => item.id));
      expect(rendered.map((node) => node.textContent))
        .withContext(`step ${step}`)
        .toEqual(items.map((item) => defined(item.label)));

      rendered.forEach((node) => {
        const id = Number(node.dataset.id);
        const previous = nodes.get(id);

        if (previous) expect(node).withContext(`key ${id}`).toBe(previous);
        else nodes.set(id, node);
      });
    }

    removed.forEach((id) => {
      expect(disposed.get(id)).withContext(`key ${id}`).toBe(1);
    });
    expect(
      Array.from(disposed.values()).every((count) => count === 1),
    ).toBeTrue();
  });

  it("preserves keyed DOM when key selection fails", async () => {
    let context: ViewContext | undefined;
    const errors: unknown[] = [];

    bootstrap("<key-error-view></key-error-view>", (module) => {
      module
        .decorator(
          "$exceptionHandler",
          () => (error: unknown) => errors.push(error),
        )
        .component("keyErrorView", {
          view: (value: ViewContext) => {
            context = value;
            value.scope.items = [{ id: 1 }];

            return tags.div(
              each(
                () => value.scope.items,
                (item) => {
                  if (item.id === 2) throw new Error("key failed");
                  return item.id;
                },
                (item) => tags.span(() => String(item().id)),
              ),
            );
          },
        });
    });

    const original = host.querySelector("span");

    defined(context).scope.items = [{ id: 2 }];
    await settle();

    expect(host.querySelector("span")).toBe(original);
    expect(instance(errors[0], Error).message).toBe("key failed");
  });

  it("routes programmatic event errors through the exception handler", () => {
    const errors: unknown[] = [];
    const handled = jasmine.createSpy<(event: Event) => void>("handled");
    const blurred = jasmine.createSpy<(event: Event) => void>("blurred");

    bootstrap("<event-error-view></event-error-view>", (module) => {
      module
        .decorator(
          "$exceptionHandler",
          () => (error: unknown) => errors.push(error),
        )
        .component("eventErrorView", {
          view: () => {
            const bindings: ProgrammaticViewProperties<HTMLButtonElement> & {
              once: string;
            } = {
              onclick: () => {
                throw new Error("event failed");
              },
              onfocus: { handleEvent: handled },
              onblur: event(blurred),
              once: "ordinary-property",
            };
            return tags.button(bindings, "trigger");
          },
        });
    });

    const button = host.querySelector("button");

    defined(button).click();
    defined(button).dispatchEvent(new Event("focus"));
    defined(button).dispatchEvent(new Event("blur"));

    expect(defined(button).getAttribute("once")).toBe("ordinary-property");
    expect(instance(errors[0], Error).message).toBe("event failed");
    expect(handled).toHaveBeenCalledTimes(1);
    expect(blurred).toHaveBeenCalledTimes(1);
  });

  it("omits false reactive children", async () => {
    let context: ViewContext | undefined;

    bootstrap("<false-child-view></false-child-view>", (module) => {
      module.component("falseChildView", {
        view: (value: ViewContext) => {
          context = value;
          value.scope.visible = "shown";
          return tags.div(() => value.scope.visible);
        },
      });
    });

    expect(defined(host.querySelector("div")).textContent).toBe("shown");

    defined(context).scope.visible = false;
    await settle();

    expect(defined(host.querySelector("div")).textContent).toBe("");
  });

  it("sanitizes deferred static HTML properties", () => {
    const errors: unknown[] = [];

    bootstrap("<static-html-view></static-html-view>", (module) => {
      module
        .decorator(
          "$exceptionHandler",
          () => (error: unknown) => errors.push(error),
        )
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
      module
        .config({ $compile: { htmlPolicy: (html) => html } })
        .directive("trustedStatic", [
          () => ({
            view: () =>
              tags.div(
                props({
                  innerHTML: "<strong>trusted</strong>",
                }),
              ),
          }),
        ]);
    });

    expect(defined(host.querySelector("strong")).textContent).toBe("trusted");
  });

  it("validates static resource and link properties before insertion", () => {
    const errors: unknown[] = [];
    bootstrap("<static-url-view></static-url-view>", (module) => {
      module
        .decorator(
          "$exceptionHandler",
          () => (error: unknown) => errors.push(error),
        )
        .component("staticUrlView", {
          view: () =>
            tags.div(
              tags.a(props({ href: "javascript:alert(1)" }), "link"),
              tags.iframe(props({ src: "https://external.example/" })),
            ),
        });
    });
    expect(defined(host.querySelector("a")).getAttribute("href")).toBe(
      "unsafe:javascript:alert(1)",
    );
    expect(
      defined(host.querySelector("iframe")).getAttribute("src"),
    ).toBeNull();
    expect(
      errors.some((error: unknown) =>
        /insecurl/.test(instance(error, Error).message),
      ),
    ).toBeTrue();
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
        .decorator(
          "$exceptionHandler",
          () => (error: unknown) => errors.push(error),
        )
        .component("staticFailureView", {
          view: () => tags.iframe(props({ srcdoc: invalid })),
        });
    });

    expect(instance(errors[0], Error).message).toContain(
      "static assignment failed",
    );
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
        .decorator(
          "$exceptionHandler",
          () => (error: unknown) => errors.push(error),
        )
        .config({ $compile: { htmlPolicy: (html) => html } })
        .directive("readonlyStatic", [
          () => ({
            view: () => tag(name, props({ innerHTML: "<b>trusted</b>" })),
          }),
        ]);
    });

    expect(instance(errors[0], Error).message).toBe(
      "DOM property 'innerHTML' cannot be assigned.",
    );
  });

  it("runs active cleanup once and permits cancellation", () => {
    const active = jasmine.createSpy<() => void>("active");
    const cancelled = jasmine.createSpy<() => void>("cancelled");
    const late = jasmine.createSpy<() => void>("late");
    let context: ViewContext | undefined;
    let cancelActive: (() => void) | undefined;

    bootstrap("<cleanup-view></cleanup-view>", (module) => {
      module.component("cleanupView", {
        view: (value: ViewContext) => {
          context = value;
          cancelActive = value.onDestroy(active);
          const cancel = value.onDestroy(cancelled);

          cancel();
          cancel();
          return tags.span("alive");
        },
      });
    });

    defined(context).scope.destroy();
    defined(context).scope.destroy();
    dealoc(defined(context).host.querySelector("span"));
    defined(cancelActive)();
    defined(cancelActive)();
    defined(context).onDestroy(late)();

    expect(active).toHaveBeenCalledTimes(1);
    expect(cancelled).not.toHaveBeenCalled();
    expect(late).toHaveBeenCalledTimes(1);
  });

  it("routes cleanup failures through the exception handler", () => {
    const errors: unknown[] = [];
    let context: ViewContext | undefined;

    bootstrap("<failing-cleanup></failing-cleanup>", (module) => {
      module
        .decorator(
          "$exceptionHandler",
          () => (error: unknown) => errors.push(error),
        )
        .component("failingCleanup", {
          view: (value: ViewContext) => {
            context = value;
            value.onDestroy(() => {
              throw new Error("cleanup failed");
            });
            return null;
          },
        });
    });

    defined(context).scope.destroy();
    defined(context).onDestroy(() => {
      throw new Error("late cleanup failed");
    });

    expect(instance(errors[0], Error).message).toBe("cleanup failed");
    expect(instance(errors[1], Error).message).toBe("late cleanup failed");
  });

  it("owns null-view cleanup through the host fragment", () => {
    const cleanup = jasmine.createSpy<() => void>("cleanup");
    let context: ViewContext | undefined;

    bootstrap("<div host-cleanup></div>", (module) => {
      module.directive("hostCleanup", () => ({
        view: (value: ViewContext) => {
          context = value;
          value.onDestroy(cleanup);
          return null;
        },
      }));
    });

    dealoc(defined(context).host);
    defined(context).host.remove();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("validates cleanup callbacks", () => {
    expect(() => {
      bootstrap("<invalid-cleanup></invalid-cleanup>", (module) => {
        module.component("invalidCleanup", {
          view: ({ onDestroy }) => {
            // @ts-expect-error Deliberately invalid cleanup input tests runtime validation.
            onDestroy(null);
            return null;
          },
        });
      });
    }).toThrowError("Programmatic view cleanup must be a function.");
  });
});

interface FixtureScope extends ng.Scope {
  label?: string;
  href?: string;
  srcset?: string;
  state?: string | null;
  metadata?: Map<string, string>;
  child?: ng.ProgrammaticViewChild;
  value?: ng.ProgrammaticViewChild;
  visible?: string | boolean;
  items?: { id: number; label?: string }[] | null;
}
type ViewContext = ng.ProgrammaticViewContext<
  unknown,
  unknown,
  FixtureScope,
  Element
>;
