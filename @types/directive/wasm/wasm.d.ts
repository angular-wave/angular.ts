export function ngWasmDirective(): {
  link: ($scope: any, $element: any, $attrs: any) => Promise<void>;
};
