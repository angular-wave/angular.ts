//go:build js && wasm

package angularwasm

//go:wasmimport angular_ts scope_resolve
func hostScopeResolve(namePtr uint32, nameLen uint32) uint32

//go:wasmimport angular_ts scope_get
func hostScopeGet(scopeHandle uint32, pathPtr uint32, pathLen uint32) uint32

//go:wasmimport angular_ts scope_get_named
func hostScopeGetNamed(namePtr uint32, nameLen uint32, pathPtr uint32, pathLen uint32) uint32

//go:wasmimport angular_ts scope_set
func hostScopeSet(scopeHandle uint32, pathPtr uint32, pathLen uint32, valuePtr uint32, valueLen uint32) uint32

//go:wasmimport angular_ts scope_set_named
func hostScopeSetNamed(namePtr uint32, nameLen uint32, pathPtr uint32, pathLen uint32, valuePtr uint32, valueLen uint32) uint32

//go:wasmimport angular_ts scope_delete
func hostScopeDelete(scopeHandle uint32, pathPtr uint32, pathLen uint32) uint32

//go:wasmimport angular_ts scope_delete_named
func hostScopeDeleteNamed(namePtr uint32, nameLen uint32, pathPtr uint32, pathLen uint32) uint32

//go:wasmimport angular_ts scope_sync
func hostScopeSync(scopeHandle uint32) uint32

//go:wasmimport angular_ts scope_sync_named
func hostScopeSyncNamed(namePtr uint32, nameLen uint32) uint32

//go:wasmimport angular_ts scope_watch
func hostScopeWatch(scopeHandle uint32, pathPtr uint32, pathLen uint32) uint32

//go:wasmimport angular_ts scope_watch_named
func hostScopeWatchNamed(namePtr uint32, nameLen uint32, pathPtr uint32, pathLen uint32) uint32

//go:wasmimport angular_ts scope_unwatch
func hostScopeUnwatch(watchHandle uint32) uint32

//go:wasmimport angular_ts scope_unbind
func hostScopeUnbind(scopeHandle uint32) uint32

//go:wasmimport angular_ts scope_unbind_named
func hostScopeUnbindNamed(namePtr uint32, nameLen uint32) uint32

//go:wasmimport angular_ts buffer_ptr
func hostBufferPtr(bufferHandle uint32) uint32

//go:wasmimport angular_ts buffer_len
func hostBufferLen(bufferHandle uint32) uint32

//go:wasmimport angular_ts buffer_free
func hostBufferFree(bufferHandle uint32)
