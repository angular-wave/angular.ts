/**
 * @param {ng.ParseService} $parse
 * @returns {ng.FilterFn}
 */
export function orderByFilter($parse: ng.ParseService): ng.FilterFn;
export namespace orderByFilter {
  let $inject: string[];
}
export type ComparisonObject = {
  value: any;
  tieBreaker: {
    value: number;
    type: string;
    index: number;
  };
  predicateValues: Array<{
    value: any;
    type: string;
    index: number;
  }>;
};
