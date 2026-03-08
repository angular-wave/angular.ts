/**
 * @returns {ng.FilterFn}
 */
export declare function limitToFilter(): (
  input: Array<any> | ArrayLike<any> | string | number | Function,
  limit: string | number,
  begin?: string | number,
) => string | number | Function | ArrayLike<any>;
