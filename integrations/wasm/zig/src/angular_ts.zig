const builtin = @import("builtin");
const std = @import("std");

pub const ScopeHandle = u32;
pub const WatchHandle = u32;
pub const BufferHandle = u32;

pub const Error = error{
    InvalidBuffer,
    InvalidScope,
};

pub const WasmScopeReference = union(enum) {
    handle: ScopeHandle,
    name: []const u8,

    pub fn fromHandle(handle: ScopeHandle) WasmScopeReference {
        return .{ .handle = handle };
    }

    pub fn fromName(name: []const u8) WasmScopeReference {
        return .{ .name = name };
    }

    pub fn isValid(self: WasmScopeReference) bool {
        return switch (self) {
            .handle => |handle| handle != 0,
            .name => |name| name.len != 0,
        };
    }

    pub fn handleValue(self: WasmScopeReference) ?ScopeHandle {
        return switch (self) {
            .handle => |value| value,
            .name => null,
        };
    }

    pub fn nameValue(self: WasmScopeReference) ?[]const u8 {
        return switch (self) {
            .handle => null,
            .name => |value| value,
        };
    }
};

pub const WasmScopeUpdate = struct {
    scope_handle: ScopeHandle,
    path: []const u8,
    value_json: []const u8,
};

pub const WasmScopeWatchOptions = struct {
    path: []const u8,
};

pub const WasmScopeBindingOptions = struct {
    name: []const u8,
};

pub const WasmScopeAbiImports = struct {
    module: []const u8 = "angular_ts",
    scope_resolve: []const u8 = "scope_resolve",
    scope_get: []const u8 = "scope_get",
    scope_get_named: []const u8 = "scope_get_named",
    scope_set: []const u8 = "scope_set",
    scope_set_named: []const u8 = "scope_set_named",
    scope_delete: []const u8 = "scope_delete",
    scope_delete_named: []const u8 = "scope_delete_named",
    scope_sync: []const u8 = "scope_sync",
    scope_sync_named: []const u8 = "scope_sync_named",
    scope_watch: []const u8 = "scope_watch",
    scope_watch_named: []const u8 = "scope_watch_named",
    scope_unwatch: []const u8 = "scope_unwatch",
    scope_unbind: []const u8 = "scope_unbind",
    scope_unbind_named: []const u8 = "scope_unbind_named",
    buffer_ptr: []const u8 = "buffer_ptr",
    buffer_len: []const u8 = "buffer_len",
    buffer_free: []const u8 = "buffer_free",
};

pub const WasmAbiExports = struct {
    memory: []const u8 = "memory",
    alloc: []const u8 = "ng_abi_alloc",
    free: []const u8 = "ng_abi_free",
    on_scope_bind: []const u8 = "ng_scope_on_bind",
    on_scope_unbind: []const u8 = "ng_scope_on_unbind",
    on_scope_update: []const u8 = "ng_scope_on_update",
};

pub const Watch = struct {
    handle: WatchHandle,

    pub fn isValid(self: Watch) bool {
        return self.handle != 0;
    }

    pub fn unwatch(self: Watch) bool {
        if (!self.isValid()) {
            return false;
        }

        return status(hostScopeUnwatch(self.handle));
    }
};

pub const ResultBuffer = struct {
    handle: BufferHandle,

    pub fn isValid(self: ResultBuffer) bool {
        return self.handle != 0;
    }

    pub fn read(self: ResultBuffer, allocator: std.mem.Allocator) ![]u8 {
        if (!self.isValid()) {
            return Error.InvalidBuffer;
        }

        defer hostBufferFree(self.handle);

        const raw_ptr = hostBufferPtr(self.handle);
        const raw_len = hostBufferLen(self.handle);
        if (raw_ptr == 0 and raw_len != 0) {
            return Error.InvalidBuffer;
        }

        const source = memorySlice(raw_ptr, raw_len);
        const copy = try allocator.alloc(u8, source.len);
        @memcpy(copy, source);
        return copy;
    }
};

pub const Scope = struct {
    reference: WasmScopeReference,

    pub fn fromHandle(handle: ScopeHandle) Scope {
        return .{ .reference = WasmScopeReference.fromHandle(handle) };
    }

    pub fn named(name: []const u8) Scope {
        return .{ .reference = WasmScopeReference.fromName(name) };
    }

    pub fn resolve(name_value: []const u8) Scope {
        if (name_value.len == 0) {
            return Scope.fromHandle(0);
        }

        return Scope.fromHandle(hostScopeResolve(name_value));
    }

    pub fn isValid(self: Scope) bool {
        return self.reference.isValid();
    }

    pub fn get(self: Scope, allocator: std.mem.Allocator, path: []const u8) ![]u8 {
        if (!self.isValid() or path.len == 0) {
            return Error.InvalidScope;
        }

        const buffer = ResultBuffer{ .handle = switch (self.reference) {
            .handle => |scope_handle| hostScopeGet(scope_handle, path),
            .name => |scope_name| hostScopeGetNamed(scope_name, path),
        } };

        return buffer.read(allocator);
    }

    pub fn set(self: Scope, path: []const u8, json: []const u8) bool {
        if (!self.isValid() or path.len == 0) {
            return false;
        }

        return switch (self.reference) {
            .handle => |scope_handle| status(hostScopeSet(scope_handle, path, json)),
            .name => |scope_name| status(hostScopeSetNamed(scope_name, path, json)),
        };
    }

    pub fn delete(self: Scope, path: []const u8) bool {
        if (!self.isValid() or path.len == 0) {
            return false;
        }

        return switch (self.reference) {
            .handle => |scope_handle| status(hostScopeDelete(scope_handle, path)),
            .name => |scope_name| status(hostScopeDeleteNamed(scope_name, path)),
        };
    }

    pub fn sync(self: Scope) bool {
        if (!self.isValid()) {
            return false;
        }

        return switch (self.reference) {
            .handle => |scope_handle| status(hostScopeSync(scope_handle)),
            .name => |scope_name| status(hostScopeSyncNamed(scope_name)),
        };
    }

    pub fn watch(self: Scope, path: []const u8) Watch {
        if (!self.isValid() or path.len == 0) {
            return .{ .handle = 0 };
        }

        return .{ .handle = switch (self.reference) {
            .handle => |scope_handle| hostScopeWatch(scope_handle, path),
            .name => |scope_name| hostScopeWatchNamed(scope_name, path),
        } };
    }

    pub fn unbind(self: Scope) bool {
        if (!self.isValid()) {
            return false;
        }

        return switch (self.reference) {
            .handle => |scope_handle| status(hostScopeUnbind(scope_handle)),
            .name => |scope_name| status(hostScopeUnbindNamed(scope_name)),
        };
    }
};

pub var on_scope_bind: ?*const fn (ScopeHandle, []const u8) void = null;
pub var on_scope_unbind: ?*const fn (ScopeHandle) void = null;
pub var on_scope_update: ?*const fn (WasmScopeUpdate) void = null;

pub fn setScopeBindCallback(callback: ?*const fn (ScopeHandle, []const u8) void) void {
    on_scope_bind = callback;
}

pub fn setScopeUnbindCallback(callback: ?*const fn (ScopeHandle) void) void {
    on_scope_unbind = callback;
}

pub fn setScopeUpdateCallback(callback: ?*const fn (WasmScopeUpdate) void) void {
    on_scope_update = callback;
}

pub export fn ng_abi_alloc(size: usize) usize {
    if (size == 0) {
        return 0;
    }

    const memory = abiAllocator().alloc(u8, size) catch return 0;
    return @intFromPtr(memory.ptr);
}

pub export fn ng_abi_free(raw_ptr: usize, size: usize) void {
    if (raw_ptr == 0 or size == 0) {
        return;
    }

    const memory: [*]u8 = @ptrFromInt(raw_ptr);
    abiAllocator().free(memory[0..size]);
}

pub export fn ng_scope_on_bind(scope_handle: ScopeHandle, name_ptr: usize, name_len: usize) void {
    if (on_scope_bind) |callback| {
        callback(scope_handle, memorySlice(name_ptr, name_len));
    }
}

pub export fn ng_scope_on_unbind(scope_handle: ScopeHandle) void {
    if (on_scope_unbind) |callback| {
        callback(scope_handle);
    }
}

pub export fn ng_scope_on_update(
    scope_handle: ScopeHandle,
    path_ptr: usize,
    path_len: usize,
    value_ptr: usize,
    value_len: usize,
) void {
    if (on_scope_update) |callback| {
        callback(.{
            .scope_handle = scope_handle,
            .path = memorySlice(path_ptr, path_len),
            .value_json = memorySlice(value_ptr, value_len),
        });
    }
}

extern "angular_ts" fn scope_resolve(name_ptr: u32, name_len: u32) ScopeHandle;
extern "angular_ts" fn scope_get(scope_handle: ScopeHandle, path_ptr: u32, path_len: u32) BufferHandle;
extern "angular_ts" fn scope_get_named(name_ptr: u32, name_len: u32, path_ptr: u32, path_len: u32) BufferHandle;
extern "angular_ts" fn scope_set(scope_handle: ScopeHandle, path_ptr: u32, path_len: u32, value_ptr: u32, value_len: u32) u32;
extern "angular_ts" fn scope_set_named(name_ptr: u32, name_len: u32, path_ptr: u32, path_len: u32, value_ptr: u32, value_len: u32) u32;
extern "angular_ts" fn scope_delete(scope_handle: ScopeHandle, path_ptr: u32, path_len: u32) u32;
extern "angular_ts" fn scope_delete_named(name_ptr: u32, name_len: u32, path_ptr: u32, path_len: u32) u32;
extern "angular_ts" fn scope_sync(scope_handle: ScopeHandle) u32;
extern "angular_ts" fn scope_sync_named(name_ptr: u32, name_len: u32) u32;
extern "angular_ts" fn scope_watch(scope_handle: ScopeHandle, path_ptr: u32, path_len: u32) WatchHandle;
extern "angular_ts" fn scope_watch_named(name_ptr: u32, name_len: u32, path_ptr: u32, path_len: u32) WatchHandle;
extern "angular_ts" fn scope_unwatch(watch_handle: WatchHandle) u32;
extern "angular_ts" fn scope_unbind(scope_handle: ScopeHandle) u32;
extern "angular_ts" fn scope_unbind_named(name_ptr: u32, name_len: u32) u32;
extern "angular_ts" fn buffer_ptr(buffer_handle: BufferHandle) usize;
extern "angular_ts" fn buffer_len(buffer_handle: BufferHandle) usize;
extern "angular_ts" fn buffer_free(buffer_handle: BufferHandle) void;

var native_test_buffer_handle: BufferHandle = 0;
var native_test_buffer_value: []const u8 = "";
var native_test_buffer_free_count: u32 = 0;
var native_test_freed_buffer: BufferHandle = 0;

pub fn resetNativeTestHost() void {
    native_test_buffer_handle = 0;
    native_test_buffer_value = "";
    native_test_buffer_free_count = 0;
    native_test_freed_buffer = 0;
}

pub fn setNativeTestBuffer(buffer_handle: BufferHandle, value: []const u8) void {
    native_test_buffer_handle = buffer_handle;
    native_test_buffer_value = value;
}

pub fn nativeTestBufferFreeCount() u32 {
    return native_test_buffer_free_count;
}

pub fn nativeTestFreedBuffer() BufferHandle {
    return native_test_freed_buffer;
}

fn abiAllocator() std.mem.Allocator {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return std.heap.wasm_allocator;
    }

    return std.heap.page_allocator;
}

fn hostScopeResolve(name_value: []const u8) ScopeHandle {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_resolve(ptr(name_value), len(name_value));
    }
    return 0;
}

fn hostScopeGet(scope_handle: ScopeHandle, path_value: []const u8) BufferHandle {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_get(scope_handle, ptr(path_value), len(path_value));
    }
    return 0;
}

fn hostScopeGetNamed(scope_name: []const u8, path_value: []const u8) BufferHandle {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_get_named(ptr(scope_name), len(scope_name), ptr(path_value), len(path_value));
    }
    return 0;
}

fn hostScopeSet(scope_handle: ScopeHandle, path_value: []const u8, json: []const u8) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_set(scope_handle, ptr(path_value), len(path_value), ptr(json), len(json));
    }
    return 0;
}

fn hostScopeSetNamed(scope_name: []const u8, path_value: []const u8, json: []const u8) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_set_named(ptr(scope_name), len(scope_name), ptr(path_value), len(path_value), ptr(json), len(json));
    }
    return 0;
}

fn hostScopeDelete(scope_handle: ScopeHandle, path_value: []const u8) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_delete(scope_handle, ptr(path_value), len(path_value));
    }
    return 0;
}

fn hostScopeDeleteNamed(scope_name: []const u8, path_value: []const u8) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_delete_named(ptr(scope_name), len(scope_name), ptr(path_value), len(path_value));
    }
    return 0;
}

fn hostScopeSync(scope_handle: ScopeHandle) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_sync(scope_handle);
    }
    return 0;
}

fn hostScopeSyncNamed(scope_name: []const u8) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_sync_named(ptr(scope_name), len(scope_name));
    }
    return 0;
}

fn hostScopeWatch(scope_handle: ScopeHandle, path_value: []const u8) WatchHandle {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_watch(scope_handle, ptr(path_value), len(path_value));
    }
    return 0;
}

fn hostScopeWatchNamed(scope_name: []const u8, path_value: []const u8) WatchHandle {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_watch_named(ptr(scope_name), len(scope_name), ptr(path_value), len(path_value));
    }
    return 0;
}

fn hostScopeUnwatch(watch_handle: WatchHandle) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_unwatch(watch_handle);
    }
    return 0;
}

fn hostScopeUnbind(scope_handle: ScopeHandle) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_unbind(scope_handle);
    }
    return 0;
}

fn hostScopeUnbindNamed(scope_name: []const u8) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_unbind_named(ptr(scope_name), len(scope_name));
    }
    return 0;
}

fn hostBufferPtr(buffer_handle: BufferHandle) usize {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return buffer_ptr(buffer_handle);
    }
    if (buffer_handle == native_test_buffer_handle) {
        return @intFromPtr(native_test_buffer_value.ptr);
    }
    return 0;
}

fn hostBufferLen(buffer_handle: BufferHandle) usize {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return buffer_len(buffer_handle);
    }
    if (buffer_handle == native_test_buffer_handle) {
        return native_test_buffer_value.len;
    }
    return 0;
}

fn hostBufferFree(buffer_handle: BufferHandle) void {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        buffer_free(buffer_handle);
        return;
    }
    native_test_freed_buffer = buffer_handle;
    native_test_buffer_free_count += 1;
}

fn memorySlice(raw_ptr: usize, raw_len: usize) []const u8 {
    if (raw_ptr == 0 or raw_len == 0) {
        return "";
    }

    const bytes: [*]const u8 = @ptrFromInt(raw_ptr);
    return bytes[0..raw_len];
}

fn ptr(value: []const u8) u32 {
    return @intCast(@intFromPtr(value.ptr));
}

fn len(value: []const u8) u32 {
    return @intCast(value.len);
}

fn status(value: u32) bool {
    return value != 0;
}

test "scope references expose handles and names" {
    const by_handle = WasmScopeReference.fromHandle(42);
    try std.testing.expect(by_handle.isValid());
    try std.testing.expectEqual(@as(ScopeHandle, 42), by_handle.handleValue().?);
    try std.testing.expect(by_handle.nameValue() == null);

    const by_name = WasmScopeReference.fromName("todoList:main");
    try std.testing.expect(by_name.isValid());
    try std.testing.expectEqualStrings("todoList:main", by_name.nameValue().?);
    try std.testing.expect(by_name.handleValue() == null);

    try std.testing.expect(!WasmScopeReference.fromHandle(0).isValid());
    try std.testing.expect(!WasmScopeReference.fromName("").isValid());
}

test "scope wrapper validates references before host calls" {
    const invalid = Scope.fromHandle(0);
    try std.testing.expect(!invalid.isValid());
    try std.testing.expect(!invalid.set("title", "\"Todo\""));
    try std.testing.expect(!invalid.delete("title"));
    try std.testing.expect(!invalid.sync());
    try std.testing.expect(!invalid.watch("title").isValid());
    try std.testing.expect(!invalid.unbind());
    try std.testing.expectError(Error.InvalidScope, invalid.get(std.testing.allocator, "title"));
}

test "abi export names document the shared boundary" {
    const imports = WasmScopeAbiImports{};
    const exports = WasmAbiExports{};

    try std.testing.expectEqualStrings("angular_ts", imports.module);
    try std.testing.expectEqualStrings("scope_get_named", imports.scope_get_named);
    try std.testing.expectEqualStrings("ng_abi_alloc", exports.alloc);
    try std.testing.expectEqualStrings("ng_scope_on_update", exports.on_scope_update);
}

test "allocation exports round trip native memory" {
    const raw = ng_abi_alloc(4);
    try std.testing.expect(raw != 0);
    defer ng_abi_free(raw, 4);

    const bytes: [*]u8 = @ptrFromInt(raw);
    bytes[0] = 't';
    bytes[1] = 'o';
    bytes[2] = 'd';
    bytes[3] = 'o';

    try std.testing.expectEqualStrings("todo", bytes[0..4]);
}

test "result buffers are copied and freed" {
    resetNativeTestHost();
    setNativeTestBuffer(77, "{\"title\":\"Todo\"}");

    const value = try (ResultBuffer{ .handle = 77 }).read(std.testing.allocator);
    defer std.testing.allocator.free(value);

    try std.testing.expectEqualStrings("{\"title\":\"Todo\"}", value);
    try std.testing.expectEqual(@as(u32, 1), nativeTestBufferFreeCount());
    try std.testing.expectEqual(@as(BufferHandle, 77), nativeTestFreedBuffer());
}

var last_bind_handle: ScopeHandle = 0;
var last_bind_name: []const u8 = "";
var last_update: WasmScopeUpdate = .{
    .scope_handle = 0,
    .path = "",
    .value_json = "",
};

fn rememberBind(scope_handle: ScopeHandle, name_value: []const u8) void {
    last_bind_handle = scope_handle;
    last_bind_name = name_value;
}

fn rememberUpdate(update: WasmScopeUpdate) void {
    last_update = update;
}

test "guest lifecycle exports dispatch registered callbacks" {
    setScopeBindCallback(&rememberBind);
    defer setScopeBindCallback(null);
    setScopeUpdateCallback(&rememberUpdate);
    defer setScopeUpdateCallback(null);

    const name_value = "todoList:main";
    ng_scope_on_bind(7, @intFromPtr(name_value.ptr), name_value.len);

    try std.testing.expectEqual(@as(ScopeHandle, 7), last_bind_handle);
    try std.testing.expectEqualStrings("todoList:main", last_bind_name);

    const path_value = "newTodo";
    const json_value = "\"Review Zig\"";
    ng_scope_on_update(
        7,
        @intFromPtr(path_value.ptr),
        path_value.len,
        @intFromPtr(json_value.ptr),
        json_value.len,
    );

    try std.testing.expectEqual(@as(ScopeHandle, 7), last_update.scope_handle);
    try std.testing.expectEqualStrings("newTodo", last_update.path);
    try std.testing.expectEqualStrings("\"Review Zig\"", last_update.value_json);
}
