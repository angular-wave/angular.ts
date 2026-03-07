import { $injectTokens } from "../../injection-tokens.js";
import type { ControllerConstructor, Injectable } from "../../interface.ts";
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
import type {
  ControllerExpression,
  ControllerLocals,
  ControllerService,
} from "./interface.ts";

type InjectableController = Injectable<ControllerConstructor>;
type ControllerInstance = Record<string, any>;

const $controllerMinErr = minErr("$controller");
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

  throw $controllerMinErr(
    "ctrlreg",
    "Controller '{0}' must be a function or an array-annotated injectable.",
    name,
  );
}

function unwrapController(
  injectable: InjectableController,
  argNameForErrors?: string,
): { func: Function; name: string; prototype: object | null } {
  const candidate = isArray(injectable)
    ? injectable[injectable.length - 1]
    : injectable;

  assertArgFn(candidate, argNameForErrors || "controller", true);

  const func = candidate as Function;

  return {
    func,
    name: func.name || "",
    prototype: (func.prototype as object | null) || null,
  };
}

export class ControllerProvider {
  controllers: Map<string, InjectableController>;
  $get: [string, ($injector: ng.InjectorService) => ControllerService];

  constructor() {
    this.controllers = new Map();
    this.$get = [
      $injectTokens._injector,
      ($injector): ControllerService => {
        return (expression, locals, later, ident) => {
          let instance: any;
          let constructorName: string | undefined;
          let identifier = ident && isString(ident) ? ident : null;

          later = later === true;

          if (isString(expression)) {
            const match = expression.match(CNTRL_REG);

            if (!match) {
              throw $controllerMinErr(
                "ctrlfmt",
                "Badly formed controller string '{0}'. Must match `__name__ as __id__` or `__name__`.",
                expression,
              );
            }

            constructorName = match[1];
            identifier = identifier || match[3] || null;

            const lookedUp = this.controllers.get(constructorName);

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

          const injectable = expression as InjectableController;
          const meta = unwrapController(injectable, constructorName);

          if (later) {
            instance = Object.create(
              meta.prototype || null,
            ) as ControllerInstance;
            const exportName = constructorName || meta.name;

            if (identifier) {
              instance.$controllerIdentifier = identifier;
              this.addIdentifier(locals, identifier, instance, exportName);
            }

            if (instance?.constructor?.$scopename && locals?.$scope) {
              (locals.$scope as any).$scopename =
                instance.constructor.$scopename;
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
                  this.addIdentifier(locals, identifier, instance, exportName);
                }
              }

              return instance;
            };
          }

          instance = $injector.instantiate(
            injectable as any,
            locals,
            constructorName,
          );

          if (identifier) {
            this.addIdentifier(
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
    return this.controllers.has(name);
  }

  register(
    name: string | Record<string, unknown>,
    constructor?: unknown,
  ): void {
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

  addIdentifier(
    locals: ControllerLocals | undefined,
    identifier: string,
    instance: object,
    name: string,
  ): void {
    if (!(locals && isObject(locals.$scope))) {
      throw minErr("$controller")(
        "noscp",
        "Cannot export controller '{0}' as '{1}'! No $scope object provided via `locals`.",
        name,
        identifier,
      );
    }

    (locals.$scope as any)[identifier] = instance;
    (locals.$scope as any).$controllerIdentifier = identifier;
  }
}

export type { ControllerExpression, ControllerLocals, ControllerService };
