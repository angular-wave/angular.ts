import type { ProgrammaticViewProperties } from "./programmatic-view.ts";
import { createScope } from "../scope/scope.ts";
import { defined, instance } from "../../shared/test-fixtures.spec.ts";
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { _compile, _exceptionHandler } from "../../injection-tokens.ts";
import { dealoc, getController } from "../../shared/dom.ts";
import {
  PROGRAMMATIC_VIEW_TEMPLATE,
  attrs,
  createProgrammaticDirectiveCompile,
  materializeProgrammaticView,
  sanitizeProgrammaticSrcset,
  tags,
} from "./programmatic-view.ts";

describe("programmatic views", () => {
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
    const name = `programmaticViewSpec${moduleIndex++}`;
    const module = window.angular.createModule(name, ["ng"]);

    register(module);
    host.innerHTML = html;

    return window.angular.bootstrap(host, [name]);
  }

  function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 32));
  }

  describe("tags", () => {
    it("caches HTML and namespaced tag factories", () => {
      expect(tags.div).toBe(tags.div);
      expect(Reflect.get(tags, Symbol.iterator)).toBeUndefined();

      const firstSvg = tags("http://www.w3.org/2000/svg");
      const secondSvg = tags("http://www.w3.org/2000/svg");
      const circle = firstSvg.circle(attrs({ cx: 4, hidden: true }));

      expect(firstSvg).toBe(secondSvg);
      expect(firstSvg.circle).toBe(firstSvg.circle);
      expect(circle.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(circle.getAttribute("cx")).toBe("4");
      expect(circle.getAttribute("hidden")).toBe("");
    });

    it("sets native properties and falls back to attributes", () => {
      const input = tags.input({ value: "ready", checked: true });
      const properties: ProgrammaticViewProperties<
        HTMLDivElement & {
          removable: string;
          absent: string;
          disabledFlag: boolean;
        }
      > = {
        "data-state": "ready",
        removable: "present",
        absent: null,
        disabledFlag: false,
      };
      const div = tags.div(properties);

      expect(input.value).toBe("ready");
      expect(input.checked).toBeTrue();
      expect(div.getAttribute("data-state")).toBe("ready");
      expect(div.getAttribute("removable")).toBe("present");
      expect(div.hasAttribute("absent")).toBeFalse();
      expect(div.hasAttribute("disabledFlag")).toBeFalse();

      const secondProperties: typeof properties = {
        removable: "cached fallback",
      };
      const second = tags.div(secondProperties);
      expect(second.getAttribute("removable")).toBe("cached fallback");
    });

    it("passes customized built-in names to DOM creation", () => {
      const createElement = spyOn(document, "createElement").and.callThrough();
      const createElementNS = spyOn(
        document,
        "createElementNS",
      ).and.callThrough();
      const htmlButton = tags.button({ is: "view-button" });
      const svg = tags("http://www.w3.org/2000/svg");
      const svgCircle = svg.circle({ is: "view-circle" });

      expect(htmlButton).toBeInstanceOf(HTMLButtonElement);
      expect(svgCircle).toBeInstanceOf(SVGCircleElement);
      expect(createElement).toHaveBeenCalledWith("button", {
        is: "view-button",
      });
      expect(createElementNS).toHaveBeenCalledWith(
        "http://www.w3.org/2000/svg",
        "circle",
        { is: "view-circle" },
      );
    });

    it("distinguishes property bags from children", () => {
      const nullPrototypeProperties = Object.create(null);
      nullPrototypeProperties.title = "plain";
      const child = tags.span("child");
      const withProperties = tags.div(nullPrototypeProperties, child);
      const nodeFirstChild = tags.span("node first");
      const withNodeFirst = tags.div(nodeFirstChild);

      expect(withProperties.title).toBe("plain");
      expect(withProperties.firstChild).toBe(child);
      expect(withNodeFirst.firstChild).toBe(nodeFirstChild);
    });

    it("accepts event functions and listener objects", () => {
      const functionListener =
        jasmine.createSpy<(event: Event) => void>("function listener");
      const objectListener = {
        handleEvent:
          jasmine.createSpy<(event: Event) => void>("object listener"),
      };
      const button = tags.button({
        onclick: functionListener,
        onfocus: objectListener,
        onblur: null,
        onkeyup: undefined,
      });

      expect(button).toBeInstanceOf(HTMLButtonElement);
      // @ts-expect-error Deliberately invalid event listener tests runtime validation.
      expect(() => tags.button({ onclick: "invalid" })).toThrowError(
        TypeError,
        "Event property 'onclick' must be an event listener.",
      );
    });
  });

  describe("materialization", () => {
    it("flattens arrays and fragments while omitting nullish children", () => {
      const fragment = document.createDocumentFragment();
      const strong = document.createElement("strong");
      fragment.append("fragment", strong);

      const nodes = materializeProgrammaticView([
        "text",
        1,
        true,
        2n,
        null,
        undefined,
        [fragment],
      ]);

      expect(nodes.map((node) => node.textContent)).toEqual([
        "text",
        "1",
        "2",
        "fragment",
        "",
      ]);
      expect(nodes[4]).toBe(strong);
    });

    it("materializes reactive functions as stable comment anchors", () => {
      const [anchor] = materializeProgrammaticView(() => "later");

      expect(anchor).toBeInstanceOf(Comment);
      expect(anchor.textContent).toBe("ng-view-binding");
    });
  });

  describe("srcset sanitization", () => {
    it("unwraps and sanitizes every candidate while retaining descriptors", () => {
      const valueOf = jasmine
        .createSpy<(value: unknown) => unknown>("valueOf")
        .and.callFake((value) => value);
      const trust = jasmine
        .createSpy<(value: unknown) => string>("trust")
        .and.callFake((value) => `safe:${value}`);

      expect(
        sanitizeProgrammaticSrcset(
          "first.png 1x, second.png 200w, third.png",
          valueOf,
          trust,
        ),
      ).toBe("safe:first.png 1x, safe:second.png 200w, safe:third.png");
      expect(trust.calls.allArgs()).toEqual([
        ["first.png"],
        ["second.png"],
        ["third.png"],
      ]);
    });

    it("preserves empty values and rejects non-string values", () => {
      expect(
        sanitizeProgrammaticSrcset(null, (value) => value, String),
      ).toBeNull();
      expect(() =>
        sanitizeProgrammaticSrcset(42, (value) => value, String),
      ).toThrowError(
        TypeError,
        "A programmatic srcset binding must produce a string.",
      );
    });
  });

  describe("directive integration", () => {
    it("provides controller, required controller, scope, host, and transclusion", () => {
      let context: ViewContext | undefined;

      bootstrap(
        '<section owner view-panel><em class="projected">projected</em></section>',
        (module) => {
          module.directive("owner", () => ({
            controller: function (this: { name: string }): undefined {
              this.name = "owner";
            },
          }));
          module.directive("viewPanel", () => ({
            restrict: "A",
            transclude: true,
            require: "owner",
            controller: function (this: { name: string }): undefined {
              this.name = "view";
            },
            view(value: ViewContext) {
              context = value;
              return tags.div(
                { className: "rendered" },
                nameOf(value.controller),
                ":",
                nameOf(value.required),
              );
            },
          }));
        },
      );

      const element = host.querySelector("section");

      expect(defined(context).controller).toBe(
        getController(defined(element), "viewPanel"),
      );
      expect(defined(context).required).toBe(
        getController(defined(element), "owner"),
      );
      expect(defined(context).host).toBe(defined(element));
      expect(defined(context).scope).toBeDefined();
      expect(defined(context).transclude).toEqual(jasmine.any(Function));
      expect(defined(element).textContent).toBe("view:owner");
      expect(defined(element).innerHTML).not.toContain("ng-programmatic-view");
    });

    it("supports controller-free directives and composes compile lifecycle hooks", () => {
      const order: string[] = [];
      let context: ViewContext | undefined;

      bootstrap("<article composed-view></article>", (module) => {
        module.directive("composedView", () => ({
          restrict: "A",
          view(value: ViewContext) {
            context = value;
            order.push("view");
            return tags.p("rendered");
          },
          compile() {
            order.push("compile");
            return {
              pre(_scope: ng.Scope, element: Element) {
                order.push(`pre:${element.textContent}`);
              },
              post(_scope: ng.Scope, element: Element) {
                order.push(`post:${element.textContent}`);
              },
            };
          },
        }));
      });

      expect(defined(context).controller).toBeUndefined();
      expect(defined(context).required).toBeUndefined();
      expect(order).toEqual([
        "compile",
        "view",
        "pre:rendered",
        "post:rendered",
      ]);
    });

    it("composes a plain link function after rendering", () => {
      let context: ViewContext | undefined;
      const link = jasmine
        .createSpy<
          (
            scope: ng.Scope,
            element: HTMLElement,
            transclude: ng.TranscludeFn,
          ) => void
        >("link")
        .and.callFake((_scope, element, transclude) => {
          expect(element.textContent).toBe("ready");
          expect(transclude).toEqual(jasmine.any(Function));
        });

      bootstrap("<div linked-view><i>projected</i></div>", (module) => {
        module.directive("linkedView", () => ({
          transclude: true,
          view: (value: ViewContext) => {
            context = value;
            return tags.span("ready");
          },
          link,
        }));
      });

      expect(link).toHaveBeenCalledTimes(1);
      expect(defined(context).required).toBeUndefined();
      expect(defined(context).transclude).toEqual(jasmine.any(Function));
    });

    it("reacts to scope reads and removes listeners on disposal", async () => {
      let clicks = 0;
      const injector = bootstrap("<div reactive-view></div>", (module) => {
        module.directive("reactiveView", () => ({
          scope: true,
          view: ({ scope }: ViewContext) =>
            tags.button(
              {
                title: () => scope.label,
                onclick: () => clicks++,
              },
              () => scope.label,
            ),
          link(scope: FixtureScope) {
            scope.label = "first";
          },
        }));
      });
      const scope = injector.get("$rootScope");
      const button = host.querySelector("button");

      await settle();
      expect(defined(button).title).toBe("first");
      expect(defined(button).textContent).toBe("first");

      defined(button).click();
      expect(clicks).toBe(1);

      scope.destroy();
      defined(button).click();
      expect(clicks).toBe(1);
    });

    it("updates reactive properties and replaces reactive child fragments", async () => {
      let directiveScope: FixtureScope | undefined;
      let clicks = 0;

      bootstrap("<div rich-view></div>", (module) => {
        module.directive("richView", () => ({
          scope: true,
          view: ({ scope }: ViewContext) => {
            directiveScope = scope;

            return tags.section(
              tags.a({ href: () => scope.href }, "link"),
              tags.img({ srcset: () => scope.srcset }),
              tags.source({ srcset: () => scope.srcset }),
              tags.div(attrs({ "data-state": () => scope.state })),
              tags.p({ title: () => scope.metadata?.get("title") }),
              () => scope.child,
            );
          },
          link(scope: FixtureScope) {
            scope.href = "https://example.test/first";
            scope.srcset = "first.png 1x, second.png 2x";
            scope.state = "ready";
            scope.metadata = new Map([["title", "stable"]]);
            scope.child = "first";
          },
        }));
      });

      await settle();
      const link = host.querySelector("a");
      const image = host.querySelector("img");
      const state = host.querySelector("[data-state]");

      expect(defined(link).href).toContain("https://example.test/first");
      expect(defined(image).srcset).toContain("first.png 1x");
      expect(defined(state).getAttribute("data-state")).toBe("ready");
      expect(defined(host.querySelector("p")).title).toBe("stable");
      expect(defined(host.querySelector("section")).textContent).toBe(
        "linkfirst",
      );

      defined(directiveScope).href = "javascript:alert(1)";
      defined(directiveScope).state = null;
      defined(directiveScope).child = "second";
      await settle();

      expect(defined(link).getAttribute("href")).toContain("unsafe:");
      expect(defined(state).hasAttribute("data-state")).toBeFalse();
      expect(defined(host.querySelector("section")).textContent).toBe(
        "linksecond",
      );

      defined(defined(directiveScope).metadata).set("unrelated", "change");
      await settle();
      expect(defined(host.querySelector("p")).title).toBe("stable");

      const detachedButton = tags.button(
        { onclick: () => clicks++ },
        "replace me",
      );
      defined(directiveScope).child = detachedButton;
      await settle();
      detachedButton.click();
      expect(clicks).toBe(1);

      defined(directiveScope).child = undefined;
      await settle();
      detachedButton.click();
      expect(clicks).toBe(1);
      expect(detachedButton.isConnected).toBeFalse();

      defined(directiveScope).href = "javascript:alert(1)";
      await settle();
      expect(defined(link).getAttribute("href")).toContain("unsafe:");
    });

    it("ignores reactive child notifications after its anchor is detached", async () => {
      let directiveScope: FixtureScope | undefined;

      bootstrap("<div detached-anchor-view></div>", (module) => {
        module.directive("detachedAnchorView", () => ({
          scope: true,
          view: ({ scope }: ViewContext) => {
            directiveScope = scope;
            return tags.div(() => scope.value);
          },
          link(scope: FixtureScope) {
            scope.value = "attached";
          },
        }));
      });

      await settle();
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_COMMENT);
      let anchor: Comment | undefined;

      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node instanceof Comment && node.data === "ng-view-binding") {
          anchor = node;
          break;
        }
      }

      defined(anchor).remove();
      defined(directiveScope).value = "detached";
      await settle();

      expect(host.textContent).toBe("attached");
    });

    it("supports compiler replacement results and reports child compile failures", () => {
      const replacement = document.createElement("strong");
      replacement.textContent = "replacement";
      const exceptionHandler =
        jasmine.createSpy<(error: unknown) => void>("exception handler");
      const scope = createScope();
      const replacingCompile = createProgrammaticDirectiveCompile({
        name: "replacementView",
        view: () => tags.span("raw"),
        injector: compilerInjector((node) => {
          node.remove();
          return [replacement];
        }, exceptionHandler),
        sanitizeProperty: (_element, _name, value) => value,
      });
      const replacementHost = document.createElement("div");
      replacementHost.innerHTML = PROGRAMMATIC_VIEW_TEMPLATE;
      const replacementLinks = replacingCompile(replacementHost);

      defined(replacementLinks).pre(
        scope,
        replacementHost,
        undefined,
        undefined,
      );
      defined(replacementLinks).post(scope, replacementHost);
      expect(replacementHost.textContent).toBe("replacement");
      expect(exceptionHandler).not.toHaveBeenCalled();

      const failure = new Error("child compile failed");
      const failingCompile = createProgrammaticDirectiveCompile({
        name: "failingView",
        view: () => tags.span("removed"),
        injector: compilerInjector(() => {
          throw failure;
        }, exceptionHandler),
        sanitizeProperty: (_element, _name, value) => value,
      });
      const failureHost = document.createElement("div");
      failureHost.innerHTML = PROGRAMMATIC_VIEW_TEMPLATE;
      const failureLinks = failingCompile(failureHost);

      defined(failureLinks).pre(scope, failureHost, undefined, undefined);
      defined(failureLinks).post(scope, failureHost);
      expect(failureHost.textContent).toBe("");
      expect(exceptionHandler).toHaveBeenCalledWith(failure);
    });

    it("reports conflicting directive view definitions", () => {
      const errors: unknown[] = [];

      bootstrap(
        "<div view-template view-template-url view-replace></div>",
        (module) => {
          module.decorator("$exceptionHandler", () => (error: unknown) => {
            errors.push(instance(error, Error).message);
          });
          module.directive("viewTemplate", () => ({
            view: () => null,
            template: "conflict",
          }));
          module.directive("viewTemplateUrl", () => ({
            view: () => null,
            templateUrl: "conflict.html",
          }));
          module.directive("viewReplace", () => ({
            view: () => null,
            replace: true,
          }));
        },
      );

      expect(errors.length).toBe(3);
      expect(errors.join("\n")).toContain("multiview");
      expect(errors.join("\n")).toContain("viewreplace");
    });

    it("allows an existing compile function to return no link hooks", () => {
      const compile = jasmine.createSpy<ng.DirectiveCompileFn>("compile");

      bootstrap("<div empty-compile-view></div>", (module) => {
        module.directive("emptyCompileView", () => ({
          view: () => tags.span("rendered"),
          compile,
        }));
      });

      expect(compile).toHaveBeenCalled();
      expect(host.textContent).toBe("rendered");
    });

    it("routes component properties through binding policies and rejects view with replace", async () => {
      let controller: { href: string } | undefined;

      bootstrap("<safe-link></safe-link>", (module) => {
        module.component("safeLink", {
          controller: function (this: { href: string }): undefined {
            controller = this;
            this.href = "https://example.test/safe";
          },
          view: ({ controller }) =>
            tags.a({ href: () => hrefOf(controller) }, "safe"),
        });
      });

      await settle();
      const link = host.querySelector("a");
      expect(defined(link).href).toContain("https://example.test/safe");

      defined(controller).href = "javascript:alert(1)";
      await settle();
      expect(defined(link).getAttribute("href")).toContain("unsafe:");

      const invalidHost = document.createElement("div");
      invalidHost.innerHTML = "<invalid-view></invalid-view>";
      document.body.appendChild(invalidHost);
      new Angular();
      const invalidModuleName = `programmaticViewSpec${moduleIndex++}`;
      window.angular
        .createModule(invalidModuleName, ["ng"])
        // @ts-expect-error Programmatic views deliberately reject replace to test runtime validation.
        .component("invalidView", {
          view: () => null,
          replace: true,
        });

      expect(() =>
        window.angular.bootstrap(invalidHost, [invalidModuleName]),
      ).toThrowError(/viewreplace/);

      dealoc(invalidHost);
      invalidHost.remove();
    });

    it("reports a missing marker before resolving compiler services", () => {
      const compile = createProgrammaticDirectiveCompile({
        name: "missingMarker",
        view: () => null,
        injector: compilerInjector(
          () => [],
          jasmine.createSpy<(error: unknown) => void>("exception"),
        ),
        sanitizeProperty: (_element, _name, value) => value,
      });
      const links = compile(document.createElement("div"));

      expect(() =>
        defined(links).pre(
          createScope(),
          document.createElement("div"),
          undefined,
          undefined,
        ),
      ).toThrowError(
        "Programmatic component 'missingMarker' has no view marker.",
      );
    });

    it("uses the public marker template", () => {
      expect(PROGRAMMATIC_VIEW_TEMPLATE).toBe("<!--ng-programmatic-view-->");
    });
  });
  it("defers static markup properties until child views are available", () => {
    bootstrap("<static-markup></static-markup>", (module) => {
      module.component("staticMarkup", {
        view: () => tags.div({ innerHTML: "" }, tags.span("discarded")),
      });
    });

    expect(host.querySelector("static-markup div")?.textContent).toBe("");
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

function nameOf(value: unknown): string {
  if (
    typeof value !== "object" ||
    value === null ||
    !("name" in value) ||
    typeof value.name !== "string"
  )
    throw new TypeError("Expected named controller");
  return value.name;
}
function hrefOf(value: unknown): string {
  if (
    typeof value !== "object" ||
    value === null ||
    !("href" in value) ||
    typeof value.href !== "string"
  )
    throw new TypeError("Expected link controller");
  return value.href;
}

function compilerInjector(
  link: (node: Element) => Node | Node[],
  exceptionHandler: (error: unknown) => void,
): ng.InjectorService {
  const angular = new Angular();
  const injector = angular.injector(["ng"]);
  const original = injector.get("$compile");
  const compile: ng.CompileService = Object.assign(
    (node: Parameters<ng.CompileService>[0]) => () =>
      link(instance(node, Element)),
    original,
  );
  // This fixture exercises the generic compiler fallback rather than its optimized node hook.
  Reflect.deleteProperty(compile, "_linkProgrammaticNode");
  const get = spyOn(injector, "get").and.callThrough();
  get.withArgs(_compile).and.returnValue(compile);
  get.withArgs(_exceptionHandler).and.returnValue(exceptionHandler);
  return injector;
}
