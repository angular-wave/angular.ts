import { deProxy, stringify, isString } from '../../shared/utils.js';

const scriptPolicies = new WeakMap();
const scriptUrlPolicies = new WeakMap();
function runPolicy(value, policy, context) {
    const result = policy(value);
    if (!isString(result))
        throw new TypeError(`$compile.${context}Policy must return a string.`);
    return result;
}
/** @internal */
function prepareScriptBinding(value, callback, platformWindow, context) {
    value = deProxy(value);
    const factory = platformWindow.trustedTypes;
    if (context === "script"
        ? factory?.isScript(value)
        : factory?.isScriptURL(value))
        return value;
    const source = stringify(value);
    if (!factory)
        return runPolicy(source, callback, context);
    const policies = context === "script" ? scriptPolicies : scriptUrlPolicies;
    let policy = policies.get(platformWindow);
    if (!policy) {
        policy = factory.createPolicy(context === "script" ? "angular-ts-script" : "angular-ts-script-url", context === "script"
            ? {
                createScript: (input, rule) => runPolicy(input, rule, "script"),
            }
            : {
                createScriptURL: (input, rule) => runPolicy(input, rule, "scriptUrl"),
            });
        policies.set(platformWindow, policy);
    }
    return context === "script"
        ? policy.createScript(source, callback)
        : policy.createScriptURL(source, callback);
}

export { prepareScriptBinding };
