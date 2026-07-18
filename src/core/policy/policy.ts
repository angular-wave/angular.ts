export interface PolicyContext<TOperation extends string = string> {
  readonly operation: TOperation;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface PolicyDecision<TType extends string = string> {
  readonly type: TType;
  readonly reason?: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export type Policy<
  TContext extends PolicyContext = PolicyContext,
  TDecisionType extends string = string,
> = (
  context: TContext,
) =>
  | PolicyDecision<TDecisionType>
  | TDecisionType
  | Promise<PolicyDecision<TDecisionType> | TDecisionType>;

/** @internal */
export function normalizePolicyDecision<TType extends string>(
  decision: PolicyDecision<TType> | TType,
): PolicyDecision<TType> {
  const value: unknown = decision;

  if (typeof value === "string") {
    return { type: value as TType };
  }

  if (
    typeof value !== "object" ||
    value === null ||
    !("type" in value) ||
    typeof value.type !== "string"
  ) {
    throw new TypeError("Policy must return a decision string or object.");
  }

  return value as PolicyDecision<TType>;
}
