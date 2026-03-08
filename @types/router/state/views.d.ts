import { ResolveContext } from "../resolve/resolve-context.ts";
import type { PathNode } from "../path/path-node.ts";
import type { ViewDeclaration } from "./interface.ts";
import type { StateObject } from "./state-object.ts";
import type { TemplateFactoryProvider } from "../template-factory.ts";
/**
 * @return {(path: PathNode[], view: ViewDeclaration) => ViewConfig}
 */
export declare function getViewConfigFactory(): (
  path: PathNode[],
  view: ViewDeclaration,
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
export declare function ng1ViewsBuilder(
  state: StateObject & Record<string, any>,
): Record<string, any>;
export declare class ViewConfig {
  $id: number;
  path: PathNode[];
  viewDecl: ViewDeclaration;
  factory: TemplateFactoryProvider;
  component: string | undefined;
  template: string | undefined;
  loaded: boolean;
  controller: any;
  getTemplate: (ngView: any, context: ResolveContext) => string | undefined;
  /**
   * Stores the declarative view definition plus the runtime path/context needed
   * to resolve templates and controllers when the view is activated.
   * @param {PathNode[]} path
   * @param {ViewDeclaration} viewDecl
   * @param {TemplateFactoryProvider} factory
   */
  constructor(
    path: PathNode[],
    viewDecl: ViewDeclaration,
    factory: TemplateFactoryProvider,
  );
  /**
   *
   * @returns {Promise<ViewConfig>}
   */
  load(): Promise<ViewConfig>;
  /**
   * Gets the controller for a view configuration.
   * @returns {Function | Promise<Function>} Returns a controller, or a promise that resolves to a controller.
   * @param {ResolveContext} context
   */
  getController(context: ResolveContext): Function | Promise<Function>;
  /**
   * Normalizes a view's name from a state.views configuration block.
   *
   * This calculates the values for
   * [[_ViewDeclaration.$ngViewName]] and [[_ViewDeclaration.$ngViewContextAnchor]].
   *
   * @param {StateObject} context the context object (state declaration) that the view belongs to
   * @param {string} rawViewName the name of the view, as declared in the [[StateDeclaration.views]]
   *
   * @returns the normalized ngViewName and ngViewContextAnchor that the view targets
   */
  static normalizeUIViewTarget(
    context: StateObject,
    rawViewName?: string,
  ): {
    ngViewName: string;
    ngViewContextAnchor: string;
  };
}
