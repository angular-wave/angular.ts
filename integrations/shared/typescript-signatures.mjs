/** Choose a representative callable signature for bindings without overloads. */
export function selectBindingSignature(
  signatures,
  { preferMostParameters = false } = {},
) {
  const arity = preferMostParameters
    ? Math.max(...signatures.map((signature) => signature.parameters.length))
    : signatures[0]?.parameters.length;
  const candidates = signatures.filter(
    (signature) => signature.parameters.length === arity,
  );
  return candidates.reduce((selected, candidate) => {
    if (!selected) return candidate;
    // Different parameter lists describe distinct calling conventions.
    if (
      candidate.parameters.some(
        (parameter, index) =>
          parameter.name !== selected.parameters[index].name,
      )
    ) {
      return selected;
    }
    // For matching lists, retain the overload supporting omitted arguments.
    return requiredParameterCount(candidate) < requiredParameterCount(selected)
      ? candidate
      : selected;
  }, undefined);
}

function requiredParameterCount(signature) {
  return signature.parameters.filter((parameter) => {
    const declaration =
      parameter.valueDeclaration ?? parameter.declarations?.[0];
    return (
      !declaration?.questionToken &&
      !declaration?.initializer &&
      !declaration?.dotDotDotToken
    );
  }).length;
}
