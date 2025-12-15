export type ViewScrollService =
  | ng.AnchorScrollService
  | ((element: Element) => void);
