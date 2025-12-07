export function AnimateQueueProvider($animateProvider: any): void;
export class AnimateQueueProvider {
  constructor($animateProvider: any);
  rules: {
    skip: any[];
    cancel: any[];
    join: any[];
  };
  $get: (
    | string
    | ((
        $rootScope: ng.RootScopeService,
        $injector: ng.InjectorService,
        $$animation: any,
      ) => import("../queue/interface.ts").AnimateQueueService)
  )[];
}
export namespace AnimateQueueProvider {
  let $inject: string[];
}
