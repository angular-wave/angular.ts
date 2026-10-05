import { deProxy, isString, stringify } from "../../shared/utils.ts";

/** Sanitizes HTML or throws to reject it before it reaches an HTML binding. */
export type HtmlPolicy = (html: string) => string;

/** @internal */
export interface NativeTrustedHtml {
  toString(): string;
  toJSON(): string;
}

interface NativeHtmlPolicy {
  createHTML(html: string, policy: HtmlPolicy): NativeTrustedHtml;
}

interface NativeHtmlPolicyFactory {
  isHTML(value: unknown): value is NativeTrustedHtml;
  createPolicy(
    name: string,
    rules: { createHTML: (html: string, policy: HtmlPolicy) => string },
  ): NativeHtmlPolicy;
}

const policies = new WeakMap<Window, NativeHtmlPolicy>();

function getFactory(
  platformWindow: Window,
): NativeHtmlPolicyFactory | undefined {
  return (platformWindow as Window & { trustedTypes?: NativeHtmlPolicyFactory })
    .trustedTypes;
}

function runHtmlPolicy(html: string, policy: HtmlPolicy): string {
  const result = policy(html);

  if (!isString(result)) {
    throw new TypeError("$compile.htmlPolicy must return a string.");
  }

  return result;
}

/** @internal */
export function isNativeTrustedHtml(
  value: unknown,
  platformWindow: Window,
): value is NativeTrustedHtml {
  return getFactory(platformWindow)?.isHTML(deProxy(value)) ?? false;
}

/** @internal */
export function prepareHtmlBinding(
  value: unknown,
  policy: HtmlPolicy,
  platformWindow: Window,
): string | NativeTrustedHtml {
  value = deProxy(value);
  const factory = getFactory(platformWindow);

  if (factory?.isHTML(value)) return value;

  const html = stringify(value);

  if (!factory) return runHtmlPolicy(html, policy);

  let nativePolicy = policies.get(platformWindow);

  if (!nativePolicy) {
    // Pass the runtime's callback per invocation so policies can share a CSP name.
    nativePolicy = factory.createPolicy("angular-ts-html", {
      createHTML: runHtmlPolicy,
    });
    policies.set(platformWindow, nativePolicy);
  }

  return nativePolicy.createHTML(html, policy);
}
