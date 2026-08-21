// Generated from the Player AngularTS Wasm contract for Rust. Do not edit.
// Reactive player state shared between AngularTS and WebAssembly runtimes.

use angular_ts::{BinaryField, Field};

/// Horizontal world position.
pub const POSITION_X: Field<f64> = Field::new("position.x");

/// Vertical world position.
pub const POSITION_Y: Field<f64> = Field::new("position.y");

/// Current player health.
pub const HEALTH: Field<u32> = Field::new("health");

/// Player display name.
pub const NAME: Field<String> = Field::new("name");

/// Optional binary frame payload.
pub const FRAME: BinaryField = BinaryField::optional("frame");
