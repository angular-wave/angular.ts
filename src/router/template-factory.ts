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
import type { ResolveContext } from "./resolve/resolve-context.ts";
import type { RawParams } from "./params/interface.ts";
import type {
  RouterInjectable,
  TemplateFactory,
  TemplateUrlFactory,
  ViewDeclarationCommon,
} from "./state/interface.ts";

interface BindingTuple {
  name: string;
  type: string;
}

type TemplateResult =
  | Promise<{ _template: string | undefined }>
  | Promise<{ _component: string }>;

const DEFAULT_TEMPLATE = "<ng-view></ng-view>";

const BINDING_MATCH = /^([=<@&])[?]?(.*)/;

function asTemplate(
  result: string | Promise<string> | null,
): Promise<{ _template: string | undefined }> {
  return Promise.resolve(result).then(toTemplateResult);
}

function asComponent(
  result: string | Promise<string>,
): Promise<{ _component: string }> {
  return Promise.resolve(result).then(toComponentResult);
}

function toTemplateResult(str: string | null): {
  _template: string | undefined;
} {
  return { _template: str ?? undefined };
}

function toComponentResult(str: string): { _component: string } {
  return { _component: str };
}

function componentElementName(camelCase: string): string {
  return kebobString(camelCase);
}

/**
 * Resolves route templates and components from state view declarations.
 *
 * @internal
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
  /** @internal */
  _fromConfig(
    config: ViewDeclarationCommon,
    params: RawParams,
  ): TemplateResult {
    const { template, templateUrl, component } = config;

    if (isDefined(template)) {
      return asTemplate(this._fromString(template, params));
    }

    if (isDefined(templateUrl)) {
      return asTemplate(this._fromUrl(templateUrl, params));
    }

    if (isDefined(component)) {
      return asComponent(component);
    }

    return asTemplate(DEFAULT_TEMPLATE);
  }

  /**
   * Resolves a literal template string or template factory function.
   */
  /** @internal */
  _fromString(template: string | TemplateFactory, params?: RawParams): string {
    return isFunction(template) ? template(params) : template;
  }

  /**
   * Fetches a template from a static URL or a URL factory.
   */
  /** @internal */
  _fromUrl(
    url: string | TemplateUrlFactory,
    params: RawParams,
  ): Promise<string> | null {
    const templateUrl = isFunction(url) ? url(params) : url;

    if (isNullOrUndefined(templateUrl)) return null;

    return this._getTemplateRequest()(templateUrl);
  }

  /**
   * Builds the HTML for a routed component and binds resolve data to its inputs.
   */
  /** @internal */
  _makeComponentTemplate(
    ngView: Element,
    context: ResolveContext,
    component: string,
    bindings?: Record<string, string>,
  ): string {
    bindings = bindings ?? {};
    const componentBindings = getComponentBindings(this._injector, component);

    const attrs: string[] = [];

    componentBindings.forEach((binding) => {
      attrs.push(
        componentAttributeTemplate(ngView, context, bindings, binding),
      );
    });

    const kebobName = componentElementName(component);

    return `<${kebobName} ${attrs.join(" ")}></${kebobName}>`;
  }

  /** @internal */
  _getTemplateRequest(): ng.TemplateRequestService {
    if (!this._templateRequest) {
      throw new Error("$templateRequest is not available");
    }

    return this._templateRequest;
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

  const boundName = bindings[name];

  const resolveName = boundName ? boundName : name;

  if (type === "@") return `${attrName}='{{$resolve.${resolveName}}}'`;

  if (type === "&") {
    const res = context.getResolvable(resolveName);

    const fn = res?.data;

    const args =
      fn && (isFunction(fn) || isArray(fn))
        ? annotate(fn as RouterInjectable)
        : [];

    const arrayIdxStr = isArray(fn) ? `[${String(fn.length - 1)}]` : "";

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

  if (!cmpDefs?.length) {
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

function getBindings(def: ng.Directive): BindingTuple[] {
  const componentBindings = def.bindToController;

  if (
    isObject(componentBindings) &&
    isObject(def.scope) &&
    !keys(def.scope).length
  ) {
    return scopeBindings(componentBindings);
  }

  return [];
}

function scopeBindings(bindingsObj: Record<string, string>): BindingTuple[] {
  const bindingKeys = keys(bindingsObj);

  const bindings: BindingTuple[] = [];

  bindingKeys.forEach((key) => {
    const match = BINDING_MATCH.exec(bindingsObj[key] || "");

    if (match) {
      bindings.push({ name: match[2] ? match[2] : key, type: match[1] });
    }
  });

  return bindings;
}
