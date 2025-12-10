/**
 * @param {ng.AnimateProvider} $animateProvider
 */
export function AnimateJsProvider($animateProvider: ng.AnimateProvider): void;
export class AnimateJsProvider {
  /**
   * @param {ng.AnimateProvider} $animateProvider
   */
  constructor($animateProvider: ng.AnimateProvider);
  $get: (
    | string
    | (($injector: ng.InjectorService) => (
        element: any,
        event: any,
        classes: any,
        options: any,
      ) => {
        $$willAnimate: boolean;
        end(): any;
        start(): any;
      })
  )[];
}
export namespace AnimateJsProvider {
  let $inject: string[];
}
