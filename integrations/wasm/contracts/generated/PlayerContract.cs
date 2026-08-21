// Generated from the Player AngularTS Wasm contract for C#. Do not edit.
namespace AngularTs.Contracts;

public readonly record struct Field<T>(string Path);

/// <summary>Reactive player state shared between AngularTS and WebAssembly runtimes.</summary>
public static class PlayerContract
{
    /// <summary>Horizontal world position.</summary>
    public static readonly Field<double> PositionX = new("position.x");
    /// <summary>Vertical world position.</summary>
    public static readonly Field<double> PositionY = new("position.y");
    /// <summary>Current player health.</summary>
    public static readonly Field<uint> Health = new("health");
    /// <summary>Player display name.</summary>
    public static readonly Field<string> Name = new("name");
    /// <summary>Optional binary frame payload.</summary>
    public static readonly Field<byte[]> Frame = new("frame");
}
