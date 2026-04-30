import { _injector, _templateRequest } from "../injection-tokens.ts";
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

const DEFAULT_TEMPLATE = "<ng-view></ng-view>";

const BINDING_MATCH = /^([=<@&])[?]?(.*)/;

const PREFIXED_COMPONENT_ELEMENT = /^(x|data)-/;

type TemplateConfigType =
  | "template"
  | "templateUrl"
  | "templateProvider"
  | "component"
  | "default";

function asTemplate(
  result: string | Promise<string>,
): Promise<{ template: string }> {
  return Promise.resolve(result).then((str) => ({ template: str }));
}

function asComponent(
  result: string | Promise<string>,
): Promise<{ component: string }> {
  return Promise.resolve(result).then((str) => ({ component: str }));
}

function getConfigType(config: any): TemplateConfigType {
  if (isDefined(config.template)) return "template";

  if (isDefined(config.templateUrl)) return "templateUrl";

  if (isDefined(config.templateProvider)) return "templateProvider";

  if (isDefined(config.component)) return "component";

  return "default";
}

function componentElementName(camelCase: string): string {
  const kebobed = kebobString(camelCase);

  return PREFIXED_COMPONENT_ELEMENT.exec(kebobed) ? `x-${kebobed}` : kebobed;
}

/**
 * Resolves route templates and components from state view declarations.
 */
export class TemplateFactoryProvider {
  /** @internal */
  _templateRequest: ng.TemplateRequestService | undefined;
  /** @internal */
  _injector: ng.InjectorService | undefined;

  /**
   * Wires template request and injector services into the factory.
   */
  $get = [
    _templateRequest,
    _injector,
    (
      $templateRequest: ng.TemplateRequestService,
      $injector: ng.InjectorService,
    ): TemplateFactoryProvider => {
      this._templateRequest = $templateRequest;
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
    switch (getConfigType(config)) {
      case "template":
        return asTemplate(this.fromString(config.template, params) as string);
      case "templateUrl":
        return asTemplate(
          this.fromUrl(config.templateUrl, params) as Promise<string>,
        );
      case "templateProvider":
        return asTemplate(this.fromProvider(config.templateProvider, context));
      case "component":
        return asComponent(config.component);
      default:
        return asTemplate(DEFAULT_TEMPLATE);
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
    const componentBindings = getComponentBindings(this._injector, component);

    const attrs: string[] = [];

    for (let i = 0; i < componentBindings.length; i++) {
      attrs.push(
        componentAttributeTemplate(
          ngView,
          context,
          bindings,
          componentBindings[i],
        ),
      );
    }

    const kebobName = componentElementName(component);

    return `<${kebobName} ${attrs.join(" ")}></${kebobName}>`;
  }
}

function componentAttributeTemplate(
  ngView: Element,
  context: ResolveContext,
  bindings: Record<string, string>,
  input: BindingTuple,
): string {
  const { name, type } = input;

  const attrName = componentElementName(name);

  const existingAttr = ngView.getAttribute(attrName);

  if (existingAttr && !bindings[name]) {
    return `${attrName}='${existingAttr}'`;
  }

  const resolveName = bindings[name] || name;

  if (type === "@") return `${attrName}='{{$resolve.${resolveName}}}'`;

  if (type === "&") {
    const res = context.getResolvable(resolveName);

    const fn = res && res.data;

    const args = (fn && annotate(fn)) || [];

    const arrayIdxStr = isArray(fn) ? `[${fn.length - 1}]` : "";

    return `${attrName}='$resolve.${resolveName}${arrayIdxStr}(${args.join(",")})'`;
  }

  return `${attrName}='$resolve.${resolveName}'`;
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

  for (let i = 0; i < cmpDefs.length; i++) {
    const def = cmpDefs[i];

    const defBindings = getBindings(def);

    for (let j = 0; j < defBindings.length; j++) {
      bindings.push(defBindings[j]);
    }
  }

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

  for (let i = 0; i < bindingKeys.length; i++) {
    const key = bindingKeys[i];

    const match = BINDING_MATCH.exec(bindingsObj[key] || "");

    if (match) {
      bindings.push({ name: match[2] || key, type: match[1] });
    }
  }

  return bindings;
};
