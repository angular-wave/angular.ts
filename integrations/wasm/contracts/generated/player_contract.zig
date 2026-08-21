// Generated from the Player AngularTS Wasm contract for Zig. Do not edit.
//! Reactive player state shared between AngularTS and WebAssembly runtimes.

const angular = @import("angular-ts");

/// Horizontal world position.
pub const positionX = angular.Field(f64).init("position.x");

/// Vertical world position.
pub const positionY = angular.Field(f64).init("position.y");

/// Current player health.
pub const health = angular.Field(u32).init("health");

/// Player display name.
pub const name = angular.Field([]const u8).init("name");

/// Optional binary frame payload.
pub const frame = angular.BinaryField.optional("frame");
