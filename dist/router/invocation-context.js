/** @internal */
function createTransitionPolicyInvocationLocals(context) {
    return {
        context,
        $transition$: context.transition,
        state: context.state,
        from: context.from,
        to: context.to,
    };
}
/** @internal */
function createTransitionErrorPolicyInvocationLocals(context) {
    return {
        ...createTransitionPolicyInvocationLocals(context),
        error: context.error,
    };
}
/** @internal */
function createRetentionPolicyInvocationLocals(context) {
    return {
        context,
        $transition$: context.transition,
    };
}
/** @internal */
function createRetentionEvictionPolicyInvocationLocals(context) {
    return { context };
}

export { createRetentionEvictionPolicyInvocationLocals, createRetentionPolicyInvocationLocals, createTransitionErrorPolicyInvocationLocals, createTransitionPolicyInvocationLocals };
