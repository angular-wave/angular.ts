import { _http, _templateCache, _templateRequest, _injector } from '../injection-tokens.js';
import { isFunction, isNullOrUndefined, isArray, isDefined, isObject, keys } from '../shared/utils.js';
import { annotate } from '../core/di/di.js';
import { DirectiveSuffix } from '../core/compile/compile.js';
import { kebobString } from '../shared/strings.js';
import { Resolvable } from './resolve/resolvable.js';

/**
 * Resolves route templates and components from state view declarations.
 */
class TemplateFactoryProvider {
    constructor() {
        /**
         * Wires HTTP, template request, cache, and injector services into the factory.
         */
        this.$get = [
            _http,
            _templateCache,
            _templateRequest,
            _injector,
            ($http, $templateCache, $templateRequest, $injector) => {
                this._templateRequest = $templateRequest;
                this._http = $http;
                this._templateCache = $templateCache;
                this._injector = $injector;
                return this;
            },
        ];
    }
    /**
     * Resolves a state's view config into either concrete template HTML or a component name.
     */
    fromConfig(config, params, context) {
        const defaultTemplate = "<ng-view></ng-view>";
        const asTemplate = (result) => Promise.resolve(result).then((str) => ({ template: str }));
        const asComponent = (result) => Promise.resolve(result).then((str) => ({ component: str }));
        const getConfigType = (configParam) => {
            if (isDefined(configParam.template))
                return "template";
            if (isDefined(configParam.templateUrl))
                return "templateUrl";
            if (isDefined(configParam.templateProvider))
                return "templateProvider";
            if (isDefined(configParam.component))
                return "component";
            return "default";
        };
        switch (getConfigType(config)) {
            case "template":
                return asTemplate(this.fromString(config.template, params));
            case "templateUrl":
                return asTemplate(this.fromUrl(config.templateUrl, params));
            case "templateProvider":
                return asTemplate(this.fromProvider(config.templateProvider, params, context));
            case "component":
                return asComponent(config.component);
            default:
                return asTemplate(defaultTemplate);
        }
    }
    /**
     * Resolves a literal template string or template factory function.
     */
    fromString(template, params) {
        return isFunction(template) ? template(params) : template;
    }
    /**
     * Fetches a template from a static URL or a URL factory.
     */
    fromUrl(url, params) {
        if (isFunction(url))
            url = url(params);
        if (isNullOrUndefined(url))
            return null;
        return this._templateRequest(url);
    }
    fromProvider(provider, _params, context) {
        const deps = annotate(provider);
        const providerFn = isArray(provider)
            ? provider[provider.length - 1]
            : provider;
        const resolvable = new Resolvable("", providerFn, deps);
        return resolvable.get(context);
    }
    /**
     * Builds the HTML for a routed component and binds resolve data to its inputs.
     */
    makeComponentTemplate(ngView, context, component, bindings) {
        bindings = bindings || {};
        const kebob = (camelCase) => {
            const kebobed = kebobString(camelCase);
            return /^(x|data)-/.exec(kebobed) ? `x-${kebobed}` : kebobed;
        };
        const attributeTpl = (input) => {
            const { name, type } = input;
            const attrName = kebob(name);
            if (ngView.getAttribute(attrName) && !bindings[name]) {
                return `${attrName}='${ngView.getAttribute(attrName)}'`;
            }
            const resolveName = bindings[name] || name;
            if (type === "@")
                return `${attrName}='{{$resolve.${resolveName}}}'`;
            if (type === "&") {
                const res = context.getResolvable(resolveName);
                const fn = res && res.data;
                const args = (fn && annotate(fn)) || [];
                const arrayIdxStr = isArray(fn) ? `[${fn.length - 1}]` : "";
                return `${attrName}='$resolve.${resolveName}${arrayIdxStr}(${args.join(",")})'`;
            }
            return `${attrName}='$resolve.${resolveName}'`;
        };
        const attrs = getComponentBindings(this._injector, component)
            .map(attributeTpl)
            .join(" ");
        const kebobName = kebob(component);
        return `<${kebobName} ${attrs}></${kebobName}>`;
    }
}
/**
 * Reads the binding declarations for a named component directive.
 */
function getComponentBindings($injector, name) {
    const cmpDefs = $injector?.get(name + DirectiveSuffix);
    if (!cmpDefs || !cmpDefs.length) {
        throw new Error(`Unable to find component named '${name}'`);
    }
    const bindings = [];
    cmpDefs.forEach((def) => {
        const defBindings = getBindings(def);
        defBindings.forEach((binding) => {
            bindings.push(binding);
        });
    });
    return bindings;
}
const getBindings = (def) => {
    if (isObject(def.bindToController)) {
        return scopeBindings(def.bindToController);
    }
    return scopeBindings(def.scope);
};
const scopeBindings = (bindingsObj) => {
    const bindingKeys = keys(bindingsObj || {});
    const bindings = [];
    bindingKeys.forEach((key) => {
        const match = /^([=<@&])[?]?(.*)/.exec(bindingsObj[key] || "");
        if (match) {
            bindings.push({ name: match[2] || key, type: match[1] });
        }
    });
    return bindings;
};

export { TemplateFactoryProvider };
