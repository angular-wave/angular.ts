//go:build !js || !wasm

package angularwasm

// NotifyReady is a no-op outside standard Go browser Wasm.
func NotifyReady() {}
