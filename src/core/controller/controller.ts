import { _injector } from "../../injection-tokens.ts";
import type { ControllerConstructor, Injectable } from "../../interface.ts";
import {
  assertArgFn,
  assertNotHasOwnProperty,
  createObject,
  isArray,
  isFunction,
  isObject,
  keys,
  createErrorFactory,
  isString,
} from "../../shared/utils.ts";

export interface ControllerLocals {
  $scope: ng.Scope;
  $element: Node;
}

export type ControllerExpression = string | Injectable<ControllerConstructor>;

export type ControllerService = (
  expression: ControllerExpression,
  locals?: ControllerLocals,
  later?: boolean,
  ident?: string,
) => any;

type InjectableController = Injectable<ControllerConstructor>;

type ControllerInstance = Record<string, unknown> & {
  $controllerIdentifier?: string;
  constructor?: { $scopename?: string };
};

const $controllerError = createErrorFactory("$controller");

const CNTRL_REG = /^(\S+)(\s+as\s+([\w$]+))?$/;

export function identifierForController(
  controller: string | InjectableController | undefined,
  ident?: string,
): string | undefined {
  if (ident && isString(ident)) {
    return ident;
  }

  if (isString(controller)) {
    const match = CNTRL_REG.exec(controller);

    return match?.[3];
  }

  return undefined;
}

function normalizeControllerDef(
  def: unknown,
  name: string,
): InjectableController {
  if (isArray(def) || isFunction(def)) {
    return def as InjectableController;
  }

  throw $controllerError(
    "ctrlreg",
    "Controller '{0}' must be a function or an array-annotated injectable.",
    name,
  );
}

function unwrapController(
  injectable: InjectableController,
  argNameForErrors?: string,
): { func: ControllerConstructor; name: string; prototype: object | null } {
  const candidate = isArray(injectable)
    ? injectable[injectable.length - 1]
    : injectable;

  assertArgFn(candidate, argNameForErrors || "controller", true);

  const func = candidate as ControllerConstructor;

  const funcMetadata = func as unknown as {
    name?: string;
    prototype?: object | null;
  };

  return {
    func,
    name: funcMetadata.name || "",
    prototype: funcMetadata.prototype || null,
  };
}

export class ControllerProvider {
  /** @internal */
  _controllers: Map<string, InjectableController>;
  $get: [string, ($injector: ng.InjectorService) => ControllerService];

  constructor() {
    this._controllers = new Map();
    this.$get = [
      _injector,
      ($injector): ControllerService => {
        return (expression, locals, later, ident) => {
          let instance: ControllerInstance;

          let constructorName: string | undefined;

          let identifier = ident && isString(ident) ? ident : null;

          later = later === true;

          if (isString(expression)) {
            const match = CNTRL_REG.exec(expression);

            if (!match) {
              throw $controllerError(
                "ctrlfmt",
                "Badly formed controller string '{0}'. Must match `__name__ as __id__` or `__name__`.",
                expression,
              );
            }

            constructorName = match[1];
            identifier = identifier || match[3] || null;

            const lookedUp = this._controllers.get(constructorName);

            if (!lookedUp) {
              throw $controllerError(
                "ctrlreg",
                "The controller with the name '{0}' is not registered.",
                constructorName,
              );
            }

            expression = lookedUp;
            assertArgFn(expression, constructorName, true);
          }

          const injectable = expression as InjectableController;

          const meta = unwrapController(injectable, constructorName);

          if (later) {
            instance = createObject(
              meta.prototype || null,
            ) as ControllerInstance;
            const exportName = constructorName || meta.name;

            if (identifier) {
              instance.$controllerIdentifier = identifier;
              this._addIdentifier(locals, identifier, instance, exportName);
            }

            if (instance.constructor?.$scopename && locals?.$scope) {
              (locals.$scope as Record<string, unknown>).$scopename =
                instance.constructor.$scopename;
            }

            return () => {
              const result = $injector.invoke(
                injectable,
                instance,
                locals,
                constructorName,
              ) as unknown;

              if (
                result !== instance &&
                (isObject(result) || isFunction(result))
              ) {
                instance = result as ControllerInstance;

                if (identifier) {
                  instance.$controllerIdentifier = identifier;
                  this._addIdentifier(locals, identifier, instance, exportName);
                }
              }

              return instance;
            };
          }

          instance = $injector.instantiate(
            injectable as any,
            locals,
            constructorName,
          ) as ControllerInstance;

          if (identifier) {
            this._addIdentifier(
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
  }

  has(name: string): boolean {
    return this._controllers.has(name);
  }

  register(
    name: string | Record<string, unknown>,
    constructor?: unknown,
  ): void {
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

  /** @internal */
  _addIdentifier(
    locals: ControllerLocals | undefined,
    identifier: string,
    instance: object,
    name: string,
  ): void {
    if (!(locals && isObject(locals.$scope))) {
      throw $controllerError(
        "noscp",
        "Cannot export controller '{0}' as '{1}'! No $scope object provided via `locals`.",
        name,
        identifier,
      );
    }

    const scope = locals.$scope as Record<string, unknown>;

    scope[identifier] = instance;
    scope.$controllerIdentifier = identifier;
  }
}
