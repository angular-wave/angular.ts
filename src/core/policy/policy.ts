export type PolicyDecisionType = string;

export type GatePolicyDecisionType = "allow" | "deny" | "redirect";

export interface PolicyContext {
  operation: string;
  target?: string;
  user?: unknown;
  meta?: Record<string, unknown>;
}

export interface PolicyDecision<TType extends string = PolicyDecisionType> {
  type: TType;
  reason?: string;
  status?: number;
  target?: string;
  error?: unknown;
  meta?: Record<string, unknown>;
}

export type Policy<
  TContext extends PolicyContext = PolicyContext,
  TDecision extends PolicyDecision = PolicyDecision,
> = (
  context: TContext,
) => TDecision | TDecision["type"] | Promise<TDecision | TDecision["type"]>;
