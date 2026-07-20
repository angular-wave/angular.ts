// Generated from the Player AngularTS Wasm contract for C#. Do not edit.
namespace AngularTs.Contracts;

public readonly record struct Field<T>(string Path);

public static class PlayerContract
{
    public static readonly Field<double> PositionX = new("position.x");
    public static readonly Field<double> PositionY = new("position.y");
    public static readonly Field<uint> Health = new("health");
    public static readonly Field<string> Name = new("name");
    public static readonly Field<byte[]> Frame = new("frame");
}
