import type { ControllerConstructor, Injectable } from "../../interface.ts";
import type {
  ControllerExpression,
  ControllerLocals,
  ControllerService,
} from "./interface.ts";
type InjectableController = Injectable<ControllerConstructor>;
/**
 * Resolves the controller alias from either an explicit `ident` or
 * a `FooController as foo` style controller expression.
 */
export declare function identifierForController(
  controller: string | InjectableController | undefined,
  ident?: string,
): string | undefined;
/**
 * Provider for controller registration and runtime controller instantiation.
 */
export declare class ControllerProvider {
  controllers: Map<string, InjectableController>;
  $get: [string, ($injector: ng.InjectorService) => ControllerService];
  /**
   * Creates the controller registry and exposes the `$controller` service factory.
   */
  constructor();
  /**
   * Checks whether a controller has been registered under the provided name.
   */
  has(name: string): boolean;
  /**
   * Registers controllers using either a single name/constructor pair or an object map.
   */
  register(name: string | Record<string, unknown>, constructor?: unknown): void;
  /**
   * Publishes a controller instance onto the target scope using `controllerAs`.
   *
   * @param locals controller locals, which must include `$scope`
   * @param identifier alias exposed on the target scope
   * @param instance controller instance to export
   * @param name controller name used for error reporting
   */
  addIdentifier(
    locals: ControllerLocals | undefined,
    identifier: string,
    instance: object,
    name: string,
  ): void;
}
export type { ControllerExpression, ControllerLocals, ControllerService };
