export interface AriaService {
  config(key: string | number): any;
  _watchExpr(
    attrName: string | number,
    ariaAttr: string,
    nativeAriaNodeNamesParam: string[],
    negate: boolean,
  ): (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) => void;
}
