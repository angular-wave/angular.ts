/** @internal */
export interface ServiceDecorationInvocationLocals<T> {
  $delegate: T;
}

/** @internal */
export function createServiceDecorationInvocationLocals<T>(
  delegate: T,
): ServiceDecorationInvocationLocals<T> {
  return { $delegate: delegate };
}
