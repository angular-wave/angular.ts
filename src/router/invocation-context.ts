import type {
  StateRetentionEvictionContext,
  StateRetentionPolicyContext,
  StateDeclaration,
  StateTransitionErrorPolicyContext,
} from "./state/interface.ts";

interface TransitionPolicyInvocationContext {
  transition?: ng.Transition;
  from: StateDeclaration;
  to: StateDeclaration;
  state: StateDeclaration;
}

/** @internal */
export function createTransitionPolicyInvocationLocals<
  TContext extends TransitionPolicyInvocationContext,
>(context: TContext) {
  return {
    context,
    $transition$: context.transition,
    state: context.state,
    from: context.from,
    to: context.to,
  };
}

/** @internal */
export function createTransitionErrorPolicyInvocationLocals(
  context: StateTransitionErrorPolicyContext,
) {
  return {
    ...createTransitionPolicyInvocationLocals(context),
    error: context.error,
  };
}

/** @internal */
export function createRetentionPolicyInvocationLocals(
  context: StateRetentionPolicyContext,
) {
  return {
    context,
    $transition$: context.transition,
  };
}

/** @internal */
export function createRetentionEvictionPolicyInvocationLocals(
  context: StateRetentionEvictionContext,
) {
  return { context };
}
