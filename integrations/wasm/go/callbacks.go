package angularwasm

type watchCallback struct {
	scopeHandle uint32
	path        string
	fn          func(Update)
}

var watchCallbacks = map[uint32]watchCallback{}

func registerWatch(handle uint32, scopeHandle uint32, path string, fn func(Update)) {
	if fn == nil {
		return
	}

	watchCallbacks[handle] = watchCallback{
		scopeHandle: scopeHandle,
		path:        path,
		fn:          fn,
	}
}

func unregisterWatch(handle uint32) {
	delete(watchCallbacks, handle)
}

//export ng_scope_on_bind
func ngScopeOnBind(scopeHandle uint32, namePtr uint32, nameLen uint32) {
}

//export ng_scope_on_unbind
func ngScopeOnUnbind(scopeHandle uint32) {
	for handle, callback := range watchCallbacks {
		if callback.scopeHandle == scopeHandle {
			delete(watchCallbacks, handle)
		}
	}
}

//export ng_scope_on_update
func ngScopeOnUpdate(scopeHandle uint32, pathPtr uint32, pathLen uint32, valuePtr uint32, valueLen uint32) {
	path := string(bytesFromHost(pathPtr, pathLen))
	payload := bytesFromHost(valuePtr, valueLen)

	for _, callback := range watchCallbacks {
		if callback.scopeHandle == scopeHandle && callback.path == path {
			callback.fn(Update{
				ScopeHandle: scopeHandle,
				Path:        path,
				JSON:        payload,
			})
		}
	}
}
