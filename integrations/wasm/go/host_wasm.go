//go:build js && wasm

package angularwasm

//go:wasmimport angular_ts scope_resolve
func hostScopeResolve(namePtr uint32, nameLen uint32) uint32

//go:wasmimport angular_ts scope_get
func hostScopeGet(scopeHandle uint32, pathPtr uint32, pathLen uint32) uint32

//go:wasmimport angular_ts scope_set
func hostScopeSet(scopeHandle uint32, pathPtr uint32, pathLen uint32, valuePtr uint32, valueLen uint32) uint32

//go:wasmimport angular_ts scope_apply
func hostScopeApply(scopeHandle uint32, transactionPtr uint32, transactionLen uint32) uint32

//go:wasmimport angular_ts scope_get_binary
func hostScopeGetBinary(scopeHandle uint32, pathPtr uint32, pathLen uint32) uint32

//go:wasmimport angular_ts scope_set_binary
func hostScopeSetBinary(scopeHandle uint32, pathPtr uint32, pathLen uint32, valuePtr uint32, valueLen uint32, optionsPtr uint32, optionsLen uint32) uint32

//go:wasmimport angular_ts scope_delete
func hostScopeDelete(scopeHandle uint32, pathPtr uint32, pathLen uint32) uint32

//go:wasmimport angular_ts scope_sync
func hostScopeSync(scopeHandle uint32) uint32

//go:wasmimport angular_ts scope_watch
func hostScopeWatch(scopeHandle uint32, pathPtr uint32, pathLen uint32) uint32

//go:wasmimport angular_ts scope_unwatch
func hostScopeUnwatch(watchHandle uint32) uint32

//go:wasmimport angular_ts scope_unbind
func hostScopeUnbind(scopeHandle uint32) uint32

//go:wasmimport angular_ts buffer_ptr
func hostBufferPtr(bufferHandle uint32) uint32

//go:wasmimport angular_ts buffer_len
func hostBufferLen(bufferHandle uint32) uint32

//go:wasmimport angular_ts buffer_free
func hostBufferFree(bufferHandle uint32)

//go:wasmimport angular_ts error_code
func hostErrorCode() uint32

//go:wasmimport angular_ts error_clear
func hostErrorClear()
