// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { _compile, _exceptionHandler } from "../../injection-tokens.ts";
import { dealoc, getController } from "../../shared/dom.ts";
import {
  PROGRAMMATIC_VIEW_TEMPLATE,
  attrs,
  createProgrammaticDirectiveCompile,
  materializeComponentView,
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
    register: (module: ng.IModule) => void,
  ): ng.InjectorService {
    new Angular();
    const name = `programmaticViewSpec${moduleIndex++}`;
    const module = window.angular.module(name, ["ng"]);

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
      const circle = firstSvg.circle({ cx: 4, hidden: true });

      expect(firstSvg).toBe(secondSvg);
      expect(firstSvg.circle).toBe(firstSvg.circle);
      expect(circle.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(circle.getAttribute("cx")).toBe("4");
      expect(circle.getAttribute("hidden")).toBe("");
    });

    it("sets native properties and falls back to attributes", () => {
      const input = tags.input({ value: "ready", checked: true });
      const div = tags.div({
        "data-state": "ready",
        removable: "present",
        absent: null,
        disabledFlag: false,
      });

      expect(input.value).toBe("ready");
      expect(input.checked).toBeTrue();
      expect(div.getAttribute("data-state")).toBe("ready");
      expect(div.getAttribute("removable")).toBe("present");
      expect(div.hasAttribute("absent")).toBeFalse();
      expect(div.hasAttribute("disabledFlag")).toBeFalse();

      const second = tags.div({ removable: "cached fallback" });
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
      const functionListener = jasmine.createSpy("function listener");
      const objectListener = {
        handleEvent: jasmine.createSpy("object listener"),
      };
      const button = tags.button({
        onclick: functionListener,
        onfocus: objectListener,
        onblur: null,
        onkeyup: undefined,
      });

      expect(button).toBeInstanceOf(HTMLButtonElement);
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

      const nodes = materializeComponentView([
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
        "true",
        "2",
        "fragment",
        "",
      ]);
      expect(nodes[5]).toBe(strong);
    });

    it("materializes reactive functions as stable comment anchors", () => {
      const [anchor] = materializeComponentView(() => "later");

      expect(anchor).toBeInstanceOf(Comment);
      expect(anchor.textContent).toBe("ng-view-binding");
    });
  });

  describe("srcset sanitization", () => {
    it("unwraps and sanitizes every candidate while retaining descriptors", () => {
      const valueOf = jasmine
        .createSpy("valueOf")
        .and.callFake((value) => value);
      const trust = jasmine
        .createSpy("trust")
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
      let context;

      bootstrap(
        '<section owner view-panel><em class="projected">projected</em></section>',
        (module) => {
          module.directive("owner", () => ({
            controller() {
              this.name = "owner";
            },
          }));
          module.directive("viewPanel", () => ({
            restrict: "A",
            transclude: true,
            require: "owner",
            controller() {
              this.name = "view";
            },
            view(value) {
              context = value;
              return tags.div(
                { className: "rendered" },
                value.controller.name,
                ":",
                value.required.name,
              );
            },
          }));
        },
      );

      const element = host.querySelector("section");

      expect(context.controller).toBe(getController(element, "viewPanel"));
      expect(context.required).toBe(getController(element, "owner"));
      expect(context.element).toBe(element);
      expect(context.scope).toBeDefined();
      expect(context.transclude).toEqual(jasmine.any(Function));
      expect(element.textContent).toBe("view:owner");
      expect(element.innerHTML).not.toContain("ng-programmatic-view");
    });

    it("supports controller-free directives and composes compile lifecycle hooks", () => {
      const order: string[] = [];
      let context;

      bootstrap("<article composed-view></article>", (module) => {
        module.directive("composedView", () => ({
          restrict: "A",
          view(value) {
            context = value;
            order.push("view");
            return tags.p("rendered");
          },
          compile() {
            order.push("compile");
            return {
              pre(_scope, element) {
                order.push(`pre:${element.textContent}`);
              },
              post(_scope, element) {
                order.push(`post:${element.textContent}`);
              },
            };
          },
        }));
      });

      expect(context.controller).toBeUndefined();
      expect(context.required).toBeUndefined();
      expect(order).toEqual([
        "compile",
        "view",
        "pre:rendered",
        "post:rendered",
      ]);
    });

    it("composes a plain link function after rendering", () => {
      let context;
      const link = jasmine
        .createSpy("link")
        .and.callFake((_scope, element, transclude) => {
          expect(element.textContent).toBe("ready");
          expect(transclude).toEqual(jasmine.any(Function));
        });

      bootstrap("<div linked-view><i>projected</i></div>", (module) => {
        module.directive("linkedView", () => ({
          transclude: true,
          view: (value) => {
            context = value;
            return tags.span("ready");
          },
          link,
        }));
      });

      expect(link).toHaveBeenCalledTimes(1);
      expect(context.required).toBeUndefined();
      expect(context.transclude).toEqual(jasmine.any(Function));
    });

    it("reacts to scope reads and removes listeners on disposal", async () => {
      let clicks = 0;
      const injector = bootstrap("<div reactive-view></div>", (module) => {
        module.directive("reactiveView", () => ({
          scope: true,
          view: ({ scope }) =>
            tags.button(
              {
                title: () => scope.label,
                onclick: () => clicks++,
              },
              () => scope.label,
            ),
          link(scope) {
            scope.label = "first";
          },
        }));
      });
      const scope = injector.get("$rootScope");
      const button = host.querySelector("button");

      await settle();
      expect(button.title).toBe("first");
      expect(button.textContent).toBe("first");

      button.click();
      expect(clicks).toBe(1);

      scope.destroy();
      button.click();
      expect(clicks).toBe(1);
    });

    it("updates reactive properties and replaces reactive child fragments", async () => {
      let directiveScope;
      let clicks = 0;

      bootstrap("<div rich-view></div>", (module) => {
        module.directive("richView", () => ({
          scope: true,
          view: ({ scope }) => {
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
          link(scope) {
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

      expect(link.href).toContain("https://example.test/first");
      expect(image.srcset).toContain("first.png 1x");
      expect(state.getAttribute("data-state")).toBe("ready");
      expect(host.querySelector("p").title).toBe("stable");
      expect(host.querySelector("section").textContent).toBe("linkfirst");

      directiveScope.href = "javascript:alert(1)";
      directiveScope.state = null;
      directiveScope.child = "second";
      await settle();

      expect(link.getAttribute("href")).toContain("unsafe:");
      expect(state.hasAttribute("data-state")).toBeFalse();
      expect(host.querySelector("section").textContent).toBe("linksecond");

      directiveScope.metadata.set("unrelated", "change");
      await settle();
      expect(host.querySelector("p").title).toBe("stable");

      const detachedButton = tags.button(
        { onclick: () => clicks++ },
        "replace me",
      );
      directiveScope.child = detachedButton;
      await settle();
      detachedButton.click();
      expect(clicks).toBe(1);

      directiveScope.child = undefined;
      await settle();
      detachedButton.click();
      expect(clicks).toBe(1);
      expect(detachedButton.isConnected).toBeFalse();

      directiveScope.href = "javascript:alert(1)";
      await settle();
      expect(link.getAttribute("href")).toContain("unsafe:");
    });

    it("ignores reactive child notifications after its anchor is detached", async () => {
      let directiveScope;

      bootstrap("<div detached-anchor-view></div>", (module) => {
        module.directive("detachedAnchorView", () => ({
          scope: true,
          view: ({ scope }) => {
            directiveScope = scope;
            return tags.div(() => scope.value);
          },
          link(scope) {
            scope.value = "attached";
          },
        }));
      });

      await settle();
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_COMMENT);
      let anchor;

      while ((anchor = walker.nextNode())) {
        if (anchor.data === "ng-view-binding") break;
      }

      anchor.remove();
      directiveScope.value = "detached";
      await settle();

      expect(host.textContent).toBe("attached");
    });

    it("supports compiler replacement results and reports child compile failures", () => {
      const replacement = document.createElement("strong");
      replacement.textContent = "replacement";
      const exceptionHandler = jasmine.createSpy("exception handler");
      const scope = { on: () => () => {} };
      const replacingCompile = createProgrammaticDirectiveCompile({
        name: "replacementView",
        view: () => tags.span("raw"),
        injector: {
          get(token) {
            if (token === _compile) {
              return (node) => () => {
                node.remove();
                return [replacement];
              };
            }
            if (token === _exceptionHandler) return exceptionHandler;
            throw new Error("unexpected token");
          },
        },
        sanitizeProperty: (_element, _name, value) => value,
      });
      const replacementHost = document.createElement("div");
      replacementHost.innerHTML = PROGRAMMATIC_VIEW_TEMPLATE;
      const replacementLinks = replacingCompile(replacementHost);

      replacementLinks.pre(scope, replacementHost, undefined, undefined);
      replacementLinks.post({}, replacementHost);
      expect(replacementHost.textContent).toBe("replacement");
      expect(exceptionHandler).not.toHaveBeenCalled();

      const failure = new Error("child compile failed");
      const failingCompile = createProgrammaticDirectiveCompile({
        name: "failingView",
        view: () => tags.span("removed"),
        injector: {
          get(token) {
            if (token === _compile)
              return () => () => {
                throw failure;
              };
            if (token === _exceptionHandler) return exceptionHandler;
            throw new Error("unexpected token");
          },
        },
        sanitizeProperty: (_element, _name, value) => value,
      });
      const failureHost = document.createElement("div");
      failureHost.innerHTML = PROGRAMMATIC_VIEW_TEMPLATE;
      const failureLinks = failingCompile(failureHost);

      failureLinks.pre(scope, failureHost, undefined, undefined);
      failureLinks.post({}, failureHost);
      expect(failureHost.textContent).toBe("");
      expect(exceptionHandler).toHaveBeenCalledWith(failure);
    });

    it("reports conflicting directive view definitions", () => {
      const errors = [];

      bootstrap(
        "<div view-template view-template-url view-replace></div>",
        (module) => {
          module.decorator("$exceptionHandler", () => (error) => {
            errors.push(error.message);
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
      const compile = jasmine.createSpy("compile");

      bootstrap("<div empty-compile-view></div>", (module) => {
        module.directive("emptyCompileView", () => ({
          view: () => tags.span("rendered"),
          compile,
        }));
      });

      expect(compile).toHaveBeenCalled();
      expect(host.textContent).toBe("rendered");
    });

    it("routes component properties through SCE and rejects view with replace", async () => {
      let controller;

      bootstrap("<safe-link></safe-link>", (module) => {
        module.component("safeLink", {
          controller() {
            controller = this;
            this.href = "https://example.test/safe";
          },
          view: ({ controller }) =>
            tags.a({ href: () => controller.href }, "safe"),
        });
      });

      await settle();
      const link = host.querySelector("a");
      expect(link.href).toContain("https://example.test/safe");

      controller.href = "javascript:alert(1)";
      await settle();
      expect(link.getAttribute("href")).toContain("unsafe:");

      const invalidHost = document.createElement("div");
      invalidHost.innerHTML = "<invalid-view></invalid-view>";
      document.body.appendChild(invalidHost);
      new Angular();
      const invalidModuleName = `programmaticViewSpec${moduleIndex++}`;
      window.angular
        .module(invalidModuleName, ["ng"])
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
        injector: { get: jasmine.createSpy("get") },
        sanitizeProperty: (_element, _name, value) => value,
      });
      const links = compile(document.createElement("div"));

      expect(() =>
        links.pre({}, document.createElement("div"), undefined, undefined),
      ).toThrowError(
        "Programmatic component 'missingMarker' has no view marker.",
      );
    });

    it("uses the public marker template", () => {
      expect(PROGRAMMATIC_VIEW_TEMPLATE).toBe("<!--ng-programmatic-view-->");
    });
  });
});
