import { errorHandlingConfig } from "./shared/utils.js";
import { getController, getInjector, getScope } from "./shared/dom.ts";
import type { AngularBootstrapConfig } from "./interface.ts";
import { NgModule } from "./core/di/ng-module/ng-module.ts";
export declare class Angular extends EventTarget {
  private subapps;
  private _bootsrappedModules;
  $eventBus: ng.PubSubService;
  $injector: ng.InjectorService;
  $rootScope: ng.Scope;
  version: string;
  getController: typeof getController;
  getInjector: typeof getInjector;
  getScope: typeof getScope;
  errorHandlingConfig: typeof errorHandlingConfig;
  $t: ng.InjectionTokens;
  constructor(subapp?: boolean);
  module(
    name: string,
    requires?: string[],
    configFn?: ng.Injectable<any>,
  ): NgModule;
  dispatchEvent(event: Event): boolean;
  emit(input: string): void;
  call(input: string): Promise<any>;
  bootstrap(
    element: string | HTMLElement | HTMLDocument,
    modules?: Array<string | any>,
    config?: AngularBootstrapConfig,
  ): ng.InjectorService;
  injector(modules: any[], strictDi?: boolean): ng.InjectorService;
  init(element: HTMLElement | HTMLDocument): void;
  getScopeByName(name: string): ng.Scope | undefined;
  private splitInvocation;
}
