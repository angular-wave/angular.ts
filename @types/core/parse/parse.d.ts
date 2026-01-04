export class ParseProvider {
  $get: (string | (($filter: ng.FilterService) => ng.ParseService))[];
}
