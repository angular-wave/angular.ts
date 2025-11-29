export function identifierForController(controller: any, ident: any): any;
/**
 * The {@link ng.$controller $controller service} is used by AngularTS to create new
 * controllers.
 *
 * This provider allows controller registration via the
 * {@link ng.$controllerProvider#register register} method.
 */
export class ControllerProvider {
  /**
   * @type {Map<string, Function|Object>}
   * @private
   */
  private controllers;
  /**
   * Check if a controller with a given name exists.
   *
   * @param {string} name Controller name to check.
   * @returns {boolean} True if the controller exists, false otherwise.
   */
  has(name: string): boolean;
  /**
   * Register a controller.
   *
   * @param {string|Object} name Controller name, or an object map of controllers where the keys are
   *    the names and the values are the constructors.
   * @param {Function|Array} constructor Controller constructor function (optionally decorated with DI
   *    annotations in the array notation).
   */
  register(name: string | any, constructor: Function | any[]): void;
  /**
   * $get method for dependency injection.
   */
  $get: (
    | string
    | ((
        $injector: ng.InjectorService,
      ) => import("./interface.ts").ControllerService)
  )[];
  /**
   * Adds an identifier to the controller instance in the given locals' scope.
   *
   * @param {Object} locals The locals object containing the scope.
   * @param {string} identifier The identifier to assign.
   * @param {Object} instance The controller instance.
   * @param {string} name The name of the controller.
   */
  addIdentifier(
    locals: any,
    identifier: string,
    instance: any,
    name: string,
  ): void;
}
