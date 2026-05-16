package angularwasm

import "encoding/json"

// Scope targets one host-owned AngularTS WasmScope handle.
type Scope struct {
	Handle uint32
}

// NamedScope targets one AngularTS WasmScope by stable scope name.
type NamedScope struct {
	Name string
}

// Watch is a host-owned AngularTS watch registration.
type Watch struct {
	Handle uint32
}

// Update is delivered when AngularTS observes a watched scope path change.
type Update struct {
	ScopeHandle uint32
	ScopeName   string
	Path        string
	JSON        []byte
}

// ResolveScope resolves a stable AngularTS scope name to a numeric handle.
func ResolveScope(name string) Scope {
	handle := withString(name, func(ptr uint32, length uint32) uint32 {
		return hostScopeResolve(ptr, length)
	})

	return Scope{Handle: handle}
}

// Named returns a name-targeted scope facade.
func Named(name string) NamedScope {
	return NamedScope{Name: name}
}

// Get decodes a JSON-compatible scope path value into out.
func (s Scope) Get(path string, out any) error {
	if s.Handle == 0 {
		return ErrInvalidScope
	}
	if path == "" {
		return ErrInvalidPath
	}

	return decodeBuffer(scopeGet(s.Handle, path), out)
}

// Set writes a JSON-compatible value into a scope path.
func (s Scope) Set(path string, value any) error {
	if s.Handle == 0 {
		return ErrInvalidScope
	}
	if path == "" {
		return ErrInvalidPath
	}

	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}

	ok := withString(path, func(pathPtr uint32, pathLen uint32) uint32 {
		return withBytes(payload, func(valuePtr uint32, valueLen uint32) uint32 {
			return hostScopeSet(s.Handle, pathPtr, pathLen, valuePtr, valueLen)
		})
	})
	if ok == 0 {
		return ErrInvalidScope
	}

	return nil
}

// Delete removes a scope path.
func (s Scope) Delete(path string) bool {
	if s.Handle == 0 || path == "" {
		return false
	}

	return withString(path, func(ptr uint32, length uint32) uint32 {
		return hostScopeDelete(s.Handle, ptr, length)
	}) == 1
}

// Sync asks AngularTS to sync queued scope callbacks.
func (s Scope) Sync() bool {
	if s.Handle == 0 {
		return false
	}

	return hostScopeSync(s.Handle) == 1
}

// Watch registers a scope path callback.
func (s Scope) Watch(path string, fn func(Update)) Watch {
	if s.Handle == 0 || path == "" {
		return Watch{}
	}

	handle := withString(path, func(ptr uint32, length uint32) uint32 {
		return hostScopeWatch(s.Handle, ptr, length)
	})
	if handle == 0 {
		return Watch{}
	}

	registerWatch(handle, s.Handle, path, fn)
	return Watch{Handle: handle}
}

// Unbind releases the host scope handle without destroying the AngularTS scope.
func (s Scope) Unbind() bool {
	if s.Handle == 0 {
		return false
	}

	return hostScopeUnbind(s.Handle) == 1
}

// Unwatch removes this host watch registration.
func (w Watch) Unwatch() bool {
	if w.Handle == 0 {
		return false
	}

	unregisterWatch(w.Handle)
	return hostScopeUnwatch(w.Handle) == 1
}

// Decode decodes the update JSON payload into out.
func (u Update) Decode(out any) error {
	return json.Unmarshal(u.JSON, out)
}

// Get decodes a JSON-compatible named-scope path value into out.
func (s NamedScope) Get(path string, out any) error {
	if s.Name == "" {
		return ErrInvalidScope
	}
	if path == "" {
		return ErrInvalidPath
	}

	buffer := withString(s.Name, func(namePtr uint32, nameLen uint32) uint32 {
		return withString(path, func(pathPtr uint32, pathLen uint32) uint32 {
			return hostScopeGetNamed(namePtr, nameLen, pathPtr, pathLen)
		})
	})

	return decodeBuffer(buffer, out)
}

// Set writes a JSON-compatible value into a named-scope path.
func (s NamedScope) Set(path string, value any) error {
	if s.Name == "" {
		return ErrInvalidScope
	}
	if path == "" {
		return ErrInvalidPath
	}

	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}

	ok := withString(s.Name, func(namePtr uint32, nameLen uint32) uint32 {
		return withString(path, func(pathPtr uint32, pathLen uint32) uint32 {
			return withBytes(payload, func(valuePtr uint32, valueLen uint32) uint32 {
				return hostScopeSetNamed(namePtr, nameLen, pathPtr, pathLen, valuePtr, valueLen)
			})
		})
	})
	if ok == 0 {
		return ErrInvalidScope
	}

	return nil
}

// Delete removes a named-scope path.
func (s NamedScope) Delete(path string) bool {
	if s.Name == "" || path == "" {
		return false
	}

	return withString(s.Name, func(namePtr uint32, nameLen uint32) uint32 {
		return withString(path, func(pathPtr uint32, pathLen uint32) uint32 {
			return hostScopeDeleteNamed(namePtr, nameLen, pathPtr, pathLen)
		})
	}) == 1
}

// Sync asks AngularTS to sync queued callbacks for the named scope.
func (s NamedScope) Sync() bool {
	if s.Name == "" {
		return false
	}

	return withString(s.Name, hostScopeSyncNamed) == 1
}

// Watch registers a named-scope path callback.
func (s NamedScope) Watch(path string, fn func(Update)) Watch {
	if s.Name == "" || path == "" {
		return Watch{}
	}

	handle := withString(s.Name, func(namePtr uint32, nameLen uint32) uint32 {
		return withString(path, func(pathPtr uint32, pathLen uint32) uint32 {
			return hostScopeWatchNamed(namePtr, nameLen, pathPtr, pathLen)
		})
	})
	if handle == 0 {
		return Watch{}
	}

	registerWatch(handle, 0, path, fn)
	return Watch{Handle: handle}
}

// Unbind releases the named host scope handle without destroying the AngularTS scope.
func (s NamedScope) Unbind() bool {
	if s.Name == "" {
		return false
	}

	return withString(s.Name, hostScopeUnbindNamed) == 1
}

func scopeGet(scopeHandle uint32, path string) uint32 {
	return withString(path, func(ptr uint32, length uint32) uint32 {
		return hostScopeGet(scopeHandle, ptr, length)
	})
}

func decodeBuffer(bufferHandle uint32, out any) error {
	if bufferHandle == 0 {
		return ErrInvalidBuffer
	}
	defer hostBufferFree(bufferHandle)

	ptr := hostBufferPtr(bufferHandle)
	length := hostBufferLen(bufferHandle)
	if ptr == 0 && length > 0 {
		return ErrInvalidBuffer
	}

	payload := bytesFromHost(ptr, length)
	if out == nil {
		return nil
	}

	return json.Unmarshal(payload, out)
}
