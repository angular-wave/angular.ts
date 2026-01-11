export class ViewScrollProvider {
  enabled: boolean;
  useAnchorScroll(): void;
  $get: (
    | string
    | (($anchorScroll: ng.AnchorScrollService) => ng.ViewScrollService)
  )[];
}
