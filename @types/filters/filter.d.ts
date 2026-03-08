/**
 * @returns {ng.FilterFn}
 */
export declare function filterFilter(): (
  array: Array<any> | ArrayLike<any> | null | undefined,
  expression: any,
  comparator?: boolean | ((actual: any, expected: any) => boolean),
  anyPropertyKey?: string,
) => ArrayLike<any>;
