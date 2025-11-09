export function AnimateJsProvider($animateProvider: any): void;
export class AnimateJsProvider {
  constructor($animateProvider: any);
  $get: (
    | string
    | ((
        $injector: ng.InjectorService,
        $$AnimateRunner: typeof import("./animate-runner.js").AnimateRunner,
      ) => (
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
