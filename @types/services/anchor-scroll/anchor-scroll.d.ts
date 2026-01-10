export class AnchorScrollProvider {
  autoScrollingEnabled: boolean;
  $get: (
    | string
    | ((
        $location: ng.LocationService,
        $rootScope: ng.Scope,
      ) => ng.AnchorScrollService)
  )[];
}
