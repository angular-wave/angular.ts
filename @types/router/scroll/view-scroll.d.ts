export class ViewScrollProvider {
  enabled: boolean;
  useAnchorScroll(): void;
  $get: (
    | string
    | (($anchorScroll: ng.AnchorScrollObject) => ng.ViewScrollService)
  )[];
}
