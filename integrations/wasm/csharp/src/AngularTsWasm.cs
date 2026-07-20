using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text;
using System.Text.Json;

namespace AngularTs.Wasm;

public readonly record struct ScopeUpdate(uint ScopeHandle, string Path, string Json);

public enum AbiError
{
    None = 0,
    Disposed = 1,
    InvalidHandle = 2,
    InvalidPointer = 3,
    InvalidLength = 4,
    InvalidJson = 5,
    UnsafePath = 6,
    LimitExceeded = 7,
    InvalidTransaction = 8,
    UnsupportedValue = 9,
    OperationFailed = 10,
}

internal readonly struct ResultBuffer
{
    public ResultBuffer(uint handle)
    {
        Handle = handle;
    }

    public uint Handle { get; }

    public string ReadString()
    {
        var ptr = Host.BufferPtr(Handle);
        var len = Host.BufferLen(Handle);

        if (ptr == IntPtr.Zero || len <= 0)
        {
            Host.BufferFree(Handle);
            return string.Empty;
        }

        unsafe
        {
            try
            {
                return Encoding.UTF8.GetString((byte*)ptr, len);
            }
            finally
            {
                Host.BufferFree(Handle);
            }
        }
    }

    public byte[] ReadBytes()
    {
        var ptr = Host.BufferPtr(Handle);
        var len = Host.BufferLen(Handle);

        if (ptr == IntPtr.Zero || len <= 0)
        {
            Host.BufferFree(Handle);
            return Array.Empty<byte>();
        }

        unsafe
        {
            try
            {
                return new ReadOnlySpan<byte>((byte*)ptr, len).ToArray();
            }
            finally
            {
                Host.BufferFree(Handle);
            }
        }
    }
}

public readonly struct Watch
{
    internal Watch(uint handle, string key)
    {
        Handle = handle;
        Key = key;
    }

    public uint Handle { get; }

    internal string Key { get; }

    public bool Unwatch()
    {
        ScopeCallbacks.Remove(Key);
        return Host.ScopeUnwatch(Handle) != 0;
    }
}

public readonly struct Scope
{
    public Scope(uint handle)
    {
        Handle = handle;
    }

    public uint Handle { get; }

    public static Scope Named(string name)
    {
        return Utf8.With(name, (namePtr, nameLen) =>
            new Scope(Host.ScopeResolve(namePtr, nameLen)));
    }

    public string GetJson(string path)
    {
        var scopeHandle = Handle;

        return Utf8.With(path, (pathPtr, pathLen) =>
            new ResultBuffer(Host.ScopeGet(scopeHandle, pathPtr, pathLen)).ReadString());
    }

    [RequiresUnreferencedCode(
        "JSON deserialization can require members that are removed by trimming. " +
        "Use GetJson and a source-generated JsonTypeInfo in trimmed browser builds.")]
    public T? Get<T>(string path)
    {
        return JsonSerializer.Deserialize<T>(GetJson(path));
    }

    public bool SetJson(string path, string json)
    {
        var scopeHandle = Handle;

        return Utf8.With(path, (pathPtr, pathLen) =>
            Utf8.With(json, (valuePtr, valueLen) =>
                Host.ScopeSet(scopeHandle, pathPtr, pathLen, valuePtr, valueLen) != 0));
    }

    public bool ApplyJson(string transactionJson)
    {
        var scopeHandle = Handle;

        return Utf8.With(transactionJson, (transactionPtr, transactionLen) =>
            Host.ScopeApply(scopeHandle, transactionPtr, transactionLen) != 0);
    }

    public byte[] GetBytes(string path)
    {
        var scopeHandle = Handle;

        return Utf8.With(path, (pathPtr, pathLen) =>
            new ResultBuffer(
                Host.ScopeGetBinary(scopeHandle, pathPtr, pathLen)).ReadBytes());
    }

    public bool SetBytes(string path, byte[] value, string optionsJson = "")
    {
        var scopeHandle = Handle;

        return Utf8.With(path, (pathPtr, pathLen) =>
            Utf8.WithBytes(value, (valuePtr, valueLen) =>
                Utf8.With(optionsJson, (optionsPtr, optionsLen) =>
                    Host.ScopeSetBinary(
                        scopeHandle,
                        pathPtr,
                        pathLen,
                        valuePtr,
                        valueLen,
                        optionsPtr,
                        optionsLen) != 0)));
    }

    public AbiError ErrorCode => (AbiError)Host.ErrorCode();

    public void ClearError()
    {
        Host.ErrorClear();
    }

    [RequiresUnreferencedCode(
        "JSON serialization can require members that are removed by trimming. " +
        "Use SetJson and a source-generated JsonTypeInfo in trimmed browser builds.")]
    public bool Set<T>(string path, T value)
    {
        return SetJson(path, JsonSerializer.Serialize(value));
    }

    public bool Delete(string path)
    {
        var scopeHandle = Handle;

        return Utf8.With(path, (pathPtr, pathLen) =>
            Host.ScopeDelete(scopeHandle, pathPtr, pathLen) != 0);
    }

    public bool Sync()
    {
        return Host.ScopeSync(Handle) != 0;
    }

    public Watch Watch(string path, Action<ScopeUpdate> callback)
    {
        var scopeHandle = Handle;

        return Utf8.With(path, (pathPtr, pathLen) =>
        {
            var handle = Host.ScopeWatch(scopeHandle, pathPtr, pathLen);
            var key = ScopeCallbacks.Key(scopeHandle, path);

            ScopeCallbacks.Add(key, callback);

            return new Watch(handle, key);
        });
    }

    public bool Unbind()
    {
        return Host.ScopeUnbind(Handle) != 0;
    }
}

[SupportedOSPlatform("browser")]
public static unsafe partial class AngularTsAbiExports
{
    public const int AbiVersion = 3;

    [JSExport]
    public static void NgScopeOnBindJs(int scopeHandle, int namePtr, int nameLen)
    {
        OnScopeBind((uint)scopeHandle, (IntPtr)namePtr, nameLen);
    }

    [JSExport]
    public static void NgScopeOnUnbindJs(int scopeHandle)
    {
        OnScopeUnbind((uint)scopeHandle);
    }

    [JSExport]
    public static int NgAbiVersionJs()
    {
        return AbiVersion;
    }

    [UnmanagedCallersOnly(EntryPoint = "ng_abi_version")]
    public static uint NgAbiVersion()
    {
        return AbiVersion;
    }

    [JSExport]
    public static void NgScopeOnTransactionJs(
        int scopeHandle,
        int transactionPtr,
        int transactionLen)
    {
        OnScopeTransaction(
            (uint)scopeHandle,
            (IntPtr)transactionPtr,
            transactionLen);
    }

    [UnmanagedCallersOnly(EntryPoint = "ng_abi_alloc")]
    public static IntPtr NgAbiAlloc(uint size)
    {
        return (IntPtr)NativeMemory.Alloc(size);
    }

    [UnmanagedCallersOnly(EntryPoint = "ng_abi_free")]
    public static void NgAbiFree(IntPtr ptr, uint size)
    {
        _ = size;
        NativeMemory.Free((void*)ptr);
    }

    [UnmanagedCallersOnly(EntryPoint = "ng_scope_on_bind")]
    public static void NgScopeOnBind(uint scopeHandle, IntPtr namePtr, int nameLen)
    {
        OnScopeBind(scopeHandle, namePtr, nameLen);
    }

    private static void OnScopeBind(uint scopeHandle, IntPtr namePtr, int nameLen)
    {
        _ = scopeHandle;
        _ = namePtr;
        _ = nameLen;
    }

    [UnmanagedCallersOnly(EntryPoint = "ng_scope_on_unbind")]
    public static void NgScopeOnUnbind(uint scopeHandle)
    {
        OnScopeUnbind(scopeHandle);
    }

    private static void OnScopeUnbind(uint scopeHandle)
    {
        ScopeCallbacks.RemoveScope(scopeHandle);
    }

    [UnmanagedCallersOnly(EntryPoint = "ng_scope_on_transaction")]
    public static void NgScopeOnTransaction(
        uint scopeHandle,
        IntPtr transactionPtr,
        int transactionLen)
    {
        OnScopeTransaction(scopeHandle, transactionPtr, transactionLen);
    }

    private static void OnScopeTransaction(
        uint scopeHandle,
        IntPtr transactionPtr,
        int transactionLen)
    {
        using var transaction = JsonDocument.Parse(
            Utf8.Read(transactionPtr, transactionLen));
        var root = transaction.RootElement;

        if (root.TryGetProperty("set", out var set) && set.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in set.EnumerateObject())
            {
                ScopeCallbacks.Dispatch(
                    new ScopeUpdate(scopeHandle, property.Name, property.Value.GetRawText()));
            }
        }

        if (root.TryGetProperty("delete", out var deleted) && deleted.ValueKind == JsonValueKind.Array)
        {
            foreach (var path in deleted.EnumerateArray())
            {
                if (path.ValueKind == JsonValueKind.String)
                {
                    ScopeCallbacks.Dispatch(
                        new ScopeUpdate(scopeHandle, path.GetString()!, "null"));
                }
            }
        }
    }
}

internal static class ScopeCallbacks
{
    private static readonly Dictionary<string, Action<ScopeUpdate>> Callbacks = new();

    public static string Key(uint scopeHandle, string path)
    {
        return $"{scopeHandle}:{path}";
    }

    public static void Add(string key, Action<ScopeUpdate> callback)
    {
        Callbacks[key] = callback;
    }

    public static void Remove(string key)
    {
        Callbacks.Remove(key);
    }

    public static void RemoveScope(uint scopeHandle)
    {
        var prefix = $"{scopeHandle}:";
        var keys = new List<string>();

        foreach (var key in Callbacks.Keys)
        {
            if (key.StartsWith(prefix, StringComparison.Ordinal))
            {
                keys.Add(key);
            }
        }

        foreach (var key in keys)
        {
            Callbacks.Remove(key);
        }
    }

    public static void Dispatch(ScopeUpdate update)
    {
        if (Callbacks.TryGetValue(Key(update.ScopeHandle, update.Path), out var callback))
        {
            callback(update);
        }
    }
}

internal static unsafe class Utf8
{
    public delegate T Utf8Callback<T>(IntPtr ptr, int len);

    public static T With<T>(string value, Utf8Callback<T> callback)
    {
        var bytes = Encoding.UTF8.GetBytes(value);

        fixed (byte* ptr = bytes)
        {
            return callback((IntPtr)ptr, bytes.Length);
        }
    }

    public static T WithBytes<T>(byte[] value, Utf8Callback<T> callback)
    {
        fixed (byte* ptr = value)
        {
            return callback((IntPtr)ptr, value.Length);
        }
    }

    public static string Read(IntPtr ptr, int len)
    {
        if (ptr == IntPtr.Zero || len <= 0)
        {
            return string.Empty;
        }

        return Encoding.UTF8.GetString((byte*)ptr, len);
    }
}

internal static partial class Host
{
    [JSImport("scope_resolve", "angular_ts")]
    private static partial int ScopeResolveRaw(IntPtr namePtr, int nameLen);

    internal static uint ScopeResolve(IntPtr namePtr, int nameLen)
    {
        return (uint)ScopeResolveRaw(namePtr, nameLen);
    }

    [JSImport("scope_get", "angular_ts")]
    private static partial int ScopeGetRaw(int scopeHandle, IntPtr pathPtr, int pathLen);

    internal static uint ScopeGet(uint scopeHandle, IntPtr pathPtr, int pathLen)
    {
        return (uint)ScopeGetRaw((int)scopeHandle, pathPtr, pathLen);
    }

    [JSImport("scope_set", "angular_ts")]
    private static partial int ScopeSetRaw(
        int scopeHandle,
        IntPtr pathPtr,
        int pathLen,
        IntPtr valuePtr,
        int valueLen);

    internal static uint ScopeSet(
        uint scopeHandle,
        IntPtr pathPtr,
        int pathLen,
        IntPtr valuePtr,
        int valueLen)
    {
        return (uint)ScopeSetRaw((int)scopeHandle, pathPtr, pathLen, valuePtr, valueLen);
    }

    [JSImport("scope_apply", "angular_ts")]
    private static partial int ScopeApplyRaw(
        int scopeHandle,
        IntPtr transactionPtr,
        int transactionLen);

    internal static uint ScopeApply(uint scopeHandle, IntPtr transactionPtr, int transactionLen)
    {
        return (uint)ScopeApplyRaw((int)scopeHandle, transactionPtr, transactionLen);
    }

    [JSImport("scope_get_binary", "angular_ts")]
    private static partial int ScopeGetBinaryRaw(
        int scopeHandle,
        IntPtr pathPtr,
        int pathLen);

    internal static uint ScopeGetBinary(uint scopeHandle, IntPtr pathPtr, int pathLen)
    {
        return (uint)ScopeGetBinaryRaw((int)scopeHandle, pathPtr, pathLen);
    }

    [JSImport("scope_set_binary", "angular_ts")]
    private static partial int ScopeSetBinaryRaw(
        int scopeHandle,
        IntPtr pathPtr,
        int pathLen,
        IntPtr valuePtr,
        int valueLen,
        IntPtr optionsPtr,
        int optionsLen);

    internal static uint ScopeSetBinary(
        uint scopeHandle,
        IntPtr pathPtr,
        int pathLen,
        IntPtr valuePtr,
        int valueLen,
        IntPtr optionsPtr,
        int optionsLen)
    {
        return (uint)ScopeSetBinaryRaw(
            (int)scopeHandle,
            pathPtr,
            pathLen,
            valuePtr,
            valueLen,
            optionsPtr,
            optionsLen);
    }

    [JSImport("scope_delete", "angular_ts")]
    private static partial int ScopeDeleteRaw(int scopeHandle, IntPtr pathPtr, int pathLen);

    internal static uint ScopeDelete(uint scopeHandle, IntPtr pathPtr, int pathLen)
    {
        return (uint)ScopeDeleteRaw((int)scopeHandle, pathPtr, pathLen);
    }

    [JSImport("scope_sync", "angular_ts")]
    private static partial int ScopeSyncRaw(int scopeHandle);

    internal static uint ScopeSync(uint scopeHandle)
    {
        return (uint)ScopeSyncRaw((int)scopeHandle);
    }

    [JSImport("scope_watch", "angular_ts")]
    private static partial int ScopeWatchRaw(int scopeHandle, IntPtr pathPtr, int pathLen);

    internal static uint ScopeWatch(uint scopeHandle, IntPtr pathPtr, int pathLen)
    {
        return (uint)ScopeWatchRaw((int)scopeHandle, pathPtr, pathLen);
    }

    [JSImport("scope_unwatch", "angular_ts")]
    private static partial int ScopeUnwatchRaw(int watchHandle);

    internal static uint ScopeUnwatch(uint watchHandle)
    {
        return (uint)ScopeUnwatchRaw((int)watchHandle);
    }

    [JSImport("scope_unbind", "angular_ts")]
    private static partial int ScopeUnbindRaw(int scopeHandle);

    internal static uint ScopeUnbind(uint scopeHandle)
    {
        return (uint)ScopeUnbindRaw((int)scopeHandle);
    }

    [JSImport("buffer_ptr", "angular_ts")]
    private static partial IntPtr BufferPtrRaw(int bufferHandle);

    internal static IntPtr BufferPtr(uint bufferHandle)
    {
        return BufferPtrRaw((int)bufferHandle);
    }

    [JSImport("buffer_len", "angular_ts")]
    private static partial int BufferLenRaw(int bufferHandle);

    internal static int BufferLen(uint bufferHandle)
    {
        return BufferLenRaw((int)bufferHandle);
    }

    [JSImport("buffer_free", "angular_ts")]
    private static partial void BufferFreeRaw(int bufferHandle);

    internal static void BufferFree(uint bufferHandle)
    {
        BufferFreeRaw((int)bufferHandle);
    }

    [JSImport("error_code", "angular_ts")]
    internal static partial int ErrorCode();

    [JSImport("error_clear", "angular_ts")]
    internal static partial void ErrorClear();
}
