import { pick, tail } from "../../shared/common.js";
import { entries, isArray, isDefined, isString } from "../../shared/utils.js";
import { isInjectable } from "../../shared/predicates.ts";
import { trace } from "../common/trace.js";
import { ResolveContext } from "../resolve/resolve-context.js";
import { Resolvable } from "../resolve/resolvable.js";
import { annotate } from "../../core/di/di.ts";
import type { PathNode } from "../path/path-node.ts";
import type { ViewDeclaration } from "./interface.ts";
import type { StateObject } from "./state-object.ts";
import type { TemplateFactoryProvider } from "../template-factory.js";

/**
 * @return {(path: PathNode[], view: ViewDeclaration) => ViewConfig}
 */
export function getViewConfigFactory() {
  /**
   * Lazily resolved to avoid a direct bootstrap-time dependency on the ng1 injector.
   * The factory is cached after first use.
   * @type {TemplateFactoryProvider | null}
   */
  let templateFactory: TemplateFactoryProvider | null = null;

  return (path: PathNode[], view: ViewDeclaration): ViewConfig => {
    templateFactory =
      templateFactory || window.angular.$injector.get("$templateFactory"); // TODO: remove static injector

    return new ViewConfig(
      path,
      view,
      templateFactory as TemplateFactoryProvider,
    );
  };
}

const hasAnyKey = (keys: string[], obj: Record<string, any>): boolean =>
  keys.reduce((acc, key) => acc || isDefined(obj[key]), false);

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
  state: StateObject & Record<string, any>,
): Record<string, any> {
  // Do not process root state
  if (!state.parent) return {};
  const tplKeys = [
      "templateProvider",
      "templateUrl",
      "template",
      "notify",
      "async",
    ],
    ctrlKeys = [
      "controller",
      "controllerProvider",
      "controllerAs",
      "resolveAs",
    ],
    compKeys = ["component", "bindings", "componentProvider"],
    nonCompKeys = tplKeys.concat(ctrlKeys),
    allViewKeys = compKeys.concat(nonCompKeys);

  // Do not allow a state to have both state-level props and also a `views: {}` property.
  // A state without a `views: {}` property can declare properties for the `$default` view as properties of the state.
  // However, the `$default` approach should not be mixed with a separate `views: ` block.
  if (isDefined(state.views) && hasAnyKey(allViewKeys, state)) {
    throw new Error(
      `State '${state.name}' has a 'views' object. ` +
        `It cannot also have "view properties" at the state level.  ` +
        `Move the following properties into a view (in the 'views' object): ` +
        ` ${allViewKeys.filter((key) => isDefined(state[key])).join(", ")}`,
    );
  }
  const views: Record<string, any> = {};

  const viewsObject = (state.views || {
    $default: pick(state, allViewKeys),
  }) as Record<string, any>;

  entries(viewsObject).forEach(([entryName, entryConfig]) => {
    let name = entryName as string;
    let config = entryConfig as Record<string, any> | string;

    // Account for views: { "": { template... } }
    name = name || "$default";

    // Account for views: { header: "headerComponent" }
    if (isString(config)) config = { component: config };
    // Make a shallow copy of the urlConfig object
    config = Object.assign({}, config);

    // Do not allow a view to mix props for component-style view with props for template/controller-style view
    if (hasAnyKey(compKeys, config) && hasAnyKey(nonCompKeys, config)) {
      throw new Error(
        `Cannot combine: ${compKeys.join("|")} with: ${nonCompKeys.join("|")} in stateview: '${name}@${state.name}'`,
      );
    }
    config.resolveAs = config.resolveAs || "$resolve";
    config.$context = state;
    config.$name = name;
    const normalized = ViewConfig.normalizeUIViewTarget(
      config.$context as StateObject,
      config.$name as string,
    );

    config.$ngViewName = normalized.ngViewName;
    config.$ngViewContextAnchor = normalized.ngViewContextAnchor;
    views[name] = config;
  });

  return views;
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
    const context = new ResolveContext(this.path);

    const params = this.path.reduce(
      (acc, node) => Object.assign(acc, node.paramValues),
      {},
    );

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
      ? (tail(provider) as Function)
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
      let anchorState: StateObject | undefined = context;

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
