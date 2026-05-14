import { uppercase, isFunction } from '../../shared/utils.js';
import { getCacheData, getInheritedData } from '../../shared/dom.js';
import { ResolveContext } from '../resolve/resolve-context.js';

const controllerRegisteredScopes = new WeakMap();
const controllerLastParamsChangedTransition = new WeakMap();
function appendParamSchema(nodes, schema) {
    for (let i = 0; i < nodes.length; i++) {
        const nodeSchema = nodes[i].paramSchema;
        for (let j = 0; j < nodeSchema.length; j++) {
            schema.push(nodeSchema[j]);
        }
    }
}
function controllerKeyData(element, key) {
    return (getCacheData(element, key) ||
        getInheritedData(element, key));
}
/** @internal */
function getComponentController(element, componentName, tagRegexp) {
    const candidates = element.querySelectorAll("*");
    let directiveEl;
    for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        if (candidate.tagName && tagRegexp.exec(candidate.tagName)) {
            directiveEl = candidate;
            break;
        }
    }
    if (!directiveEl)
        return undefined;
    const camelNameFromTag = directiveEl.tagName
        .toLowerCase()
        .replace(/-([a-z])/g, (_all, letter) => uppercase(letter));
    const scopeWithCtrl = getCacheData(directiveEl, "$isolateScope") ||
        getInheritedData(directiveEl, "$isolateScope") ||
        getCacheData(directiveEl, "$scope") ||
        getInheritedData(directiveEl, "$scope");
    return (controllerKeyData(directiveEl, `$${componentName}Controller`) ||
        controllerKeyData(directiveEl, `$${camelNameFromTag}Controller`) ||
        controllerKeyData(directiveEl, "$ngControllerController") ||
        scopeWithCtrl?.$ctrl);
}
/** @ignore incrementing id */
let _ngCanExitId = 0;
/**
 * Registers component/controller transition lifecycle callbacks for an active view.
 *
 * @internal
 */
function registerViewControllerCallbacks($transitions, controllerInstance, $scope, cfg) {
    let registeredScopes = controllerRegisteredScopes.get(controllerInstance);
    if (!registeredScopes) {
        registeredScopes = new WeakSet();
        controllerRegisteredScopes.set(controllerInstance, registeredScopes);
    }
    if (registeredScopes.has($scope)) {
        return;
    }
    registeredScopes.add($scope);
    // Call $onInit() ASAP
    const onInit = controllerInstance.$onInit;
    if (isFunction(onInit) && !cfg._viewDecl.component) {
        onInit();
    }
    const viewState = cfg._path[cfg._path.length - 1].state.self;
    const hookOptions = { bind: controllerInstance };
    // Add component-level hook for ngOnParamsChanged
    if (isFunction(controllerInstance.ngOnParamsChanged)) {
        const onParamsChanged = controllerInstance.ngOnParamsChanged;
        const resolveContext = new ResolveContext(cfg._path, cfg._factory?._injector);
        const viewCreationTrans = resolveContext.getResolvable("$transition$")
            .data;
        // Fire callback on any successful transition
        const paramsUpdated = ($transition$) => {
            if (!$transition$)
                return;
            if (controllerLastParamsChangedTransition.get(controllerInstance) ===
                $transition$) {
                return;
            }
            controllerLastParamsChangedTransition.set(controllerInstance, $transition$);
            // Exit early if the $transition$ is the same as the view was created within.
            // Exit early if the $transition$ will exit the state the view is for.
            if ($transition$ === viewCreationTrans ||
                $transition$.exiting().includes(viewState)) {
                return;
            }
            const toParams = $transition$.params("to");
            const fromParams = $transition$.params("from");
            const toNodes = $transition$._treeChanges.to || [];
            const fromNodes = $transition$._treeChanges.from || [];
            const toSchema = [];
            appendParamSchema(toNodes, toSchema);
            const fromSchema = [];
            appendParamSchema(fromNodes, fromSchema);
            // Find the to params that have different values than the from params
            const changedToParams = [];
            for (let i = 0; i < toSchema.length; i++) {
                const param = toSchema[i];
                const idx = fromSchema.indexOf(param);
                if (idx === -1 ||
                    !fromSchema[idx].type.equals(toParams[param.id], fromParams[param.id])) {
                    changedToParams.push(param);
                }
            }
            // Only trigger callback if a to param has changed or is new
            if (changedToParams.length) {
                // Filter the params to only changed/new to params. `$transition$.params()` may be used to get all params.
                const newValues = {};
                for (let i = 0; i < changedToParams.length; i++) {
                    const param = changedToParams[i];
                    const key = param.id;
                    if (key in toParams)
                        newValues[key] = toParams[key];
                }
                onParamsChanged.call(controllerInstance, newValues, $transition$);
            }
        };
        const hookRegistryKey = [
            viewState?.name || "",
            cfg._viewDecl._ngViewName || "$default",
            cfg._viewDecl._ngViewContextAnchor || "^",
        ].join("::");
        const rootScope = $scope.$root;
        const registryProp = "__ngRouterParamsChangedHooks__";
        const hookRegistry = (rootScope[registryProp] ||
            (rootScope[registryProp] = new Map()));
        hookRegistry.get(hookRegistryKey)?.();
        const deregisterParamsHook = $transitions.onSuccess({}, paramsUpdated, hookOptions);
        hookRegistry.set(hookRegistryKey, deregisterParamsHook);
        $scope.$on("$destroy", () => {
            if (hookRegistry.get(hookRegistryKey) === deregisterParamsHook) {
                hookRegistry.delete(hookRegistryKey);
            }
            deregisterParamsHook();
        });
    }
    // Add component-level hook for ngCanExit
    if (isFunction(controllerInstance.ngCanExit)) {
        const ngCanExit = controllerInstance.ngCanExit;
        const id = _ngCanExitId++;
        /**
         * Returns true if any transition in the redirect chain already answered truthy.
         */
        const prevTruthyAnswer = (trans) => {
            if (!trans)
                return false;
            const cache = trans._ngCanExitIds;
            return (cache?.[id] === true ||
                prevTruthyAnswer(trans._options.redirectedFrom || null));
        };
        // If a user answered yes, but the transition was later redirected, don't also ask for the new redirect transition
        const wrappedHook = (trans) => {
            let promise;
            const cacheTrans = trans;
            const ids = (cacheTrans._ngCanExitIds = cacheTrans._ngCanExitIds || {});
            if (!prevTruthyAnswer(trans)) {
                promise = Promise.resolve(ngCanExit.call(controllerInstance, trans));
                void promise.then((val) => (ids[id] = val !== false));
            }
            return promise;
        };
        const criteria = { exiting: viewState.name };
        $scope.$on("$destroy", $transitions.onBefore(criteria, wrappedHook, hookOptions));
    }
}

export { getComponentController, registerViewControllerCallbacks };
