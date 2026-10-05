/// <reference types="jasmine" />
import { CompileLifecycle, CompileRegistry } from "./compile.ts";
import { prepareHtmlBinding, type HtmlPolicy } from "./html-policy.ts";

describe("HTML binding policy", () => {
  const unsupportedWindow = {} as Window;

  it("applies the callback without native Trusted Types support", () => {
    const policy = jasmine
      .createSpy("htmlPolicy")
      .and.callFake((html: string) => html.replace(/</g, "&lt;"));

    expect(
      prepareHtmlBinding("<img onerror=alert(1)>", policy, unsupportedWindow),
    ).toBe("&lt;img onerror=alert(1)>");
    expect(policy).toHaveBeenCalledOnceWith("<img onerror=alert(1)>");
  });

  it("normalizes missing values before invoking the callback", () => {
    const policy = jasmine
      .createSpy("htmlPolicy")
      .and.callFake((html: string) => html);

    expect(prepareHtmlBinding(null, policy, unsupportedWindow)).toBe("");
    expect(prepareHtmlBinding(undefined, policy, unsupportedWindow)).toBe("");
    expect(policy.calls.allArgs()).toEqual([[""], [""]]);
  });

  it("propagates a rejected value without substituting the original HTML", () => {
    const error = new Error("HTML rejected");

    expect(() =>
      prepareHtmlBinding(
        "unsafe",
        () => {
          throw error;
        },
        unsupportedWindow,
      ),
    ).toThrow(error);
  });

  it("rejects a non-string callback result", () => {
    const invalidPolicy = (() => null) as unknown as HtmlPolicy;

    expect(() =>
      prepareHtmlBinding("unsafe", invalidPolicy, unsupportedWindow),
    ).toThrowError(TypeError, "$compile.htmlPolicy must return a string.");
  });

  it("rejects a non-callable policy at configuration time", () => {
    const registry = new CompileRegistry(new CompileLifecycle());

    expect(() =>
      registry.configure({ htmlPolicy: "invalid" as unknown as HtmlPolicy }),
    ).toThrowError(TypeError, "$compile.htmlPolicy must be a function.");
    registry.destroy();
  });

  it("writes sanitized native HTML into a sink enforcing Trusted Types", async () => {
    if (!("trustedTypes" in window)) {
      pending("Native Trusted Types are unavailable.");

      return;
    }

    const frame = document.createElement("iframe");
    const loaded = new Promise<void>((resolve) => {
      frame.addEventListener("load", () => resolve(), { once: true });
    });

    frame.srcdoc =
      '<meta http-equiv="Content-Security-Policy" ' +
      "content=\"require-trusted-types-for 'script'; trusted-types angular-ts-html\">";
    document.body.appendChild(frame);

    try {
      await loaded;
      const frameWindow = frame.contentWindow;
      const frameDocument = frame.contentDocument;

      if (!frameWindow || !frameDocument)
        throw new Error("Missing test frame.");

      const target = frameDocument.createElement("div");
      const html = '<img src=x onerror="alert(1)">';

      expect(() => {
        target.innerHTML = html;
      }).toThrow();
      const value = prepareHtmlBinding(
        html,
        (input) => input.replace(/</g, "&lt;"),
        frameWindow,
      );

      target.innerHTML = value as string;
      expect(typeof value).toBe("object");
      expect(target.querySelector("img")).toBeNull();
      expect(target.textContent).toBe(html);
    } finally {
      frame.remove();
    }
  });

  it("creates one native policy and supplies each runtime callback separately", () => {
    const trusted = new WeakSet<object>();
    const createPolicy = jasmine
      .createSpy("createPolicy")
      .and.callFake(
        (
          _name: string,
          rules: { createHTML: (html: string, policy: HtmlPolicy) => string },
        ) => ({
          createHTML(html: string, policy: HtmlPolicy) {
            const sanitized = rules.createHTML(html, policy);
            const value = {
              toString: () => sanitized,
              toJSON: () => sanitized,
            };

            trusted.add(value);

            return value;
          },
        }),
      );
    const platformWindow = {
      trustedTypes: {
        createPolicy,
        isHTML: (value: unknown) =>
          typeof value === "object" && value !== null && trusted.has(value),
      },
    } as unknown as Window;
    const firstPolicy = jasmine.createSpy("first").and.returnValue("first");
    const secondPolicy = jasmine.createSpy("second").and.returnValue("second");
    const first = prepareHtmlBinding("input", firstPolicy, platformWindow);
    const second = prepareHtmlBinding("input", secondPolicy, platformWindow);

    expect(String(first)).toBe("first");
    expect(String(second)).toBe("second");
    expect(createPolicy).toHaveBeenCalledOnceWith(
      "angular-ts-html",
      jasmine.any(Object),
    );
    expect(firstPolicy).toHaveBeenCalledOnceWith("input");
    expect(secondPolicy).toHaveBeenCalledOnceWith("input");
    expect(prepareHtmlBinding(first, secondPolicy, platformWindow)).toBe(first);
    expect(secondPolicy).toHaveBeenCalledTimes(1);
    expect(() =>
      prepareHtmlBinding(
        "unsafe",
        (() => null) as unknown as HtmlPolicy,
        platformWindow,
      ),
    ).toThrowError(TypeError, "$compile.htmlPolicy must return a string.");
  });

  it("propagates policy creation failures instead of falling back to strings", () => {
    const error = new TypeError("CSP blocked the policy");
    const policy = jasmine.createSpy("htmlPolicy").and.returnValue("safe");
    const platformWindow = {
      trustedTypes: {
        isHTML: () => false,
        createPolicy() {
          throw error;
        },
      },
    } as unknown as Window;

    expect(() => prepareHtmlBinding("unsafe", policy, platformWindow)).toThrow(
      error,
    );
    expect(policy).not.toHaveBeenCalled();
  });
});
