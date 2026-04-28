import {
  _http,
  _injector,
  _templateCache,
  _templateRequest,
} from "../injection-tokens.ts";
import {
  isArray,
  isDefined,
  isFunction,
  isNullOrUndefined,
  isObject,
  keys,
} from "../shared/utils.ts";
import { annotate } from "../core/di/di.ts";
import { DirectiveSuffix } from "../core/compile/compile.ts";
import { kebobString } from "../shared/strings.ts";
import { Resolvable } from "./resolve/resolvable.ts";
import type { ResolveContext } from "./resolve/resolve-context.ts";
import type { Injectable } from "../interface.ts";

type BindingTuple = {
  name: string;
  type: string;
};

type TemplateResult =
  | Promise<{ template: string }>
  | Promise<{ component: string }>;

/**
 * Resolves route templates and components from state view declarations.
 */
export class TemplateFactoryProvider {
  /** @internal */
  _templateRequest: ng.TemplateRequestService | undefined;
  /** @internal */
  _http: ng.HttpService | undefined;
  /** @internal */
  _templateCache: ng.TemplateCacheService | undefined;
  /** @internal */
  _injector: ng.InjectorService | undefined;

  /**
   * Wires HTTP, template request, cache, and injector services into the factory.
   */
  $get = [
    _http,
    _templateCache,
    _templateRequest,
    _injector,
    (
      $http: ng.HttpService,
      $templateCache: ng.TemplateCacheService,
      $templateRequest: ng.TemplateRequestService,
      $injector: ng.InjectorService,
    ): TemplateFactoryProvider => {
      this._templateRequest = $templateRequest;
      this._http = $http;
      this._templateCache = $templateCache;
      this._injector = $injector;

      return this;
    },
  ];

  /**
   * Resolves a state's view config into either concrete template HTML or a component name.
   */
  fromConfig(
    config: any,
    params: any,
    context: ResolveContext,
  ): TemplateResult {
    const defaultTemplate = "<ng-view></ng-view>";

    const asTemplate = (result: string | Promise<string>) =>
      Promise.resolve(result).then((str) => ({ template: str }));

    const asComponent = (result: string | Promise<string>) =>
      Promise.resolve(result).then((str) => ({ component: str }));

    const getConfigType = (
      configParam: any,
    ):
      | "template"
      | "templateUrl"
      | "templateProvider"
      | "component"
      | "default" => {
      if (isDefined(configParam.template)) return "template";

      if (isDefined(configParam.templateUrl)) return "templateUrl";

      if (isDefined(configParam.templateProvider)) return "templateProvider";

      if (isDefined(configParam.component)) return "component";

      return "default";
    };

    switch (getConfigType(config)) {
      case "template":
        return asTemplate(this.fromString(config.template, params) as string);
      case "templateUrl":
        return asTemplate(
          this.fromUrl(config.templateUrl, params) as Promise<string>,
        );
      case "templateProvider":
        return asTemplate(
          this.fromProvider(config.templateProvider, params, context),
        );
      case "component":
        return asComponent(config.component);
      default:
        return asTemplate(defaultTemplate);
    }
  }

  /**
   * Resolves a literal template string or template factory function.
   */
  fromString(template: string | Function, params?: any): string | object {
    return isFunction(template) ? (template as Function)(params) : template;
  }

  /**
   * Fetches a template from a static URL or a URL factory.
   */
  fromUrl(url: string | Function, params: object): Promise<string> | null {
    if (isFunction(url)) url = (url as Function)(params) as string;

    if (isNullOrUndefined(url)) return null;

    return this._templateRequest!(url as string);
  }

  fromProvider(
    provider: Injectable<any>,
    _params: Function,
    context: ResolveContext,
  ): string | Promise<string> {
    const deps = annotate(provider);

    const providerFn = isArray(provider)
      ? (provider[provider.length - 1] as Function)
      : provider;

    const resolvable = new Resolvable("", providerFn, deps);

    return resolvable.get(context);
  }

  /**
   * Builds the HTML for a routed component and binds resolve data to its inputs.
   */
  makeComponentTemplate(
    ngView: Element,
    context: ResolveContext,
    component: string,
    bindings?: Record<string, string>,
  ): string {
    bindings = bindings || {};
    const kebob = (camelCase: string): string => {
      const kebobed = kebobString(camelCase);

      return /^(x|data)-/.exec(kebobed) ? `x-${kebobed}` : kebobed;
    };

    const attributeTpl = (input: BindingTuple): string => {
      const { name, type } = input;

      const attrName = kebob(name);

      if (ngView.getAttribute(attrName) && !bindings![name]) {
        return `${attrName}='${ngView.getAttribute(attrName)}'`;
      }

      const resolveName = bindings![name] || name;

      if (type === "@") return `${attrName}='{{$resolve.${resolveName}}}'`;

      if (type === "&") {
        const res = context.getResolvable(resolveName);

        const fn = res && res.data;

        const args = (fn && annotate(fn)) || [];

        const arrayIdxStr = isArray(fn) ? `[${fn.length - 1}]` : "";

        return `${attrName}='$resolve.${resolveName}${arrayIdxStr}(${args.join(",")})'`;
      }

      return `${attrName}='$resolve.${resolveName}'`;
    };

    const attrs = getComponentBindings(this._injector, component)
      .map(attributeTpl)
      .join(" ");

    const kebobName = kebob(component);

    return `<${kebobName} ${attrs}></${kebobName}>`;
  }
}

/**
 * Reads the binding declarations for a named component directive.
 */
function getComponentBindings(
  $injector: ng.InjectorService | undefined,
  name: string,
): BindingTuple[] {
  const cmpDefs = $injector?.get(name + DirectiveSuffix) as
    | ng.Directive[]
    | undefined;

  if (!cmpDefs || !cmpDefs.length) {
    throw new Error(`Unable to find component named '${name}'`);
  }

  const bindings: BindingTuple[] = [];

  cmpDefs.forEach((def) => {
    const defBindings = getBindings(def);

    defBindings.forEach((binding) => {
      bindings.push(binding);
    });
  });

  return bindings;
}

const getBindings = (def: ng.Directive): BindingTuple[] => {
  if (isObject(def.bindToController)) {
    return scopeBindings(def.bindToController as Record<string, string>);
  }

  return scopeBindings(def.scope as Record<string, string>);
};

const scopeBindings = (bindingsObj: Record<string, string>): BindingTuple[] => {
  const bindingKeys = keys(bindingsObj || {});

  const bindings: BindingTuple[] = [];

  bindingKeys.forEach((key) => {
    const match = /^([=<@&])[?]?(.*)/.exec(bindingsObj[key] || "");

    if (match) {
      bindings.push({ name: match[2] || key, type: match[1] });
    }
  });

  return bindings;
};
