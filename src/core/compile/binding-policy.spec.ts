/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createAngular } from "../../runtime/index.ts";
import {
  createBindingPolicies,
  type BindingContext,
  type BindingPolicyConfig,
} from "./binding-policy.ts";
import {
  createInterpolateRuntimeState,
  createInterpolateService,
} from "../interpolate/interpolate.ts";
import { createElementFromHTML, dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("compiler binding policies", () => {
  it("rejects unconfigured HTML and script strings, but permits empty values", () => {
    const policies = createBindingPolicies();
    for (const context of ["html", "script"] as const) {
      expect(() => policies._apply(context, "<unsafe>")).toThrowError(
        /require.*Policy/,
      );
      expect(String(policies._apply(context, ""))).toBe("");
    }
  });

  it("leaves ordinary values outside security contexts untouched", () => {
    const value = {};
    expect(createBindingPolicies()._apply(undefined, value)).toBe(value);
  });

  for (const context of ["url", "mediaUrl"] as const) {
    it(`blocks obfuscated executable URLs in ${context} bindings`, () => {
      const policies = createBindingPolicies();
      for (const url of [
        "javascript:alert(1)",
        "JaVaScRiPt:alert(1)",
        "java\tscript:alert(1)",
        "  javascript:alert(1)",
      ]) {
        expect(policies._apply(context, url)).toBe(
          "unsafe:javascript:alert(1)",
        );
      }
      expect(policies._apply(context, "/image.png")).toBe("/image.png");
      expect(policies._apply(context, null)).toBeNull();
      expect(policies._apply(context, undefined)).toBeUndefined();
    });
  }

  it("distinguishes navigable links from media and blocks executable data images", () => {
    const policies = createBindingPolicies();
    expect(policies._apply("url", "mailto:user@example.com")).toBe(
      "mailto:user@example.com",
    );
    expect(policies._apply("mediaUrl", "mailto:user@example.com")).toBe(
      "unsafe:mailto:user@example.com",
    );
    expect(policies._apply("mediaUrl", "data:image/png;base64,x")).toBe(
      "data:image/png;base64,x",
    );
    expect(policies._apply("mediaUrl", "data:image/svg+xml,<svg/>")).toBe(
      "unsafe:data:image/svg+xml,<svg/>",
    );
    expect(policies._apply("url", "data:image/png;base64,x")).toBe(
      "unsafe:data:image/png;base64,x",
    );
  });

  it("permits same-origin resources and rejects unsafe prefixes, opaque origins and external resources", () => {
    const policies = createBindingPolicies();
    expect(policies._resourceUrl("/template.html")).toBe("/template.html");
    for (const url of [
      "unsafe:javascript:alert(1)",
      "javascript:alert(1)",
      "https://external.example/template",
      "file:///template",
      "data:text/html,test",
      "blob:https://external.example/id",
    ]) {
      expect(() => policies._resourceUrl(url)).toThrowError(/insecurl/);
      expect(() => policies._apply("scriptUrl", url)).toThrowError(/insecurl/);
    }
  });

  it("resolves resources against the document base rather than treating relative URLs as safe", () => {
    const platformWindow = {
      document: { baseURI: "https://external.example/" },
      origin: location.origin,
      location: { origin: location.origin },
    } as unknown as Window;
    expect(() =>
      createBindingPolicies()._resourceUrl("template.html", platformWindow),
    ).toThrowError(/insecurl/);
  });

  for (const context of [
    "html",
    "url",
    "mediaUrl",
    "resourceUrl",
    "script",
    "scriptUrl",
  ] as const) {
    it(`runs a configured ${context} callback and propagates rejection`, () => {
      const policies = createBindingPolicies();
      const key = `${context}Policy` as keyof BindingPolicyConfig;
      const callback = jasmine.createSpy(key).and.returnValue("approved");
      policies._configure({ [key]: callback });
      expect(String(policies._apply(context, "input"))).toBe("approved");
      expect(callback).toHaveBeenCalledOnceWith("input");
      const error = new Error("policy rejected");
      policies._configure({
        [key]: () => {
          throw error;
        },
      });
      expect(() => policies._apply(context, "input")).toThrow(error);
    });

    it(`rejects non-callable and non-string ${context} policies`, () => {
      const policies = createBindingPolicies();
      const key = `${context}Policy` as keyof BindingPolicyConfig;
      expect(() =>
        policies._configure({ [key]: "invalid" } as BindingPolicyConfig),
      ).toThrowError(TypeError);
      for (const result of [undefined, null, {}, Promise.resolve("unsafe")]) {
        policies._configure({ [key]: () => result } as BindingPolicyConfig);
        expect(() => policies._apply(context, "input")).toThrowError(TypeError);
      }
    });
  }

  it("does not apply partially invalid configuration or retain callbacks after disposal", () => {
    const policies = createBindingPolicies();
    expect(() =>
      policies._configure({
        htmlPolicy: (html: string) => html,
        urlPolicy: 1,
      } as unknown as BindingPolicyConfig),
    ).toThrowError(TypeError);
    expect(() => policies._apply("html", "<b>unsafe</b>")).toThrowError(
      /require/,
    );
    policies._configure({ htmlPolicy: (html) => html });
    policies._destroy();
    expect(() => policies._apply("html", "<b>unsafe</b>")).toThrowError(
      /require/,
    );
  });

  it("does not let resource URL approvals authorize script loading", () => {
    const policies = createBindingPolicies();
    policies._configure({ resourceUrlPolicy: (url) => url });
    expect(policies._resourceUrl("https://templates.example/view.html")).toBe(
      "https://templates.example/view.html",
    );
    expect(() =>
      policies._apply("scriptUrl", "https://templates.example/script.js"),
    ).toThrowError(/insecurl/);
  });

  it("validates the complete single or multipart URL rather than trusting expression fragments", () => {
    const angular = createAngular();
    const parse = angular.injector(["ng"]).get("$parse");
    const policies = createBindingPolicies();
    const interpolate = createInterpolateService(
      createInterpolateRuntimeState(),
      parse,
      policies,
    );
    expect(
      interpolate("{{url}}", true, "url")?.({ url: "javascript:alert(1)" }),
    ).toBe("unsafe:javascript:alert(1)");
    expect(
      interpolate(
        "{{a}}{{b}}",
        true,
        "url",
      )?.({ a: "java", b: "script:alert(1)" }),
    ).toBe("unsafe:javascript:alert(1)");
    expect(interpolate("{{url}}", true, "url", true)?.({})).toBeUndefined();
    const callback = jasmine
      .createSpy("urlPolicy")
      .and.callFake((url: string) => url);
    policies._configure({ urlPolicy: callback });
    expect(interpolate("{{url}}", true, "url")?.({ url: "/safe" })).toBe(
      "/safe",
    );
    expect(callback).toHaveBeenCalledOnceWith("/safe");
    angular._composition.destroy();
  });

  it("applies strict contexts to constant strings and rejects concatenated HTML", () => {
    const angular = createAngular();
    const policies = createBindingPolicies();
    const interpolate = createInterpolateService(
      createInterpolateRuntimeState(),
      angular.injector(["ng"]).get("$parse"),
      policies,
    );
    expect(() => interpolate("<b>unsafe</b>", false, "html")).toThrowError(
      /require/,
    );
    policies._configure({ htmlPolicy: (html) => html });
    expect(
      String(interpolate("{{html}}", true, "html")?.({ html: "<b>safe</b>" })),
    ).toBe("<b>safe</b>");
    expect(() =>
      interpolate("{{a}}{{b}}", true, "html")?.({ a: "<b>", b: "</b>" }),
    ).toThrowError(/concatenate/);
    angular._composition.destroy();
  });

  it("preserves the correct native brand and does not confuse HTML, script and script URLs", () => {
    const angular = createAngular();
    const policies = createBindingPolicies();
    policies._configure({
      htmlPolicy: (html) => html,
      scriptPolicy: (script) => script,
      scriptUrlPolicy: (url) => url,
    });
    const interpolate = createInterpolateService(
      createInterpolateRuntimeState(),
      angular.injector(["ng"]).get("$parse"),
      policies,
    );
    for (const context of ["html", "script", "scriptUrl"] as const) {
      const native = policies._apply(context, "safe");
      if (typeof native === "object") {
        expect(policies._apply(context, native)).toBe(native);
        expect(
          interpolate("{{value}}", true, context)?.({ value: native }),
        ).toBe(native);
        expect(interpolate("{{value}}")?.({ value: native })).toBe("safe");
        const other: BindingContext = context === "html" ? "script" : "html";
        expect(
          createBindingPolicies()._apply.bind(null, other, native),
        ).toThrowError(/require/);
      }
    }
    angular._composition.destroy();
  });

  it("creates native script values for CSP-enforced sinks without user-created policies", async () => {
    if (!("trustedTypes" in window)) {
      pending("Native Trusted Types unavailable");
      return;
    }
    const frame = document.createElement("iframe");
    const loaded = new Promise<void>((resolve) =>
      frame.addEventListener("load", () => resolve(), { once: true }),
    );
    frame.srcdoc =
      '<meta http-equiv="Content-Security-Policy" content="require-trusted-types-for &#39;script&#39;; trusted-types angular-ts-script angular-ts-script-url">';
    document.body.append(frame);
    try {
      await loaded;
      const platformWindow = frame.contentWindow!;
      const script = frame.contentDocument!.createElement("script");
      expect(() => {
        script.text = "void 0";
      }).toThrow();
      expect(() => {
        script.src = "/safe.js";
      }).toThrow();
      const policies = createBindingPolicies();
      policies._configure({ scriptPolicy: (code) => code });
      const source = policies._apply("script", "void 0", platformWindow);
      const url = policies._apply("scriptUrl", "/safe.js", platformWindow);
      script.text = source as string;
      script.src = url as string;
      expect(script.text).toBe("void 0");
      expect(script.src).toBe(new URL("/safe.js", document.baseURI).href);
      expect(policies._apply("script", source, platformWindow)).toBe(source);
      expect(policies._apply("scriptUrl", url, platformWindow)).toBe(url);
    } finally {
      frame.remove();
    }
  });
});

describe("compiler policy integration", () => {
  let previousAngular: typeof window.angular;
  let element: HTMLElement | undefined;
  beforeEach(() => {
    previousAngular = window.angular;
  });
  afterEach(() => {
    if (element) dealoc(element);
    element = undefined;
    window.angular = previousAngular;
  });

  it("uses policies instead of SCE registrations in the full runtime", async () => {
    window.angular = new Angular();
    const module = window.angular.createModule("policyApp", ["ng"]);
    const htmlPolicy = jasmine
      .createSpy("htmlPolicy")
      .and.callFake((html: string) => html.replace(/</g, "&lt;"));
    module.config({ $compile: { htmlPolicy } });
    const injector = window.angular.injector(["policyApp"]);
    expect(injector.has("$sce")).toBeFalse();
    expect(injector.has("$sceDelegate")).toBeFalse();
    const root = injector.get("$rootScope");
    root.html = "<img onerror=alert(1)>";
    element = createElementFromHTML(
      '<div ng-bind-html="html"></div>',
    ) as HTMLElement;
    injector.get("$compile")(element)(root);
    await wait();
    expect(element.querySelector("img")).toBeNull();
    expect(element.textContent).toBe("<img onerror=alert(1)>");
    expect(htmlPolicy).toHaveBeenCalled();
  });

  it("applies link policy once at an alias sink, including after attribute mutation", async () => {
    window.angular = new Angular();
    const callback = jasmine
      .createSpy("urlPolicy")
      .and.callFake((url: string) => `/approved/${url}`);
    window.angular
      .createModule("aliasPolicyApp", ["ng"])
      .config({ $compile: { urlPolicy: callback } });
    const injector = window.angular.injector(["aliasPolicyApp"]);
    const root = injector.get("$rootScope");
    root.url = "page";
    element = createElementFromHTML('<a ng-href="{{url}}"></a>') as HTMLElement;
    injector.get("$compile")(element)(root);
    await wait();
    expect(element.getAttribute("href")).toBe("/approved/page");
    expect(
      callback.calls.allArgs().filter(([url]) => url === "page").length,
    ).toBe(1);
    element.setAttribute("ng-href", "another");
    await wait();
    expect(element.getAttribute("href")).toBe("/approved/another");
  });

  it("does not interpolate script contents and rejects plain binding directives as source-policy bypasses", async () => {
    window.angular = new Angular();
    const injector = window.angular.injector(["ng"]);
    const compile = injector.get("$compile");
    element = document.createElement("script");
    element.textContent = "{{source}}";
    const root = injector.get("$rootScope");
    compile(element)(root);
    root.source = "void 0";
    await wait();
    expect(element.textContent).toBe("{{source}}");
    for (const name of ["ng-bind", "ng-bind-html", "ng-bind-template"]) {
      element = document.createElement("script");
      element.setAttribute(name, "source");
      expect(() => compile(element!)(injector.get("$rootScope"))).toThrowError(
        /scriptPolicy/,
      );
    }
    const custom = createAngular();
    element = document.createElement("script");
    element.textContent = "{{source}}";
    expect(() =>
      custom.injector(["ng"]).get("$compile")(element!),
    ).toThrowError(/Script interpolation/);
    custom._composition.destroy();
  });

  it("applies generic property contexts and prefers element-specific contexts", async () => {
    window.angular = new Angular();
    window.angular.createModule("propertyPolicyApp", ["ng"]).config({
      $compile: {
        propertySecurityContexts: [
          { elementName: "*", propertyName: "title", context: "url" },
          { elementName: "div", propertyName: "title", context: "mediaUrl" },
        ],
        urlPolicy: (url) => `link:${url}`,
        mediaUrlPolicy: (url) => `media:${url}`,
      },
    });
    const injector = window.angular.injector(["propertyPolicyApp"]);
    const root = injector.get("$rootScope");
    root.value = "test";
    element = createElementFromHTML(
      '<section><div ng-prop-title="value"></div><span ng-prop-title="value"></span></section>',
    ) as HTMLElement;
    injector.get("$compile")(element)(root);
    await wait();
    expect(element.querySelector("div")!.title).toBe("media:test");
    expect(element.querySelector("span")!.title).toBe("link:test");
  });
});
