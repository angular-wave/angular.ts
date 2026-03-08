export declare class AnchorScrollProvider {
  autoScrollingEnabled: boolean;
  constructor();
  $get: (
    | "$location"
    | "$rootScope"
    | ((
        $location: ng.LocationService,
        $rootScope: ng.Scope,
      ) => import("./interface.ts").AnchorScrollService)
  )[];
}
