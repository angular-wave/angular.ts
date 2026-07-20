import { isString, assertNotHasOwnProperty, isObject, keys, isArray, isFunction, createErrorFactory, assertArgFn, createObject } from '../../shared/utils.js';

const $controllerError = createErrorFactory("$controller");
const CNTRL_REG = /^(\S+)(\s+as\s+([\w$]+))?$/;
function identifierForController(controller, ident) {
    if (ident && isString(ident)) {
        return ident;
    }
    if (isString(controller)) {
        const match = CNTRL_REG.exec(controller);
        return match?.[3];
    }
    return undefined;
}
function normalizeControllerDef(def, name) {
    if (isArray(def) || isFunction(def)) {
        return def;
    }
    throw $controllerError("ctrlreg", "Controller '{0}' must be a function or an array-annotated injectable.", name);
}
function unwrapController(injectable, argNameForErrors) {
    const candidate = isArray(injectable)
        ? injectable[injectable.length - 1]
        : injectable;
    assertArgFn(candidate, argNameForErrors ?? "controller", true);
    const func = candidate;
    const funcMetadata = func;
    return {
        func,
        name: funcMetadata.name ?? "",
        prototype: funcMetadata.prototype ?? null,
    };
}
/** @internal */
class ControllerRegistry {
    constructor() {
        this._controllers = new Map();
        this._destroyed = false;
    }
    has(name) {
        this.assertActive();
        return this._controllers.has(name);
    }
    get(name) {
        this.assertActive();
        return this._controllers.get(name);
    }
    register(name, constructor) {
        this.assertActive();
        if (isString(name)) {
            assertNotHasOwnProperty(name, "controller");
            this._controllers.set(name, normalizeControllerDef(constructor, name));
            return;
        }
        if (isObject(name)) {
            const controllerNames = keys(name);
            controllerNames.forEach((key) => {
                const value = name[key];
                this._controllers.set(key, normalizeControllerDef(value, key));
            });
        }
    }
    destroy() {
        if (this._destroyed)
            return;
        this._destroyed = true;
        this._controllers.clear();
    }
    assertActive() {
        if (this._destroyed) {
            throw new Error("Controller registry has already been disposed.");
        }
    }
}
function addIdentifier(locals, identifier, instance, name) {
    if (!(locals && isObject(locals.$scope))) {
        throw $controllerError("noscp", "Cannot export controller '{0}' as '{1}'! No $scope object provided via `locals`.", name, identifier);
    }
    const scope = locals.$scope;
    scope[identifier] = instance;
    scope.$controllerIdentifier = identifier;
}
/** @internal */
function createControllerService(registry, $injector) {
    return (expression, locals, later, ident) => {
        let instance;
        let constructorName;
        let identifier = ident && isString(ident) ? ident : null;
        later = later === true;
        if (isString(expression)) {
            const match = CNTRL_REG.exec(expression);
            if (!match) {
                throw $controllerError("ctrlfmt", "Badly formed controller string '{0}'. Must match `__name__ as __id__` or `__name__`.", expression);
            }
            const [, matchedConstructorName, , matchedIdentifier] = match;
            constructorName = matchedConstructorName;
            identifier = (identifier ?? matchedIdentifier) || null;
            const lookedUp = registry.get(constructorName);
            if (!lookedUp) {
                throw $controllerError("ctrlreg", "The controller with the name '{0}' is not registered.", constructorName);
            }
            expression = lookedUp;
            assertArgFn(expression, constructorName, true);
        }
        const injectable = expression;
        const meta = unwrapController(injectable, constructorName);
        if (later) {
            instance = createObject(meta.prototype ?? null);
            const exportName = constructorName ?? meta.name;
            if (identifier) {
                instance.$controllerIdentifier = identifier;
                addIdentifier(locals, identifier, instance, exportName);
            }
            if (instance.constructor?.$scopename && locals?.$scope) {
                locals.$scope.$scopename =
                    instance.constructor.$scopename;
            }
            return () => {
                const result = $injector.invoke(injectable, instance, locals, constructorName);
                if (result !== instance && (isObject(result) || isFunction(result))) {
                    instance = result;
                    if (identifier) {
                        instance.$controllerIdentifier = identifier;
                        addIdentifier(locals, identifier, instance, exportName);
                    }
                }
                return instance;
            };
        }
        instance = $injector.instantiate(injectable, locals, constructorName);
        if (identifier) {
            addIdentifier(locals, identifier, instance, constructorName ?? meta.name);
        }
        return instance;
    };
}

export { ControllerRegistry, createControllerService, identifierForController };
