import type { ControllerConstructor, Injectable } from "../../interface.ts";
import type {
  ControllerExpression,
  ControllerLocals,
  ControllerService,
} from "./interface.ts";
type InjectableController = Injectable<ControllerConstructor>;
export declare function identifierForController(
  controller: string | InjectableController | undefined,
  ident?: string,
): string | undefined;
export declare class ControllerProvider {
  controllers: Map<string, InjectableController>;
  $get: [string, ($injector: ng.InjectorService) => ControllerService];
  constructor();
  has(name: string): boolean;
  register(name: string | Record<string, unknown>, constructor?: unknown): void;
  addIdentifier(
    locals: ControllerLocals | undefined,
    identifier: string,
    instance: object,
    name: string,
  ): void;
}
export type { ControllerExpression, ControllerLocals, ControllerService };
