//go:build js && wasm

package angularwasm

import (
	"encoding/json"
	"syscall/js"
)

// BrowserScope targets one AngularTS WasmScope through the standard Go
// syscall/js browser runtime.
type BrowserScope struct {
	Name string
}

// BrowserWatch is a JavaScript-backed AngularTS scope watch registration.
type BrowserWatch struct {
	dispose  js.Value
	callback js.Func
}

// BrowserNamed returns a standard-Go browser scope facade by stable scope name.
func BrowserNamed(name string) BrowserScope {
	return BrowserScope{Name: name}
}

// Get decodes a JSON-compatible scope path value into out.
func (s BrowserScope) Get(path string, out any) error {
	if s.Name == "" {
		return ErrInvalidScope
	}
	if path == "" {
		return ErrInvalidPath
	}

	payload := browserBridge().Call("getJSON", s.Name, path).String()
	if out == nil {
		return nil
	}

	return json.Unmarshal([]byte(payload), out)
}

// Set writes a JSON-compatible value into a scope path.
func (s BrowserScope) Set(path string, value any) error {
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

	if !browserBridge().Call("setJSON", s.Name, path, string(payload)).Bool() {
		return ErrInvalidScope
	}

	return nil
}

// Flush asks AngularTS to flush queued scope callbacks.
func (s BrowserScope) Flush() bool {
	if s.Name == "" {
		return false
	}

	return browserBridge().Call("flush", s.Name).Bool()
}

// Watch registers a scope path callback.
func (s BrowserScope) Watch(path string, fn func(Update)) BrowserWatch {
	if s.Name == "" || path == "" || fn == nil {
		return BrowserWatch{}
	}

	callback := js.FuncOf(func(_ js.Value, args []js.Value) any {
		payload := ""
		if len(args) > 0 {
			payload = args[0].String()
		}
		fn(Update{
			ScopeName: s.Name,
			Path:      path,
			JSON:      []byte(payload),
		})

		return nil
	})
	dispose := browserBridge().Call("watchJSON", s.Name, path, callback)

	return BrowserWatch{dispose: dispose, callback: callback}
}

// WatchValue registers a typed browser scope watch and decodes updates before
// invoking fn.
func WatchValue[T any](scope BrowserScope, path string, fn func(T)) BrowserWatch {
	if fn == nil {
		return BrowserWatch{}
	}

	return scope.Watch(path, func(update Update) {
		var value T
		if err := update.Decode(&value); err == nil {
			fn(value)
		}
	})
}

// Unwatch removes this host watch registration.
func (w BrowserWatch) Unwatch() bool {
	if w.dispose.IsUndefined() || w.dispose.IsNull() {
		return false
	}

	w.dispose.Invoke()
	w.callback.Release()

	return true
}

func browserBridge() js.Value {
	return js.Global().Get("__angularTsGoWasmScopeAbi")
}
