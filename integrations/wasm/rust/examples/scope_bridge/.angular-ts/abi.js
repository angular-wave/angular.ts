const imports = () => {
  const abi = globalThis.__angularTsWasmScopeAbi;

  if (!abi?.imports?.angular_ts) {
    throw new Error("AngularTS Wasm scope ABI is not initialized.");
  }

  return abi.imports.angular_ts;
};

export const scope_resolve = (namePtr, nameLen) =>
  imports().scope_resolve(namePtr, nameLen);
export const scope_get = (scopeHandle, pathPtr, pathLen) =>
  imports().scope_get(scopeHandle, pathPtr, pathLen);
export const scope_set = (scopeHandle, pathPtr, pathLen, valuePtr, valueLen) =>
  imports().scope_set(scopeHandle, pathPtr, pathLen, valuePtr, valueLen);
export const scope_apply = (scopeHandle, transactionPtr, transactionLen) =>
  imports().scope_apply(scopeHandle, transactionPtr, transactionLen);
export const scope_get_binary = (scopeHandle, pathPtr, pathLen) =>
  imports().scope_get_binary(scopeHandle, pathPtr, pathLen);
export const scope_set_binary = (
  scopeHandle,
  pathPtr,
  pathLen,
  valuePtr,
  valueLen,
  optionsPtr,
  optionsLen,
) => imports().scope_set_binary(
  scopeHandle,
  pathPtr,
  pathLen,
  valuePtr,
  valueLen,
  optionsPtr,
  optionsLen,
);
export const scope_delete = (scopeHandle, pathPtr, pathLen) =>
  imports().scope_delete(scopeHandle, pathPtr, pathLen);
export const scope_sync = (scopeHandle) => imports().scope_sync(scopeHandle);
export const scope_watch = (scopeHandle, pathPtr, pathLen) =>
  imports().scope_watch(scopeHandle, pathPtr, pathLen);
export const scope_unwatch = (watchHandle) => imports().scope_unwatch(watchHandle);
export const scope_unbind = (scopeHandle) => imports().scope_unbind(scopeHandle);
export const buffer_ptr = (bufferHandle) => imports().buffer_ptr(bufferHandle);
export const buffer_len = (bufferHandle) => imports().buffer_len(bufferHandle);
export const buffer_free = (bufferHandle) => imports().buffer_free(bufferHandle);
export const error_code = () => imports().error_code();
export const error_clear = () => imports().error_clear();
