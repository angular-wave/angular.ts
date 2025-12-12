export class AnchorScrollProvider {
  autoScrollingEnabled: boolean;
  $get: (
    | string
    | ((
        $location: ng.LocationService,
        $rootScope: ng.Scope,
      ) => import("./interface.ts").AnchorScrollFunction)
  )[];
}
