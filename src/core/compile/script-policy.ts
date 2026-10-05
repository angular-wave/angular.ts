import { deProxy, isString, stringify } from "../../shared/utils.ts";

/** Approves JavaScript source or throws to reject it. */
export type ScriptPolicy = (script: string) => string;
/** Validates a script URL or throws to reject it. */
export type ScriptUrlPolicy = (url: string) => string;

type ScriptContext = "script" | "scriptUrl";

interface NativeTrustedScript {
  toString(): string;
  toJSON(): string;
}

interface NativeScriptPolicy {
  createScript(value: string, policy: ScriptPolicy): NativeTrustedScript;
  createScriptURL(value: string, policy: ScriptUrlPolicy): NativeTrustedScript;
}

interface NativeScriptFactory {
  isScript(value: unknown): value is NativeTrustedScript;
  isScriptURL(value: unknown): value is NativeTrustedScript;
  createPolicy(
    name: string,
    rules: {
      createScript?: (value: string, policy: ScriptPolicy) => string;
      createScriptURL?: (value: string, policy: ScriptUrlPolicy) => string;
    },
  ): NativeScriptPolicy;
}

const scriptPolicies = new WeakMap<Window, NativeScriptPolicy>();
const scriptUrlPolicies = new WeakMap<Window, NativeScriptPolicy>();

function runPolicy(
  value: string,
  policy: ScriptPolicy,
  context: ScriptContext,
): string {
  const result = policy(value);

  if (!isString(result))
    throw new TypeError(`$compile.${context}Policy must return a string.`);

  return result;
}

/** @internal */
export function prepareScriptBinding(
  value: unknown,
  callback: ScriptPolicy,
  platformWindow: Window,
  context: ScriptContext,
): string | NativeTrustedScript {
  value = deProxy(value);
  const factory = (
    platformWindow as Window & { trustedTypes?: NativeScriptFactory }
  ).trustedTypes;

  if (
    context === "script"
      ? factory?.isScript(value)
      : factory?.isScriptURL(value)
  )
    return value as NativeTrustedScript;
  const source = stringify(value);

  if (!factory) return runPolicy(source, callback, context);

  const policies = context === "script" ? scriptPolicies : scriptUrlPolicies;
  let policy = policies.get(platformWindow);

  if (!policy) {
    policy = factory.createPolicy(
      context === "script" ? "angular-ts-script" : "angular-ts-script-url",
      context === "script"
        ? {
            createScript: (input, rule) => runPolicy(input, rule, "script"),
          }
        : {
            createScriptURL: (input, rule) =>
              runPolicy(input, rule, "scriptUrl"),
          },
    );
    policies.set(platformWindow, policy);
  }

  return context === "script"
    ? policy.createScript(source, callback)
    : policy.createScriptURL(source, callback);
}
