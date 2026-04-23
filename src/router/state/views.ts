import { isArray, isString } from "../../shared/utils.ts";
import { isInjectable } from "../../shared/predicates.ts";
import { trace } from "../common/trace.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { annotate } from "../../core/di/di.ts";
import type { PathNode } from "../path/path-node.ts";
import type { ViewDeclaration } from "./interface.ts";
import type { StateObject } from "./state-object.ts";
import type { TemplateFactoryProvider } from "../template-factory.ts";

/**
 * @return {(path: PathNode[], view: ViewDeclaration) => ViewConfig}
 */
export function getViewConfigFactory(templateFactory: TemplateFactoryProvider) {
  return (path: PathNode[], view: ViewDeclaration): ViewConfig =>
    new ViewConfig(path, view, templateFactory);
}

/**
 * @type {Number}
 */
let id = 0;

export class ViewConfig {
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
  ) {
    this.$id = -1;
    this.path = path;
    this.viewDecl = viewDecl;
    this.factory = factory;
    this.component = undefined;
    this.template = undefined;
    this.$id = id++;
    this.loaded = false;
    this.controller = undefined;
    this.getTemplate = (ngView: any, context: ResolveContext) =>
      this.component
        ? this.factory.makeComponentTemplate(
            ngView,
            context,
            this.component,
            this.viewDecl.bindings,
          )
        : this.template;
  }

  /**
   *
   * @returns {Promise<ViewConfig>}
   */
  async load(): Promise<ViewConfig> {
    const context = new ResolveContext(this.path, this.factory._injector);

    const params: Record<string, any> = {};

    for (let i = 0; i < this.path.length; i++) {
      Object.assign(params, this.path[i].paramValues);
    }

    const promises = [
      Promise.resolve(this.factory.fromConfig(this.viewDecl, params, context)),
      Promise.resolve(this.getController(context)),
    ];

    const results = await Promise.all(promises);

    trace.traceViewServiceEvent("Loaded", this);
    this.controller = results[1];
    Object.assign(this, results[0]); // Either { template: "tpl" } or { component: "cmpName" }

    return this;
  }

  /**
   * Gets the controller for a view configuration.
   * @returns {Function | Promise<Function>} Returns a controller, or a promise that resolves to a controller.
   * @param {ResolveContext} context
   */
  getController(context: ResolveContext): Function | Promise<Function> {
    const provider = this.viewDecl.controllerProvider;

    if (!isInjectable(provider)) return this.viewDecl.controller;
    const deps = annotate(provider);

    const providerFn = isArray(provider)
      ? (provider[provider.length - 1] as Function)
      : provider;

    const resolvable = new Resolvable("", providerFn, deps);

    return resolvable.get(context);
  }

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
    rawViewName = "",
  ): { ngViewName: string; ngViewContextAnchor: string } {
    // TODO: Validate incoming view name with a regexp to allow:
    // ex: "view.name@foo.bar" , "^.^.view.name" , "view.name@^.^" , "" ,
    // "@" , "$default@^" , "!$default.$default" , "!foo.bar"
    const viewAtContext = rawViewName.split("@");

    let ngViewName = viewAtContext[0] || "$default"; // default to unnamed view

    let ngViewContextAnchor = isString(viewAtContext[1])
      ? viewAtContext[1]
      : "^"; // default to parent context

    // Handle relative view-name sugar syntax.
    // Matches rawViewName "^.^.^.foo.bar" into array: ["^.^.^.foo.bar", "^.^.^", "foo.bar"],
    const relativeViewNameSugar = /^(\^(?:\.\^)*)\.(.*$)/.exec(ngViewName);

    if (relativeViewNameSugar) {
      // Clobbers existing contextAnchor (rawViewName validation will fix this)
      ngViewContextAnchor = relativeViewNameSugar[1]; // set anchor to "^.^.^"
      ngViewName = relativeViewNameSugar[2]; // set view-name to "foo.bar"
    }

    if (ngViewName.charAt(0) === "!") {
      ngViewName = ngViewName.substring(1);
      ngViewContextAnchor = ""; // target absolutely from root
    }
    // handle parent relative targeting "^.^.^"
    const relativeMatch = /^(\^(?:\.\^)*)$/;

    if (relativeMatch.exec(ngViewContextAnchor)) {
      let anchorState: StateObject | null | undefined = context;

      // "^.^.^" -> ["^", "^", "^"] (count how many times we go up)
      const hops = ngViewContextAnchor.split(".").filter(Boolean).length;

      for (let i = 0; i < hops; i++) {
        anchorState = anchorState && anchorState.parent;
      }

      // If the anchor goes past the root, fall back to the root-most known state
      // (or keep `context` if you prefer different behavior).
      if (!anchorState) {
        anchorState = context;

        while (anchorState.parent) anchorState = anchorState.parent;
      }

      ngViewContextAnchor = anchorState.name;
    } else if (ngViewContextAnchor === ".") {
      ngViewContextAnchor = context.name;
    }

    return { ngViewName, ngViewContextAnchor };
  }
}
