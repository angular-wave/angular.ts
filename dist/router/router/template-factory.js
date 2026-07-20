import { isDefined, isString, isFunction, isNullOrUndefined, isArray, keys } from '../../shared/utils.js';
import { annotate } from '../../core/di/di.js';
import { kebobString } from '../../shared/strings.js';

const DEFAULT_TEMPLATE = "<ng-view></ng-view>";
const BINDING_MATCH = /^([=<@&])[?]?(.*)/;
async function asTemplate(result) {
    return Promise.resolve(result).then(toTemplateResult);
}
async function asComponent(result) {
    return Promise.resolve(result).then(toComponentResult);
}
function toTemplateResult(str) {
    return { _template: str ?? undefined };
}
function toComponentResult(str) {
    return { _component: str };
}
function componentElementName(camelCase) {
    return kebobString(camelCase);
}
/**
 * Resolves route templates and components from state view declarations.
 */
class TemplateFactoryService {
    constructor(compileRegistry, $templateRequest, $injector) {
        this._compileRegistry = compileRegistry;
        this._templateRequest = $templateRequest;
        this._injector = $injector;
    }
    /**
     * Resolves a state's view config into either concrete template HTML or a component name.
     */
    /** @internal */
    async _fromConfig(config, params) {
        const { template, templateUrl, component } = config;
        if (isDefined(template)) {
            return asTemplate(TemplateFactoryService._fromString(template, params));
        }
        if (isDefined(templateUrl)) {
            return asTemplate(this._fromUrl(templateUrl, params));
        }
        if (isString(component)) {
            return asComponent(component);
        }
        if (isDefined(component)) {
            throw new Error("Inline route components must be normalized before loading");
        }
        return asTemplate(DEFAULT_TEMPLATE);
    }
    /**
     * Resolves a literal template string or template factory function.
     */
    /** @internal */
    static _fromString(template, params) {
        return isFunction(template) ? template(params) : template;
    }
    /**
     * Fetches a template from a static URL or a URL factory.
     */
    /** @internal */
    _fromUrl(url, params) {
        const templateUrl = isFunction(url) ? url(params) : url;
        if (isNullOrUndefined(templateUrl))
            return null;
        return this._getTemplateRequest()(templateUrl);
    }
    /**
     * Builds the HTML for a routed component and binds resolve data to its inputs.
     */
    /** @internal */
    _makeComponentTemplate(ngView, context, component, bindings) {
        bindings = bindings ?? {};
        const componentBindings = getComponentBindings(this._compileRegistry, component);
        const attrs = [];
        componentBindings.forEach((binding) => {
            attrs.push(componentAttributeTemplate(ngView, context, bindings, binding));
        });
        const kebobName = componentElementName(component);
        return `<${kebobName} ${attrs.join(" ")}></${kebobName}>`;
    }
    /** @internal */
    _getTemplateRequest() {
        return this._templateRequest;
    }
}
function componentAttributeTemplate(ngView, context, bindings, input) {
    const { name, type } = input;
    const attrName = componentElementName(name);
    const existingAttr = ngView.getAttribute(attrName);
    if (existingAttr && !bindings[name]) {
        return `${attrName}='${existingAttr}'`;
    }
    const boundName = bindings[name];
    const resolveName = boundName ? boundName : name;
    if (type === "@")
        return `${attrName}='{{$resolve.${resolveName}}}'`;
    if (type === "&") {
        const res = context.getResolvable(resolveName);
        const fn = res?.data;
        const args = fn && (isFunction(fn) || isArray(fn))
            ? annotate(fn)
            : [];
        const arrayIdxStr = isArray(fn) ? `[${String(fn.length - 1)}]` : "";
        return `${attrName}='$resolve.${resolveName}${arrayIdxStr}(${args.join(",")})'`;
    }
    return `${attrName}='$resolve.${resolveName}'`;
}
/**
 * Reads the binding declarations for a named component directive.
 */
function getComponentBindings(compileRegistry, name) {
    const componentBindings = compileRegistry.getComponentBindings(name);
    if (!componentBindings?.length) {
        throw new Error(`Unable to find component named '${name}'`);
    }
    const bindings = [];
    componentBindings.forEach((definition) => {
        scopeBindings(definition).forEach((binding) => {
            bindings.push(binding);
        });
    });
    return bindings;
}
function scopeBindings(bindingsObj) {
    const bindingKeys = keys(bindingsObj);
    const bindings = [];
    bindingKeys.forEach((key) => {
        const match = BINDING_MATCH.exec(bindingsObj[key] || "");
        if (match) {
            bindings.push({ name: match[2] ? match[2] : key, type: match[1] });
        }
    });
    return bindings;
}

export { TemplateFactoryService };
