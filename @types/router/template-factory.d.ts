import type { ResolveContext } from "./resolve/resolve-context.ts";
type TemplateResult =
  | Promise<{
      template: string;
    }>
  | Promise<{
      component: string;
    }>;
/**
 * Resolves route templates and components from state view declarations.
 */
export declare class TemplateFactoryProvider {
  $templateRequest: ng.TemplateRequestService | undefined;
  $http: ng.HttpService | undefined;
  $templateCache: ng.TemplateCacheService | undefined;
  $injector: ng.InjectorService | undefined;
  /**
   * Wires HTTP, template request, cache, and injector services into the factory.
   */
  $get: (
    | "$http"
    | "$templateCache"
    | "$templateRequest"
    | "$injector"
    | ((
        $http: ng.HttpService,
        $templateCache: ng.TemplateCacheService,
        $templateRequest: ng.TemplateRequestService,
        $injector: ng.InjectorService,
      ) => TemplateFactoryProvider)
  )[];
  /**
   * Resolves a state's view config into either concrete template HTML or a component name.
   */
  fromConfig(config: any, params: any, context: ResolveContext): TemplateResult;
  /**
   * Resolves a literal template string or template factory function.
   */
  fromString(template: string | Function, params?: any): string | object;
  /**
   * Fetches a template from a static URL or a URL factory.
   */
  fromUrl(url: string | Function, params: object): Promise<string> | null;
  fromProvider(
    provider: import("../interface.ts").Injectable<any>,
    _params: Function,
    context: ResolveContext,
  ): string | Promise<string>;
  /**
   * Resolves a component name from an injectable provider in resolve context.
   */
  fromComponentProvider(
    provider: import("../interface.ts").Injectable<any>,
    context: ResolveContext,
  ): Promise<any>;
  /**
   * Builds the HTML for a routed component and binds resolve data to its inputs.
   */
  makeComponentTemplate(
    ngView: Element,
    context: ResolveContext,
    component: string,
    bindings?: Record<string, string>,
  ): string;
}
export {};
