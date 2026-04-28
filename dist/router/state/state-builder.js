import { assign, createObject, isString, isArray, hasOwn, isDefined, entries, keys, isFunction } from '../../shared/utils.js';
import { stringify } from '../../shared/strings.js';
import { ResolveContext } from '../resolve/resolve-context.js';
import { Resolvable } from '../resolve/resolvable.js';
import { annotate } from '../../core/di/di.js';
import { ViewConfig } from './views.js';

/**
 * @param {unknown} url
 */
function parseUrl(url) {
    if (!isString(url))
        return false;
    const root = url.charAt(0) === "^";
    return { val: root ? url.substring(1) : url, root };
}
function buildUrl(stateObject, $url, root) {
    const stateDec = stateObject.self;
    const { parent } = stateObject;
    const parsed = parseUrl(stateDec.url);
    const url = (!parsed ? stateDec.url : $url.compile(parsed.val, { state: stateDec }));
    if (!url)
        return null;
    if (!$url.isMatcher(url))
        throw new Error(`Invalid url '${url}' in state '${stateObject}'`);
    return parsed && parsed.root
        ? url
        : ((parent && parent.navigable) || root).url.append(url);
}
/**
 * @param {ParamFactory} paramFactory
 */
function buildParams(state, paramFactory) {
    const urlParams = (state.url && state.url.parameters({ inherit: false })) || [];
    const params = {};
    urlParams.forEach((param) => {
        params[param.id] = param;
    });
    const paramConfigs = state.params || {};
    const paramConfigKeys = keys(paramConfigs);
    paramConfigKeys.forEach((id) => {
        if (!hasOwn(params, id)) {
            params[id] = paramFactory.fromConfig(id, null, state.self);
        }
    });
    return params;
}
function hasAnyViewKey(keyItems, obj) {
    for (let i = 0; i < keyItems.length; i++) {
        if (isDefined(obj[keyItems[i]])) {
            return true;
        }
    }
    return false;
}
function viewsBuilder(state) {
    if (!state.parent) {
        return {};
    }
    const tplKeys = [
        "templateProvider",
        "templateUrl",
        "template",
        "notify",
        "async",
    ];
    const ctrlKeys = ["controller", "controllerAs", "resolveAs"];
    const compKeys = ["component", "bindings"];
    const nonCompKeys = tplKeys.concat(ctrlKeys);
    const allViewKeys = compKeys.concat(nonCompKeys);
    if (isDefined(state.views) && hasAnyViewKey(allViewKeys, state)) {
        throw new Error(`State '${state.name}' has a 'views' object. ` +
            `It cannot also have view properties at the state level. ` +
            `Move these properties into a view declaration: ` +
            `${allViewKeys.filter((key) => isDefined(state[key])).join(", ")}`);
    }
    const views = {};
    const defaultViewConfig = {};
    allViewKeys.forEach((key) => {
        if (isDefined(state[key])) {
            defaultViewConfig[key] = state[key];
        }
    });
    const viewsObject = (state.views || {
        $default: defaultViewConfig,
    });
    const viewEntries = entries(viewsObject);
    viewEntries.forEach(([entryName, entryConfig]) => {
        let name = entryName;
        let config = entryConfig;
        name = name || "$default";
        if (isString(config)) {
            config = { component: config };
        }
        config = assign({}, config);
        if (hasAnyViewKey(compKeys, config) && hasAnyViewKey(nonCompKeys, config)) {
            throw new Error(`Cannot combine: ${compKeys.join("|")} with: ${nonCompKeys.join("|")} in state view '${name}@${state.name}'`);
        }
        config.resolveAs = config.resolveAs || "$resolve";
        config.$context = state;
        config.$name = name;
        const normalized = ViewConfig.normalizeNgViewTarget(config.$context, config.$name);
        config.$ngViewName = normalized.ngViewName;
        config.$ngViewContextAnchor = normalized.ngViewContextAnchor;
        views[name] = config;
    });
    return views;
}
function getResolveLocals(ctx) {
    const tokens = ctx.getTokens().filter(isString);
    const locals = {};
    for (let i = 0; i < tokens.length; i++) {
        const key = tokens[i];
        const resolvable = ctx.getResolvable(key);
        locals[key] = resolvable.data;
    }
    return locals;
}
function valueToResolvable(token, value, strictDi) {
    if (isArray(value)) {
        return new Resolvable(token, value[value.length - 1], value.slice(0, -1));
    }
    if (isFunction(value)) {
        return new Resolvable(token, value, annotate(value, strictDi));
    }
    throw new Error(`Invalid resolve value: ${stringify({ token, val: value })}`);
}
function literalToResolvable(literal) {
    if (literal &&
        hasOwn(literal, "token") &&
        (hasOwn(literal, "resolveFn") || hasOwn(literal, "data"))) {
        return new Resolvable(literal);
    }
    throw new Error(`Invalid resolve value: ${stringify(literal)}`);
}
/**
 * Builds the `resolve:` block on a [[StateDeclaration]].
 *
 * When the [[StateBuilder]] builds a [[StateObject]] object from a raw [[StateDeclaration]], this function
 * validates the `resolve` property and converts it to a [[Resolvable]] array.
 *
 * resolve: input value can be:
 *
 * {
 *   // analyzed but not injected
 *   myFooResolve: function() { return "myFooData"; },
 *
 *   // function.toString() parsed, "DependencyName" dep as string (not min-safe)
 *   myBarResolve: function(DependencyName) { return DependencyName.fetchSomethingAsPromise() },
 *
 *   // Array split; "DependencyName" dep as string
 *   myBazResolve: [ "DependencyName", function(dep) { return dep.fetchSomethingAsPromise() },
 *
 *   // Array split; DependencyType dep as token (compared using ===)
 *   myQuxResolve: [ DependencyType, function(dep) { return dep.fetchSometingAsPromise() },
 *
 *   // val.$inject used as deps
 *   // where:
 *   //     corgeResolve.$inject = ["DependencyName"];
 *   //     function corgeResolve(dep) { dep.fetchSometingAsPromise() }
 *   // then "DependencyName" dep as string
 *   myCorgeResolve: corgeResolve,
 *
 * }
 *
 * or:
 *
 * [
 *   { token: "myFooResolve", resolveFn: function() { return "myFooData" } },
 *   { token: "myBarResolve", resolveFn: function(dep) { return dep.fetchSomethingAsPromise() }, deps: [ "DependencyName" ] },
 *   { token: "myBazResolve", resolveFn: function(dep) { return dep.fetchSomethingAsPromise() }, deps: [ "DependencyName" ] }
 * ]
 * @param {ng.StateObject & ng.StateDeclaration} state
 * @param {boolean | undefined} strictDi
 */
function resolvablesBuilder(state, strictDi) {
    const decl = state.resolve;
    const resolvables = [];
    if (isArray(decl)) {
        decl.forEach((literal) => {
            resolvables.push(literalToResolvable(literal));
        });
        return resolvables;
    }
    const resolveObj = decl || {};
    const resolveKeys = keys(resolveObj);
    resolveKeys.forEach((token) => {
        resolvables.push(valueToResolvable(token, resolveObj[token], strictDi));
    });
    return resolvables;
}
/**
 * A internal global service
 *
 * StateBuilder is a factory for the internal [[StateObject]] objects.
 *
 * When you register a state with the [[StateRegistry]], you register a plain old javascript object which
 * conforms to the [[StateDeclaration]] interface.  This factory takes that object and builds the corresponding
 * [[StateObject]] object, which has an API and is used internally.
 *
 */
class StateBuilder {
    /**
     * @param {StateMatcher} matcher
     * @param {ng.UrlService} urlService
     */
    constructor(matcher, urlService) {
        this._matcher = matcher;
        this._$injector = undefined;
        this._paramFactory = urlService._paramFactory;
        this._urlService = urlService;
    }
    _buildStateHook(stateObject, hookName) {
        const hook = stateObject[hookName];
        if (!hook)
            return undefined;
        const pathname = hookName === "onExit" ? "from" : "to";
        return (trans, state) => {
            const $injector = this._$injector;
            const resolveContext = new ResolveContext(trans.treeChanges(pathname), $injector);
            const subContext = resolveContext.subContext(state._state());
            const locals = assign(getResolveLocals(subContext), {
                $state$: state,
                $transition$: trans,
            });
            return $injector.invoke(hook, this, locals);
        };
    }
    /**
     * Builds all of the properties on an essentially blank State object, returning a State object which has all its
     * properties and API built.
     *
     * @param {ng.StateObject} state an uninitialized State object
     * @returns {ng.StateObject | null} the built State object
     */
    /** @internal */
    _build(state) {
        const { _matcher: matcher, _urlService: urlService } = this;
        const parent = this._parentName(state);
        if (parent && !matcher.find(parent, undefined, false)) {
            return null;
        }
        state.parent = isRoot(state)
            ? null
            : matcher.find(parent) || matcher.find("");
        state.url = buildUrl(state, urlService, matcher.find(""));
        state.resolvables = resolvablesBuilder(state, this._$injector && this._$injector.strictDi);
        state.onExit = this._buildStateHook(state, "onExit");
        state.onRetain = this._buildStateHook(state, "onRetain");
        state.onEnter = this._buildStateHook(state, "onEnter");
        state.navigable =
            !isRoot(state) && state.url
                ? state
                : state.parent
                    ? state.parent.navigable
                    : null;
        state.params = buildParams(state, this._paramFactory);
        if (state.parent && state.parent.data) {
            state.data = state.self.data = assign(createObject(state.parent.data), state.data);
        }
        state.path = state.parent
            ? (state.parent.path || []).concat(state)
            : [state];
        state.includes = state.parent ? assign({}, state.parent.includes) : {};
        state.includes[state.name] = true;
        state._views = viewsBuilder(state);
        return state;
    }
    /**
     *
     * @param {ng.StateObject} state
     * @returns {string}
     */
    /** @internal */
    _parentName(state) {
        const rawName = (state.self && state.self.name) || state.name || "";
        const name = rawName;
        const segments = name.split(".");
        segments.pop();
        if (segments.length) {
            if (state.parent) {
                throw new Error(`States that specify the 'parent:' property should not have a '.' in their name (${name})`);
            }
            // 'foo.bar'
            return segments.join(".");
        }
        if (!state.parent)
            return "";
        return isString(state.parent) ? state.parent : state.parent.name;
    }
    /** @internal */
    _name(state) {
        const name = (state.self && state.self.name) || state.name;
        if (name.indexOf(".") !== -1 || !state.parent)
            return name;
        const parentName = isString(state.parent)
            ? state.parent
            : state.parent.name;
        return parentName ? `${parentName}.${name}` : name;
    }
}
/**
 * @param {ng.StateObject} state
 * @returns {boolean}
 */
function isRoot(state) {
    return state.name === "";
}

export { StateBuilder };
