//go:build js && wasm

package angularwasm

import "syscall/js"

// NotifyReady signals generated JavaScript bootstrap that the Go Wasm app has registered exports.
func NotifyReady() {
	js.Global().Call(
		"dispatchEvent",
		js.Global().Get("CustomEvent").New("angular-ts-go-ready"),
	)
}
