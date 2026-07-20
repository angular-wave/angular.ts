/** @internal */
function normalizePolicyDecision(decision) {
    const value = decision;
    if (typeof value === "string") {
        return { type: value };
    }
    if (typeof value !== "object" ||
        value === null ||
        !("type" in value) ||
        typeof value.type !== "string") {
        throw new TypeError("Policy must return a decision string or object.");
    }
    return value;
}

export { normalizePolicyDecision };
