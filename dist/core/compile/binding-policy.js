import { deProxy, isFunction, isString, createErrorFactory } from '../../shared/utils.js';
import { prepareHtmlBinding } from './html-policy.js';
import { prepareScriptBinding } from './script-policy.js';

const policyError = createErrorFactory("$compile");
const linkProtocols = /^(https?|s?ftp|mailto|tel|file):$/;
const mediaProtocols = /^(https?|ftp|file|blob):$/;
const mediaData = /^data:image\/(?:png|gif|jpe?g|webp|avif|bmp|x-icon)(?:;|,)/i;
const policyKeys = [
    "htmlPolicy",
    "urlPolicy",
    "mediaUrlPolicy",
    "resourceUrlPolicy",
    "scriptPolicy",
    "scriptUrlPolicy",
];
function rejectHtml(html) {
    if (!html)
        return html;
    throw policyError("unsafe", "HTML strings require a $compile.htmlPolicy callback.");
}
function rejectScript(script) {
    if (!script)
        return script;
    throw policyError("unsafe", "Script strings require a $compile.scriptPolicy callback.");
}
function applyUrlPolicy(value, policy, context, platformWindow) {
    const url = String(deProxy(value));
    if (policy) {
        const result = policy(url);
        if (!isString(result))
            throw new TypeError(`$compile.${context}Policy must return a string.`);
        return result;
    }
    if (!url)
        return url;
    if (context !== "resourceUrl" && url.startsWith("unsafe:"))
        return url;
    const resolved = new URL(url, platformWindow.document.baseURI);
    if (context === "resourceUrl") {
        if (resolved.origin === platformWindow.origin &&
            /^https?:$/.test(resolved.protocol))
            return url;
        throw policyError("insecurl", "Resource URL is not allowed by $compile.resourceUrlPolicy: {0}", url);
    }
    const allowed = context === "url"
        ? linkProtocols.test(resolved.protocol)
        : mediaProtocols.test(resolved.protocol) || mediaData.test(resolved.href);
    return allowed ? url : `unsafe:${resolved.href}`;
}
/** @internal */
function createBindingPolicies() {
    let configuration = {};
    return {
        _configure(config) {
            for (const key of policyKeys) {
                if (config[key] !== undefined && !isFunction(config[key])) {
                    throw new TypeError(`$compile.${key} must be a function.`);
                }
            }
            for (const key of policyKeys) {
                if (config[key] !== undefined)
                    configuration[key] = config[key];
            }
        },
        _apply(context, value, platformWindow = window) {
            value = deProxy(value);
            if (context === "html")
                return prepareHtmlBinding(value, configuration.htmlPolicy ?? rejectHtml, platformWindow);
            if (context === "script")
                return prepareScriptBinding(value, configuration.scriptPolicy ?? rejectScript, platformWindow, "script");
            if (context === "scriptUrl") {
                if (value === null || value === undefined)
                    return value;
                return prepareScriptBinding(value, configuration.scriptUrlPolicy ??
                    ((url) => applyUrlPolicy(url, undefined, "resourceUrl", platformWindow)), platformWindow, "scriptUrl");
            }
            if (!context || value === null || value === undefined)
                return value;
            return applyUrlPolicy(value, configuration[`${context}Policy`], context, platformWindow);
        },
        _resourceUrl(value, platformWindow = window) {
            return applyUrlPolicy(value, configuration.resourceUrlPolicy, "resourceUrl", platformWindow);
        },
        _destroy() {
            configuration = {};
        },
    };
}

export { createBindingPolicies };
