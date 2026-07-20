const std = @import("std");
const angular = @import("angular-ts");
const player = @import("player-contract");

test "generated fields carry paths and Zig value types" {
    try std.testing.expectEqualStrings("position.x", player.positionX.path);
    try std.testing.expectEqual(f64, @TypeOf(player.positionX).Value);
    try std.testing.expectEqual(u32, @TypeOf(player.health).Value);
    try std.testing.expectEqualStrings("frame", player.frame.path);
    try std.testing.expect(player.frame.is_optional);

    const scope = angular.Scope.fromHandle(1);
    _ = scope;
}
