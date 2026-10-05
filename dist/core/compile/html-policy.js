import { deProxy, stringify, isString } from '../../shared/utils.js';

const policies = new WeakMap();
function getFactory(platformWindow) {
    return platformWindow
        .trustedTypes;
}
function runHtmlPolicy(html, policy) {
    const result = policy(html);
    if (!isString(result)) {
        throw new TypeError("$compile.htmlPolicy must return a string.");
    }
    return result;
}
/** @internal */
function isNativeTrustedHtml(value, platformWindow) {
    return getFactory(platformWindow)?.isHTML(deProxy(value)) ?? false;
}
/** @internal */
function prepareHtmlBinding(value, policy, platformWindow) {
    value = deProxy(value);
    const factory = getFactory(platformWindow);
    if (factory?.isHTML(value))
        return value;
    const html = stringify(value);
    if (!factory)
        return runHtmlPolicy(html, policy);
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

export { isNativeTrustedHtml, prepareHtmlBinding };
