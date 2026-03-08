type PredicateValue = {
  value: any;
  type: string;
  index: number;
};
type SortPredicate = string | ((value: any) => any);
/**
 * @param {ng.ParseService} $parse
 * @returns {ng.FilterFn}
 */
export declare function orderByFilter(
  $parse: ng.ParseService,
): (
  array: Array<any> | ArrayLike<any> | Function | null | undefined,
  sortPredicate?: SortPredicate | SortPredicate[],
  reverseOrder?: boolean,
  compareFn?: (left: PredicateValue, right: PredicateValue) => number,
) => any;
export declare namespace orderByFilter {
  var $inject: "$parse"[];
}
export {};
