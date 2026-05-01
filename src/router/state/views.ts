import { assign, isString } from "../../shared/utils.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import type { RawParams } from "../params/interface.ts";
import type { PathNode } from "../path/path-node.ts";
import type { ViewDeclaration } from "./interface.ts";
import type { StateObject } from "./state-object.ts";
import type { TemplateFactoryProvider } from "../template-factory.ts";

let id = 0;

export class ViewConfig {
  $id: number;
  path: PathNode[];
  viewDecl: ViewDeclaration;
  factory: TemplateFactoryProvider;
  component: string | undefined;
  template: string | undefined;
  loaded: boolean;
  controller: ViewDeclaration["controller"] | undefined;

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
  }

  /** @internal */
  _getTemplate(ngView: Element, context: ResolveContext): string | undefined {
    return this.component
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

    const params: RawParams = {};

    for (let i = 0; i < this.path.length; i++) {
      assign(params, this.path[i].paramValues);
    }

    const viewResult = await this.factory.fromConfig(
      this.viewDecl,
      params,
      context,
    );

    this.controller = await Promise.resolve(this.getController());
    assign(this, viewResult); // Either { template: "tpl" } or { component: "cmpName" }

    return this;
  }

  /**
   * Gets the controller for a view configuration.
   * @returns the configured controller function, annotated factory, or controller name.
   */
  getController(): ViewDeclaration["controller"] {
    return this.viewDecl.controller;
  }

  /**
   * Normalizes a view target from a `StateDeclaration.views` key.
   */
  static normalizeNgViewTarget(
    context: StateObject,
    rawViewName = "",
  ): { ngViewName: string; ngViewContextAnchor: string } {
    const viewAtContext = rawViewName.split("@");

    let ngViewName = viewAtContext[0] || "$default";

    let ngViewContextAnchor = isString(viewAtContext[1])
      ? viewAtContext[1]
      : "^";

    const relativeViewNameSugar = /^(\^(?:\.\^)*)\.(.*$)/.exec(ngViewName);

    if (relativeViewNameSugar) {
      ngViewContextAnchor = relativeViewNameSugar[1];
      ngViewName = relativeViewNameSugar[2];
    }

    if (ngViewName.charAt(0) === "!") {
      ngViewName = ngViewName.substring(1);
      ngViewContextAnchor = "";
    }

    const relativeMatch = /^(\^(?:\.\^)*)$/;

    if (relativeMatch.exec(ngViewContextAnchor)) {
      let anchorState: StateObject | null | undefined = context;

      let hops = 0;

      for (let i = 0; i < ngViewContextAnchor.length; i++) {
        if (ngViewContextAnchor[i] === "^") {
          hops++;
        }
      }

      for (let i = 0; i < hops; i++) {
        anchorState = anchorState && anchorState.parent;
      }

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
