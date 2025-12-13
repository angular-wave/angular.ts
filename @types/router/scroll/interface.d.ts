export type ViewScrollService =
  | ng.AnchorScrollService
  | ((el: Element) => void | Promise<void>);
