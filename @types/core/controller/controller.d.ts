/**
 * @param {string | InjectableController | undefined} controller
 * @param {string} [ident]
 * @returns {string|undefined}
 */
export function identifierForController(
  controller: string | InjectableController | undefined,
  ident?: string,
): string | undefined;
export class ControllerProvider {
  /** @type {Map<string, InjectableController>} @private */
  private controllers;
  /** @param {string} name @returns {boolean} */
  has(name: string): boolean;
  /**
   * @param {string | Record<string, unknown>} name
   * @param {unknown} [constructor]
   */
  register(name: string | Record<string, unknown>, constructor?: unknown): void;
  /**
   * @type {import("../../interface.ts").AnnotatedFactory<(injector: ng.InjectorService) => ControllerService>}
   */
  $get: import("../../interface.ts").AnnotatedFactory<
    (injector: ng.InjectorService) => ControllerService
  >;
  /**
   * @param {ControllerLocals | undefined} locals
   * @param {string} identifier
   * @param {object} instance
   * @param {string} name
   */
  addIdentifier(
    locals: ControllerLocals | undefined,
    identifier: string,
    instance: object,
    name: string,
  ): void;
}
export type ControllerConstructor =
  import("../../interface.ts").ControllerConstructor;
export type InjectableController =
  import("../../interface.ts").Injectable<ControllerConstructor>;
export type ControllerService = import("./interface.ts").ControllerService;
export type ControllerLocals = import("./interface.ts").ControllerLocals;
export type ControllerExpression =
  import("./interface.ts").ControllerExpression;
