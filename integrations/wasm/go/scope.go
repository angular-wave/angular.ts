package angularwasm

import "encoding/json"

// Scope targets one host-owned AngularTS WasmScope handle.
type Scope struct {
	Handle uint32
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
	Deleted     bool
}

// Transaction applies multiple scope mutations as one reactive operation.
type Transaction struct {
	Set    map[string]any `json:"set,omitempty"`
	Delete []string       `json:"delete,omitempty"`
	Origin string         `json:"origin,omitempty"`
	Echo   *bool          `json:"echo,omitempty"`
}

// WriteOptions controls binary write origin and guest echo behavior.
type WriteOptions struct {
	Origin string `json:"origin,omitempty"`
	Echo   *bool  `json:"echo,omitempty"`
}

// AbiError is a machine-readable failure reported by the host ABI.
type AbiError uint32

const (
	AbiErrorNone AbiError = iota
	AbiErrorDisposed
	AbiErrorInvalidHandle
	AbiErrorInvalidPointer
	AbiErrorInvalidLength
	AbiErrorInvalidJSON
	AbiErrorUnsafePath
	AbiErrorLimitExceeded
	AbiErrorInvalidTransaction
	AbiErrorUnsupportedValue
	AbiErrorOperationFailed
)

// ResolveScope resolves a stable AngularTS scope name to a numeric handle.
func ResolveScope(name string) Scope {
	handle := withString(name, func(ptr uint32, length uint32) uint32 {
		return hostScopeResolve(ptr, length)
	})

	return Scope{Handle: handle}
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

// Apply sends one atomic transaction to the host reactive target.
func (s Scope) Apply(transaction Transaction) error {
	if s.Handle == 0 {
		return ErrInvalidScope
	}

	payload, err := json.Marshal(transaction)
	if err != nil {
		return err
	}

	if withBytes(payload, func(ptr uint32, length uint32) uint32 {
		return hostScopeApply(s.Handle, ptr, length)
	}) == 0 {
		return ErrInvalidScope
	}

	return nil
}

// GetBytes reads one scope path through the raw byte channel.
func (s Scope) GetBytes(path string) ([]byte, error) {
	if s.Handle == 0 {
		return nil, ErrInvalidScope
	}
	if path == "" {
		return nil, ErrInvalidPath
	}

	handle := withString(path, func(ptr uint32, length uint32) uint32 {
		return hostScopeGetBinary(s.Handle, ptr, length)
	})

	return readBuffer(handle)
}

// SetBytes writes raw bytes with optional origin and echo behavior.
func (s Scope) SetBytes(path string, value []byte, options WriteOptions) error {
	if s.Handle == 0 {
		return ErrInvalidScope
	}
	if path == "" {
		return ErrInvalidPath
	}

	optionsJSON, err := json.Marshal(options)
	if err != nil {
		return err
	}

	ok := withString(path, func(pathPtr uint32, pathLen uint32) uint32 {
		return withBytes(value, func(valuePtr uint32, valueLen uint32) uint32 {
			return withBytes(optionsJSON, func(optionsPtr uint32, optionsLen uint32) uint32 {
				return hostScopeSetBinary(
					s.Handle,
					pathPtr,
					pathLen,
					valuePtr,
					valueLen,
					optionsPtr,
					optionsLen,
				)
			})
		})
	})
	if ok == 0 {
		return ErrInvalidScope
	}

	return nil
}

// LastError returns the last machine-readable host ABI failure.
func LastError() AbiError {
	return AbiError(hostErrorCode())
}

// ClearError clears the last machine-readable host ABI failure.
func ClearError() {
	hostErrorClear()
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

func scopeGet(scopeHandle uint32, path string) uint32 {
	return withString(path, func(ptr uint32, length uint32) uint32 {
		return hostScopeGet(scopeHandle, ptr, length)
	})
}

func decodeBuffer(bufferHandle uint32, out any) error {
	payload, err := readBuffer(bufferHandle)
	if err != nil {
		return err
	}
	if out == nil {
		return nil
	}

	return json.Unmarshal(payload, out)
}

func readBuffer(bufferHandle uint32) ([]byte, error) {
	if bufferHandle == 0 {
		return nil, ErrInvalidBuffer
	}
	defer hostBufferFree(bufferHandle)

	ptr := hostBufferPtr(bufferHandle)
	length := hostBufferLen(bufferHandle)
	if ptr == 0 && length > 0 {
		return nil, ErrInvalidBuffer
	}

	return append([]byte(nil), bytesFromHost(ptr, length)...), nil
}
