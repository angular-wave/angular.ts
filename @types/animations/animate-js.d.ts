export function AnimateJsProvider($animateProvider: any): void;
export class AnimateJsProvider {
  constructor($animateProvider: any);
  $get: (
    | string
    | (($injector: ng.InjectorService) => import("./interface.ts").AnimateJsFn)
  )[];
}
export namespace AnimateJsProvider {
  let $inject: string[];
}
