import { $injectTokens } from "../../injection-tokens.js";
import {
  assertArgFn,
  assertNotHasOwnProperty,
  entries,
  isArray,
  isFunction,
  isObject,
  isString,
  minErr,
} from "../../shared/utils.js";

/**
 * @typedef {import("../../interface.ts").ControllerConstructor} ControllerConstructor
 * @typedef {import("../../interface.ts").Injectable<ControllerConstructor>} InjectableController
 * @typedef {import("./interface.ts").ControllerService} ControllerService
 * @typedef {import("./interface.ts").ControllerLocals} ControllerLocals
 * @typedef {import("./interface.ts").ControllerExpression} ControllerExpression
 */

const $controllerMinErr = minErr("$controller");

const CNTRL_REG = /^(\S+)(\s+as\s+([\w$]+))?$/;

/**
 * @param {string | InjectableController | undefined} controller
 * @param {string} [ident]
 * @returns {string|undefined}
 */
export function identifierForController(controller, ident) {
  if (ident && isString(ident)) return ident;

  if (isString(controller)) {
    const match = CNTRL_REG.exec(controller);

    if (match) return match[3];
  }

  return undefined;
}

/**
 * @param {unknown} def
 * @param {string} name
 * @returns {InjectableController}
 */
function normalizeControllerDef(def, name) {
  if (isArray(def)) return /** @type {any} */ (def);

  if (isFunction(def)) return /** @type {any} */ (def);

  throw $controllerMinErr(
    "ctrlreg",
    "Controller '{0}' must be a function or an array-annotated injectable.",
    name,
  );
}

/**
 * Extracts the underlying controller function from an injectable and provides
 * safe access to `name` and `prototype`.
 *
 * @param {InjectableController} injectable
 * @param {string} [argNameForErrors]
 * @returns {{ func: Function, name: string, prototype: any }}
 */
function unwrapController(injectable, argNameForErrors) {
  const candidate = isArray(injectable)
    ? injectable[injectable.length - 1]
    : injectable;

  // Defensive: should always hold if normalized, but keeps TS happy too.
  assertArgFn(candidate, argNameForErrors || "controller", true);

  /** @type {Function} */
  const func = /** @type {any} */ (candidate);

  return {
    func,
    name: func.name || "",
    prototype: func.prototype || null,
  };
}

export class ControllerProvider {
  constructor() {
    /** @type {Map<string, InjectableController>} @private */
    this.controllers = new Map();
  }

  /** @param {string} name @returns {boolean} */
  has(name) {
    return this.controllers.has(name);
  }

  /**
   * @param {string | Record<string, unknown>} name
   * @param {unknown} [constructor]
   */
  register(name, constructor) {
    if (isString(name)) {
      assertNotHasOwnProperty(name, "controller");
      this.controllers.set(name, normalizeControllerDef(constructor, name));

      return;
    }

    if (isObject(name)) {
      entries(name).forEach(([key, value]) => {
        this.controllers.set(key, normalizeControllerDef(value, key));
      });
    }
  }

  /**
   * @type {import("../../interface.ts").Injectable<($injector: ng.InjectorService) => ControllerService>}
   */
  $get = [
    $injectTokens._injector,

    /** @param {ng.InjectorService} $injector @returns {ControllerService} */
    ($injector) => {
      /** @type {ControllerProvider} */
      const provider = this;

      return (expression, locals, later, ident) => {
        /** @type {any} */
        let instance;

        /** @type {string | undefined} */
        let constructorName;

        /** @type {string | null} */
        let identifier = ident && isString(ident) ? ident : null;

        later = later === true;

        if (isString(expression)) {
          const match = /** @type {string} */ (expression).match(CNTRL_REG);

          if (!match) {
            throw $controllerMinErr(
              "ctrlfmt",
              "Badly formed controller string '{0}'. Must match `__name__ as __id__` or `__name__`.",
              expression,
            );
          }

          constructorName = match[1];
          identifier = identifier || match[3] || null;

          const lookedUp = provider.controllers.get(constructorName);

          if (!lookedUp) {
            throw $controllerMinErr(
              "ctrlreg",
              "The controller with the name '{0}' is not registered.",
              constructorName,
            );
          }

          expression = lookedUp;
          assertArgFn(expression, constructorName, true);
        }

        /** @type {InjectableController} */
        const injectable = /** @type {any} */ (expression);

        const meta = unwrapController(injectable, constructorName);

        if (later) {
          instance = Object.create(meta.prototype || null);

          const exportName = constructorName || meta.name;

          if (identifier) {
            instance.$controllerIdentifier = identifier;
            provider.addIdentifier(locals, identifier, instance, exportName);
          }

          if (instance?.constructor?.$scopename && locals?.$scope) {
            locals.$scope.$scopename = instance.constructor.$scopename;
          }

          return () => {
            const result = $injector.invoke(
              injectable,
              instance,
              locals,
              constructorName,
            );

            if (
              result !== instance &&
              (isObject(result) || isFunction(result))
            ) {
              instance = result;

              if (identifier) {
                instance.$controllerIdentifier = identifier;
                provider.addIdentifier(
                  locals,
                  identifier,
                  instance,
                  exportName,
                );
              }
            }

            return instance;
          };
        }

        instance = $injector.instantiate(
          /** @type {any} */ (injectable),
          locals,
          constructorName,
        );

        if (identifier) {
          provider.addIdentifier(
            locals,
            identifier,
            instance,
            constructorName || meta.name,
          );
        }

        return instance;
      };
    },
  ];

  /**
   * @param {ControllerLocals | undefined} locals
   * @param {string} identifier
   * @param {object} instance
   * @param {string} name
   */
  addIdentifier(locals, identifier, instance, name) {
    if (!(locals && isObject(locals.$scope))) {
      throw minErr("$controller")(
        "noscp",
        "Cannot export controller '{0}' as '{1}'! No $scope object provided via `locals`.",
        name,
        identifier,
      );
    }
    locals.$scope[identifier] = instance;
    locals.$scope.$controllerIdentifier = identifier;
  }
}
