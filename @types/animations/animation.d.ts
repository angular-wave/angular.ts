import { AnimateRunner } from "./runner/animate-runner.ts";
export declare class AnimationProvider {
  /**
   * @type {string[]}
   */
  _drivers: any[];
  constructor();
  /**
   * @param {ng.RootScopeService} $rootScope
   * @param {ng.InjectorService} $injector
   * @param {string[]} drivers
   * @returns {import("./interface.ts").AnimationService}
   */
  _createAnimationService(
    $rootScope: any,
    $injector: any,
    drivers: any,
  ): (elementParam: any, event: any, optionsParam: any) => AnimateRunner;
}
