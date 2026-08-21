// Generated from the Player AngularTS Wasm contract for Go. Do not edit.
// Package contracts contains Reactive player state shared between AngularTS and WebAssembly runtimes.
package contracts

const (
	// PlayerPathPositionX identifies the "position.x" field. Horizontal world position.
	PlayerPathPositionX = "position.x"
	// PlayerPathPositionY identifies the "position.y" field. Vertical world position.
	PlayerPathPositionY = "position.y"
	// PlayerPathHealth identifies the "health" field. Current player health.
	PlayerPathHealth = "health"
	// PlayerPathName identifies the "name" field. Player display name.
	PlayerPathName = "name"
	// PlayerPathFrame identifies the "frame" field. Optional binary frame payload.
	PlayerPathFrame = "frame"
)

// PlayerPositionXValue is the value type for the "position.x" field. Horizontal world position.
type PlayerPositionXValue = float64

// PlayerPositionYValue is the value type for the "position.y" field. Vertical world position.
type PlayerPositionYValue = float64

// PlayerHealthValue is the value type for the "health" field. Current player health.
type PlayerHealthValue = uint32

// PlayerNameValue is the value type for the "name" field. Player display name.
type PlayerNameValue = string

// PlayerFrameValue is the value type for the "frame" field. Optional binary frame payload.
type PlayerFrameValue = []byte
