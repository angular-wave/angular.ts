package angularwasm

import "errors"

var (
	// ErrInvalidScope is returned when a scope handle or name cannot target a host scope.
	ErrInvalidScope = errors.New("angular.ts wasm: invalid scope")
	// ErrInvalidPath is returned when a path argument is empty.
	ErrInvalidPath = errors.New("angular.ts wasm: invalid scope path")
	// ErrInvalidBuffer is returned when the host returns an invalid result buffer.
	ErrInvalidBuffer = errors.New("angular.ts wasm: invalid result buffer")
)
