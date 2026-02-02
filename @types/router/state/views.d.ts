/**
 * @return {(path: import("../path/path-node.js").PathNode[], view: import("./interface.ts").ViewDeclaration) => ViewConfig}
 */
export function getViewConfigFactory(): (
  path: import("../path/path-node.js").PathNode[],
  view: import("./interface.ts").ViewDeclaration,
) => ViewConfig;
/**
 * This is a [[StateBuilder.builder]] function for angular1 `views`.
 *
 * When the [[StateBuilder]] builds a [[StateObject]] object from a raw [[StateDeclaration]], this builder
 * handles the `views` property with logic specific to @uirouter/angularjs (ng1).
 *
 * If no `views: {}` property exists on the [[StateDeclaration]], then it creates the `views` object
 * and applies the state-level configuration to a view named `$default`.
 * @param {ng.StateObject & Record<string, any>} state
 */
export function ng1ViewsBuilder(
  state: ng.StateObject & Record<string, any>,
): Record<string, any>;
export class ViewConfig {
  /**
   * Normalizes a view's name from a state.views configuration block.
   *
   * This calculates the values for
   * [[_ViewDeclaration.$ngViewName]] and [[_ViewDeclaration.$ngViewContextAnchor]].
   *
   * @param {import("./state-service.js").StateObject} context the context object (state declaration) that the view belongs to
   * @param {string} rawViewName the name of the view, as declared in the [[StateDeclaration.views]]
   *
   * @returns the normalized ngViewName and ngViewContextAnchor that the view targets
   */
  static normalizeUIViewTarget(
    context: import("./state-service.js").StateObject,
    rawViewName?: string,
  ): {
    ngViewName: string;
    ngViewContextAnchor: string;
  };
  /**
   * @param {Array<import('../path/path-node.js').PathNode>} path
   * @param {import("./interface.ts").ViewDeclaration} viewDecl
   * @param {import('../template-factory.js').TemplateFactoryProvider} factory
   */
  constructor(
    path: Array<import("../path/path-node.js").PathNode>,
    viewDecl: import("./interface.ts").ViewDeclaration,
    factory: import("../template-factory.js").TemplateFactoryProvider,
  );
  $id: number;
  /**
   * @type {Array<import('../path/path-node.js').PathNode>}
   */
  path: Array<import("../path/path-node.js").PathNode>;
  /**
   * @type {import("./interface.ts").ViewDeclaration}
   */
  viewDecl: import("./interface.ts").ViewDeclaration;
  /**
   * @type {import('../template-factory.js').TemplateFactoryProvider}
   */
  factory: import("../template-factory.js").TemplateFactoryProvider;
  /**
   * @type {string | undefined}
   */
  component: string | undefined;
  /**
   * @type {string | undefined}
   */
  template: string | undefined;
  /** @type {boolean} */
  loaded: boolean;
  getTemplate: (ngView: any, context: ResolveContext) => string;
  /**
   *
   * @returns {Promise<ViewConfig>}
   */
  load(): Promise<ViewConfig>;
  controller: any;
  /**
   * Gets the controller for a view configuration.
   * @returns {Function | Promise<Function>} Returns a controller, or a promise that resolves to a controller.
   * @param {ResolveContext} context
   */
  getController(context: ResolveContext): Function | Promise<Function>;
}
import { ResolveContext } from "../resolve/resolve-context.js";
