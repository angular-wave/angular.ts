package angularwasm

import "encoding/json"

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

//export ng_scope_on_transaction
func ngScopeOnTransaction(scopeHandle uint32, transactionPtr uint32, transactionLen uint32) {
	var transaction struct {
		Set    map[string]json.RawMessage `json:"set"`
		Delete []string                   `json:"delete"`
	}
	if err := json.Unmarshal(bytesFromHost(transactionPtr, transactionLen), &transaction); err != nil {
		return
	}

	for _, callback := range watchCallbacks {
		if callback.scopeHandle != scopeHandle {
			continue
		}
		if payload, ok := transaction.Set[callback.path]; ok {
			callback.fn(Update{
				ScopeHandle: scopeHandle,
				Path:        callback.path,
				JSON:        payload,
			})
		}
		for _, path := range transaction.Delete {
			if path == callback.path {
				callback.fn(Update{
					ScopeHandle: scopeHandle,
					Path:        path,
					JSON:        []byte("null"),
					Deleted:     true,
				})
			}
		}
	}
}
