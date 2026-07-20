package angularwasm

// WasmScope is the Go facade for an AngularTS host-owned WasmScope.
type WasmScope = Scope

// WasmScopeUpdate is the Go callback payload for watched scope updates.
type WasmScopeUpdate = Update

// WasmScopeReference identifies a host scope by handle or stable name.
type WasmScopeReference struct {
	Handle uint32
	Name   string
}

// WasmScopeWatchOptions configures a watched AngularTS scope path.
type WasmScopeWatchOptions struct {
	Path string
}

// WasmScopeBindingOptions configures a Go bridge scope binding.
type WasmScopeBindingOptions struct {
	Name string
}

// WasmScopeAbiImports documents the imported host functions used by Go Wasm.
type WasmScopeAbiImports struct {
	Module string
}

// WasmAbiExports documents the guest exports supplied by the Go Wasm package.
type WasmAbiExports struct {
	Version            string
	Alloc              string
	Free               string
	OnScopeBind        string
	OnScopeUnbind      string
	OnScopeTransaction string
}
