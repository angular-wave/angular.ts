import type { ResolveContext } from "./resolve/resolve-context.ts";
type TemplateResult =
  | Promise<{
      template: string;
    }>
  | Promise<{
      component: string;
    }>;
export declare class TemplateFactoryProvider {
  $templateRequest: ng.TemplateRequestService | undefined;
  $http: ng.HttpService | undefined;
  $templateCache: ng.TemplateCacheService | undefined;
  $injector: ng.InjectorService | undefined;
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
  fromConfig(config: any, params: any, context: ResolveContext): TemplateResult;
  fromString(template: string | Function, params?: any): string | object;
  fromUrl(url: string | Function, params: object): Promise<string> | null;
  fromProvider(
    provider: import("../interface.ts").Injectable<any>,
    _params: Function,
    context: ResolveContext,
  ): string | Promise<string>;
  fromComponentProvider(
    provider: import("../interface.ts").Injectable<any>,
    context: ResolveContext,
  ): Promise<any>;
  makeComponentTemplate(
    ngView: Element,
    context: ResolveContext,
    component: string,
    bindings?: Record<string, string>,
  ): string;
}
export {};
