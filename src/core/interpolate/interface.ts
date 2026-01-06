export interface InterpolationFunction {
  expressions: any[];
  /**
   * Evaluate the interpolation.
   * @param context - The scope/context
   * @param cb - Optional callback when expressions change
   */
  (context: any, cb?: (val: any) => void): any;
  exp: string;
}

export interface InterpolateService {
  (
    text: string,
    mustHaveExpression?: boolean,
    trustedContext?: string,
    allOrNothing?: boolean,
  ): InterpolationFunction | undefined;
  endSymbol(): string;
  startSymbol(): string;
}
