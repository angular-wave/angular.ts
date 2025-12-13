export type ViewScroll =
  | ng.AnchorScrollService
  | ((el: Element) => void | Promise<void>);
