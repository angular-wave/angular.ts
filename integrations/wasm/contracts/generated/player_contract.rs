// Generated from the Player AngularTS Wasm contract for Rust. Do not edit.
use angular_ts::{BinaryField, Field};

pub const POSITION_X: Field<f64> = Field::new("position.x");
pub const POSITION_Y: Field<f64> = Field::new("position.y");
pub const HEALTH: Field<u32> = Field::new("health");
pub const NAME: Field<String> = Field::new("name");
pub const FRAME: BinaryField = BinaryField::optional("frame");
