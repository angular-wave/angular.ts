function invalidTransitionHook(trans) {
    if (!trans.valid()) {
        throw new Error(trans.error()?.toString());
    }
}
/**
 * Fails transitions that are already known to be invalid before any work runs.
 * This keeps invalid targets from progressing into the rest of the hook pipeline.
 */
const registerInvalidTransitionHook = (transitionService) => transitionService.onBefore({}, invalidTransitionHook, { priority: -1e4 });

export { registerInvalidTransitionHook };
