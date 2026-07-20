// Generated from the Player AngularTS Wasm contract for Zig. Do not edit.
const angular = @import("angular-ts");

pub const positionX = angular.Field(f64).init("position.x");
pub const positionY = angular.Field(f64).init("position.y");
pub const health = angular.Field(u32).init("health");
pub const name = angular.Field([]const u8).init("name");
pub const frame = angular.BinaryField.optional("frame");
