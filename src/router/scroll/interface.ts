export type IViewScrollService =
  | ng.AnchorScrollService
  | ((el: Element) => void | Promise<void>);
