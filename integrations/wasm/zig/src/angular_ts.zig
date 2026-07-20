const builtin = @import("builtin");
const std = @import("std");

pub const ScopeHandle = u32;
pub const WatchHandle = u32;
const BufferHandle = u32;

pub const Error = error{
    DeletedValue,
    Disposed,
    InvalidBuffer,
    InvalidHandle,
    InvalidJson,
    InvalidLength,
    InvalidPath,
    InvalidPointer,
    InvalidScope,
    InvalidTransaction,
    LimitExceeded,
    OperationFailed,
    UnexpectedPath,
    UnsafePath,
    UnsupportedValue,
};

pub const AbiError = enum(u32) {
    none = 0,
    disposed = 1,
    invalid_handle = 2,
    invalid_pointer = 3,
    invalid_length = 4,
    invalid_json = 5,
    unsafe_path = 6,
    limit_exceeded = 7,
    invalid_transaction = 8,
    unsupported_value = 9,
    operation_failed = 10,
    _,
};

pub fn Field(comptime T: type) type {
    return struct {
        pub const Value = T;
        pub const Assignment = struct {
            path: []const u8,
            value: T,
        };

        path: []const u8,

        pub fn init(path: []const u8) @This() {
            return .{ .path = path };
        }

        pub fn set(self: @This(), value: T) Assignment {
            return .{
                .path = self.path,
                .value = value,
            };
        }
    };
}

pub const BinaryField = struct {
    path: []const u8,
    is_optional: bool = false,

    pub fn init(path: []const u8) BinaryField {
        return .{ .path = path };
    }

    pub fn optional(path: []const u8) BinaryField {
        return .{ .path = path, .is_optional = true };
    }
};

pub fn ReadResult(comptime T: type) type {
    return struct {
        parsed: std.json.Parsed(T),
        value: T,

        pub fn deinit(self: *@This()) void {
            self.parsed.deinit();
        }
    };
}

pub const Update = struct {
    scope_handle: ScopeHandle,
    path: []const u8,
    value_json: []const u8,
    deleted: bool = false,
    origin: ?[]const u8 = null,

    pub fn decode(
        self: Update,
        field: anytype,
    ) !ReadResult(fieldValue(@TypeOf(field))) {
        return self.decodeWithAllocator(abiAllocator(), field);
    }

    pub fn decodeWithAllocator(
        self: Update,
        allocator: std.mem.Allocator,
        field: anytype,
    ) !ReadResult(fieldValue(@TypeOf(field))) {
        if (!std.mem.eql(u8, self.path, field.path)) {
            return Error.UnexpectedPath;
        }
        if (self.deleted) {
            return Error.DeletedValue;
        }

        return parseJson(fieldValue(@TypeOf(field)), allocator, self.value_json);
    }
};

pub const Transaction = struct {
    scope_handle: ScopeHandle,
    transaction_json: []const u8,
};

pub const wasm_abi_version: u32 = 3;

pub const Watch = struct {
    handle: WatchHandle,
    observes_updates: bool = false,

    pub fn isValid(self: Watch) bool {
        return self.handle != 0;
    }

    pub fn unwatch(self: *Watch) !void {
        if (!self.isValid()) {
            return Error.InvalidHandle;
        }

        try requireStatus(hostScopeUnwatch(self.handle), Error.InvalidHandle);
        if (self.observes_updates) {
            unregisterObserver(self.handle);
        }
        self.handle = 0;
        self.observes_updates = false;
    }

    pub fn deinit(self: *Watch) void {
        if (!self.isValid()) {
            return;
        }

        _ = hostScopeUnwatch(self.handle);
        if (self.observes_updates) {
            unregisterObserver(self.handle);
        }
        self.handle = 0;
        self.observes_updates = false;
    }
};

const ResultBuffer = struct {
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
    handle: ScopeHandle,

    pub fn fromHandle(handle: ScopeHandle) Scope {
        return .{ .handle = handle };
    }

    pub fn resolve(name_value: []const u8) !Scope {
        if (name_value.len == 0) {
            return Error.InvalidScope;
        }

        const scope = Scope.fromHandle(hostScopeResolve(name_value));
        if (!scope.isValid()) {
            return hostFailure(Error.InvalidScope);
        }

        return scope;
    }

    pub fn isValid(self: Scope) bool {
        return self.handle != 0;
    }

    pub fn get(
        self: Scope,
        field: anytype,
    ) !ReadResult(fieldValue(@TypeOf(field))) {
        return self.getWithAllocator(abiAllocator(), field);
    }

    pub fn getWithAllocator(
        self: Scope,
        allocator: std.mem.Allocator,
        field: anytype,
    ) !ReadResult(fieldValue(@TypeOf(field))) {
        const json = try self.getJson(allocator, field.path);
        defer allocator.free(json);

        return parseJson(fieldValue(@TypeOf(field)), allocator, json);
    }

    pub fn getJson(self: Scope, allocator: std.mem.Allocator, path: []const u8) ![]u8 {
        try self.validatePath(path);

        const handle = hostScopeGet(self.handle, path);
        if (handle == 0) {
            return hostFailure(Error.InvalidBuffer);
        }

        return (ResultBuffer{ .handle = handle }).read(allocator);
    }

    pub fn set(self: Scope, field: anytype, value: fieldValue(@TypeOf(field))) !void {
        const json = try std.json.Stringify.valueAlloc(abiAllocator(), value, .{});
        defer abiAllocator().free(json);

        try self.setJson(field.path, json);
    }

    pub fn setJson(self: Scope, path: []const u8, json: []const u8) !void {
        try self.validatePath(path);
        if (json.len == 0) {
            return Error.InvalidJson;
        }

        try requireStatus(hostScopeSet(self.handle, path, json), Error.OperationFailed);
    }

    pub fn apply(self: Scope, transaction: anytype) !void {
        const json = try std.json.Stringify.valueAlloc(abiAllocator(), transaction, .{});
        defer abiAllocator().free(json);

        try self.applyJson(json);
    }

    pub fn update(self: Scope, assignments: anytype) !void {
        if (assignments.len == 0) {
            return Error.InvalidTransaction;
        }

        var output: std.Io.Writer.Allocating = .init(abiAllocator());
        defer output.deinit();
        const writer = &output.writer;

        try writer.writeAll("{\"set\":{");
        inline for (assignments, 0..) |assignment, index| {
            if (index != 0) {
                try writer.writeByte(',');
            }
            try std.json.Stringify.value(assignment.path, .{}, writer);
            try writer.writeByte(':');
            try std.json.Stringify.value(assignment.value, .{}, writer);
        }
        try writer.writeAll("}}");

        try self.applyJson(output.written());
    }

    pub fn applyJson(self: Scope, transaction_json: []const u8) !void {
        if (!self.isValid()) {
            return Error.InvalidScope;
        }
        if (transaction_json.len == 0) {
            return Error.InvalidTransaction;
        }

        try requireStatus(hostScopeApply(self.handle, transaction_json), Error.OperationFailed);
    }

    pub fn getBinary(self: Scope, allocator: std.mem.Allocator, field: BinaryField) ![]u8 {
        try self.validatePath(field.path);

        const handle = hostScopeGetBinary(self.handle, field.path);
        if (handle == 0) {
            return hostFailure(Error.InvalidBuffer);
        }

        return (ResultBuffer{ .handle = handle }).read(allocator);
    }

    pub fn setBinary(self: Scope, field: BinaryField, value: []const u8) !void {
        try self.setBinaryJson(field.path, value, "{}");
    }

    pub fn setBinaryJson(self: Scope, path: []const u8, value: []const u8, options_json: []const u8) !void {
        try self.validatePath(path);
        if (options_json.len == 0) {
            return Error.InvalidTransaction;
        }

        try requireStatus(
            hostScopeSetBinary(self.handle, path, value, options_json),
            Error.OperationFailed,
        );
    }

    pub fn delete(self: Scope, field: anytype) !void {
        try self.deletePath(field.path);
    }

    pub fn deletePath(self: Scope, path: []const u8) !void {
        try self.validatePath(path);
        try requireStatus(hostScopeDelete(self.handle, path), Error.OperationFailed);
    }

    pub fn sync(self: Scope) !void {
        if (!self.isValid()) {
            return Error.InvalidScope;
        }

        try requireStatus(hostScopeSync(self.handle), Error.OperationFailed);
    }

    pub fn watch(self: Scope, field: anytype) !Watch {
        return self.watchPath(field.path);
    }

    pub fn observe(
        self: Scope,
        field: anytype,
        context: anytype,
        comptime callback: *const fn (
            @TypeOf(context),
            observedValue(fieldValue(@TypeOf(field))),
        ) void,
    ) !Watch {
        return self.registerObservation(
            field,
            context,
            valueObserverCallback(
                @TypeOf(field),
                @TypeOf(context),
                callback,
            ),
        );
    }

    pub fn observeUpdates(
        self: Scope,
        field: anytype,
        context: anytype,
        comptime callback: *const fn (@TypeOf(context), Update) void,
    ) !Watch {
        return self.registerObservation(
            field,
            context,
            updateObserverCallback(@TypeOf(context), callback),
        );
    }

    fn registerObservation(
        self: Scope,
        field: anytype,
        context: anytype,
        callback: *const fn (*anyopaque, Update) void,
    ) !Watch {
        const Context = @TypeOf(context);
        switch (@typeInfo(Context)) {
            .pointer => {},
            else => @compileError("AngularTS observer context must be a pointer"),
        }

        var registration = try self.watch(field);
        errdefer registration.deinit();

        try registerObserver(.{
            .watch_handle = registration.handle,
            .scope_handle = self.handle,
            .path = field.path,
            .context = @ptrCast(context),
            .callback = callback,
        });
        registration.observes_updates = true;
        return registration;
    }

    pub fn watchPath(self: Scope, path: []const u8) !Watch {
        try self.validatePath(path);

        const registration = Watch{ .handle = hostScopeWatch(self.handle, path) };
        if (!registration.isValid()) {
            return hostFailure(Error.InvalidHandle);
        }

        return registration;
    }

    pub fn unbind(self: Scope) !void {
        if (!self.isValid()) {
            return Error.InvalidScope;
        }

        try requireStatus(hostScopeUnbind(self.handle), Error.OperationFailed);
    }

    fn validatePath(self: Scope, path: []const u8) !void {
        if (!self.isValid()) {
            return Error.InvalidScope;
        }
        if (path.len == 0) {
            return Error.InvalidPath;
        }
    }
};

pub fn lastError() AbiError {
    return @enumFromInt(hostErrorCode());
}

pub fn clearError() void {
    hostErrorClear();
}

const max_observers = 4096;

const ObserverRegistration = struct {
    watch_handle: WatchHandle,
    scope_handle: ScopeHandle,
    path: []const u8,
    context: *anyopaque,
    callback: *const fn (*anyopaque, Update) void,
};

var observers: std.ArrayList(?ObserverRegistration) = .empty;
var on_scope_bind: ?*const fn (ScopeHandle, []const u8) void = null;
var on_scope_unbind: ?*const fn (ScopeHandle) void = null;
var on_scope_update: ?*const fn (Update) void = null;
var on_scope_transaction: ?*const fn (Transaction) void = null;

fn updateObserverCallback(
    comptime Context: type,
    comptime callback: *const fn (Context, Update) void,
) *const fn (*anyopaque, Update) void {
    return &struct {
        fn call(context: *anyopaque, update: Update) void {
            const typed_context: Context = @ptrCast(@alignCast(context));
            callback(typed_context, update);
        }
    }.call;
}

fn valueObserverCallback(
    comptime FieldType: type,
    comptime Context: type,
    comptime callback: *const fn (
        Context,
        observedValue(fieldValue(FieldType)),
    ) void,
) *const fn (*anyopaque, Update) void {
    return &struct {
        fn call(context: *anyopaque, update: Update) void {
            const typed_context: Context = @ptrCast(@alignCast(context));
            if (update.deleted) {
                callback(typed_context, null);
                return;
            }

            var decoded = parseJson(
                fieldValue(FieldType),
                abiAllocator(),
                update.value_json,
            ) catch return;
            defer decoded.deinit();
            callback(typed_context, decoded.value);
        }
    }.call;
}

fn registerObserver(registration: ObserverRegistration) !void {
    for (observers.items) |*slot| {
        if (slot.* == null) {
            const path = try abiAllocator().dupe(u8, registration.path);
            slot.* = .{
                .watch_handle = registration.watch_handle,
                .scope_handle = registration.scope_handle,
                .path = path,
                .context = registration.context,
                .callback = registration.callback,
            };
            return;
        }
    }

    if (observers.items.len >= max_observers) {
        return Error.LimitExceeded;
    }

    const path = try abiAllocator().dupe(u8, registration.path);
    errdefer abiAllocator().free(path);
    try observers.append(abiAllocator(), .{
        .watch_handle = registration.watch_handle,
        .scope_handle = registration.scope_handle,
        .path = path,
        .context = registration.context,
        .callback = registration.callback,
    });
}

fn unregisterObserver(watch_handle: WatchHandle) void {
    for (observers.items) |*slot| {
        const registration = slot.* orelse continue;
        if (registration.watch_handle != watch_handle) {
            continue;
        }

        abiAllocator().free(registration.path);
        slot.* = null;
        return;
    }
}

fn unregisterScopeObservers(scope_handle: ScopeHandle) void {
    for (observers.items) |*slot| {
        const registration = slot.* orelse continue;
        if (registration.scope_handle != scope_handle) {
            continue;
        }

        abiAllocator().free(registration.path);
        slot.* = null;
    }
}

fn dispatchObservers(update: Update) void {
    for (observers.items) |*slot| {
        const registration = slot.* orelse continue;
        if (registration.scope_handle != update.scope_handle or
            !std.mem.eql(u8, registration.path, update.path))
        {
            continue;
        }

        registration.callback(registration.context, update);
    }
}

fn hasScopeObservers(scope_handle: ScopeHandle) bool {
    for (observers.items) |slot| {
        const registration = slot orelse continue;
        if (registration.scope_handle == scope_handle) {
            return true;
        }
    }

    return false;
}

pub fn setScopeBindCallback(callback: ?*const fn (ScopeHandle, []const u8) void) void {
    on_scope_bind = callback;
}

pub fn setScopeUnbindCallback(callback: ?*const fn (ScopeHandle) void) void {
    on_scope_unbind = callback;
}

pub fn setScopeUpdateCallback(callback: ?*const fn (Update) void) void {
    on_scope_update = callback;
}

pub fn setScopeTransactionCallback(callback: ?*const fn (Transaction) void) void {
    on_scope_transaction = callback;
}

pub export fn ng_abi_version() u32 {
    return wasm_abi_version;
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
    unregisterScopeObservers(scope_handle);
    if (on_scope_unbind) |callback| {
        callback(scope_handle);
    }
}

pub export fn ng_scope_on_transaction(
    scope_handle: ScopeHandle,
    transaction_ptr: usize,
    transaction_len: usize,
) void {
    const transaction_json = memorySlice(transaction_ptr, transaction_len);

    if (on_scope_transaction) |callback| {
        callback(.{
            .scope_handle = scope_handle,
            .transaction_json = transaction_json,
        });
    }

    dispatchScopeTransaction(scope_handle, transaction_json);
}

fn dispatchScopeTransaction(scope_handle: ScopeHandle, transaction_json: []const u8) void {
    if (transaction_json.len == 0 or
        (on_scope_update == null and !hasScopeObservers(scope_handle)))
    {
        return;
    }

    const allocator = abiAllocator();
    const parsed = std.json.parseFromSlice(std.json.Value, allocator, transaction_json, .{}) catch return;
    defer parsed.deinit();

    const transaction = switch (parsed.value) {
        .object => |value| value,
        else => return,
    };
    const origin = if (transaction.get("origin")) |origin_value|
        switch (origin_value) {
            .string => |value| value,
            else => null,
        }
    else
        null;

    if (transaction.get("set")) |set_value| {
        switch (set_value) {
            .object => |set| {
                var entries = set.iterator();
                while (entries.next()) |entry| {
                    const value_json = std.json.Stringify.valueAlloc(
                        allocator,
                        entry.value_ptr.*,
                        .{},
                    ) catch continue;
                    defer allocator.free(value_json);

                    dispatchScopeUpdate(
                        scope_handle,
                        entry.key_ptr.*,
                        value_json,
                        false,
                        origin,
                    );
                }
            },
            else => {},
        }
    }

    if (transaction.get("delete")) |delete_value| {
        switch (delete_value) {
            .array => |paths| {
                for (paths.items) |path_value| {
                    switch (path_value) {
                        .string => |path| dispatchScopeUpdate(
                            scope_handle,
                            path,
                            "null",
                            true,
                            origin,
                        ),
                        else => {},
                    }
                }
            },
            else => {},
        }
    }
}

fn dispatchScopeUpdate(
    scope_handle: ScopeHandle,
    path: []const u8,
    value_json: []const u8,
    deleted: bool,
    origin: ?[]const u8,
) void {
    if (on_scope_update) |callback| {
        callback(.{
            .scope_handle = scope_handle,
            .path = path,
            .value_json = value_json,
            .deleted = deleted,
            .origin = origin,
        });
    }

    dispatchObservers(.{
        .scope_handle = scope_handle,
        .path = path,
        .value_json = value_json,
        .deleted = deleted,
        .origin = origin,
    });
}

extern "angular_ts" fn scope_resolve(name_ptr: u32, name_len: u32) ScopeHandle;
extern "angular_ts" fn scope_get(scope_handle: ScopeHandle, path_ptr: u32, path_len: u32) BufferHandle;
extern "angular_ts" fn scope_set(scope_handle: ScopeHandle, path_ptr: u32, path_len: u32, value_ptr: u32, value_len: u32) u32;
extern "angular_ts" fn scope_apply(scope_handle: ScopeHandle, transaction_ptr: u32, transaction_len: u32) u32;
extern "angular_ts" fn scope_get_binary(scope_handle: ScopeHandle, path_ptr: u32, path_len: u32) BufferHandle;
extern "angular_ts" fn scope_set_binary(scope_handle: ScopeHandle, path_ptr: u32, path_len: u32, value_ptr: u32, value_len: u32, options_ptr: u32, options_len: u32) u32;
extern "angular_ts" fn scope_delete(scope_handle: ScopeHandle, path_ptr: u32, path_len: u32) u32;
extern "angular_ts" fn scope_sync(scope_handle: ScopeHandle) u32;
extern "angular_ts" fn scope_watch(scope_handle: ScopeHandle, path_ptr: u32, path_len: u32) WatchHandle;
extern "angular_ts" fn scope_unwatch(watch_handle: WatchHandle) u32;
extern "angular_ts" fn scope_unbind(scope_handle: ScopeHandle) u32;
extern "angular_ts" fn buffer_ptr(buffer_handle: BufferHandle) usize;
extern "angular_ts" fn buffer_len(buffer_handle: BufferHandle) usize;
extern "angular_ts" fn buffer_free(buffer_handle: BufferHandle) void;
extern "angular_ts" fn error_code() u32;
extern "angular_ts" fn error_clear() void;

var native_test_buffer_handle: BufferHandle = 0;
var native_test_buffer_value: []const u8 = "";
var native_test_buffer_free_count: u32 = 0;
var native_test_freed_buffer: BufferHandle = 0;
var native_test_scope_handle: ScopeHandle = 0;
var native_test_watch_handle: WatchHandle = 0;
var native_test_status: u32 = 0;
var native_test_error_code: u32 = 0;
var native_test_write_path: [128]u8 = undefined;
var native_test_write_path_len: usize = 0;
var native_test_write_value: [2048]u8 = undefined;
var native_test_write_value_len: usize = 0;

pub const testing = if (builtin.is_test) struct {
    pub fn resetHost() void {
        resetNativeTestHost();
    }

    pub fn configureHost(scope_handle: ScopeHandle, watch_handle: WatchHandle) void {
        configureNativeTestHost(scope_handle, watch_handle);
    }
} else struct {};

fn resetNativeTestHost() void {
    resetObservers();
    native_test_buffer_handle = 0;
    native_test_buffer_value = "";
    native_test_buffer_free_count = 0;
    native_test_freed_buffer = 0;
    native_test_scope_handle = 0;
    native_test_watch_handle = 0;
    native_test_status = 0;
    native_test_error_code = 0;
    native_test_write_path_len = 0;
    native_test_write_value_len = 0;
}

fn resetObservers() void {
    for (observers.items) |*slot| {
        const registration = slot.* orelse continue;
        abiAllocator().free(registration.path);
    }
    observers.clearAndFree(abiAllocator());
}

fn configureNativeTestHost(scope_handle: ScopeHandle, watch_handle: WatchHandle) void {
    native_test_scope_handle = scope_handle;
    native_test_watch_handle = watch_handle;
    native_test_status = 1;
}

fn setNativeTestError(code: u32) void {
    native_test_error_code = code;
    native_test_status = 0;
}

fn nativeTestWritePath() []const u8 {
    return native_test_write_path[0..native_test_write_path_len];
}

fn nativeTestWriteValue() []const u8 {
    return native_test_write_value[0..native_test_write_value_len];
}

fn setNativeTestBuffer(buffer_handle: BufferHandle, value: []const u8) void {
    native_test_buffer_handle = buffer_handle;
    native_test_buffer_value = value;
}

fn nativeTestBufferFreeCount() u32 {
    return native_test_buffer_free_count;
}

fn nativeTestFreedBuffer() BufferHandle {
    return native_test_freed_buffer;
}

fn rememberNativeTestWrite(path_value: []const u8, value: []const u8) void {
    native_test_write_path_len = @min(path_value.len, native_test_write_path.len);
    native_test_write_value_len = @min(value.len, native_test_write_value.len);
    @memcpy(native_test_write_path[0..native_test_write_path_len], path_value[0..native_test_write_path_len]);
    @memcpy(native_test_write_value[0..native_test_write_value_len], value[0..native_test_write_value_len]);
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
    return native_test_scope_handle;
}

fn hostScopeGet(scope_handle: ScopeHandle, path_value: []const u8) BufferHandle {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_get(scope_handle, ptr(path_value), len(path_value));
    }
    return native_test_buffer_handle;
}

fn hostScopeSet(scope_handle: ScopeHandle, path_value: []const u8, json: []const u8) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_set(scope_handle, ptr(path_value), len(path_value), ptr(json), len(json));
    }
    rememberNativeTestWrite(path_value, json);
    return native_test_status;
}

fn hostScopeApply(scope_handle: ScopeHandle, transaction_json: []const u8) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_apply(scope_handle, ptr(transaction_json), len(transaction_json));
    }
    rememberNativeTestWrite("$transaction", transaction_json);
    return native_test_status;
}

fn hostScopeGetBinary(scope_handle: ScopeHandle, path_value: []const u8) BufferHandle {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_get_binary(scope_handle, ptr(path_value), len(path_value));
    }
    return hostScopeGet(scope_handle, path_value);
}

fn hostScopeSetBinary(scope_handle: ScopeHandle, path_value: []const u8, value: []const u8, options_json: []const u8) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_set_binary(scope_handle, ptr(path_value), len(path_value), ptr(value), len(value), ptr(options_json), len(options_json));
    }
    rememberNativeTestWrite(path_value, value);
    return native_test_status;
}

fn hostErrorCode() u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return error_code();
    }
    return native_test_error_code;
}

fn hostErrorClear() void {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        error_clear();
        return;
    }
    native_test_error_code = 0;
}

fn hostScopeDelete(scope_handle: ScopeHandle, path_value: []const u8) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_delete(scope_handle, ptr(path_value), len(path_value));
    }
    rememberNativeTestWrite(path_value, "null");
    return native_test_status;
}

fn hostScopeSync(scope_handle: ScopeHandle) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_sync(scope_handle);
    }
    return native_test_status;
}

fn hostScopeWatch(scope_handle: ScopeHandle, path_value: []const u8) WatchHandle {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_watch(scope_handle, ptr(path_value), len(path_value));
    }
    return native_test_watch_handle;
}

fn hostScopeUnwatch(watch_handle: WatchHandle) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_unwatch(watch_handle);
    }
    return native_test_status;
}

fn hostScopeUnbind(scope_handle: ScopeHandle) u32 {
    if (builtin.target.cpu.arch == .wasm32 or builtin.target.cpu.arch == .wasm64) {
        return scope_unbind(scope_handle);
    }
    return native_test_status;
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

fn fieldValue(comptime FieldType: type) type {
    if (!@hasDecl(FieldType, "Value")) {
        @compileError("AngularTS typed scope operations require angular.Field(T)");
    }

    return FieldType.Value;
}

fn observedValue(comptime T: type) type {
    return switch (@typeInfo(T)) {
        .optional => T,
        else => ?T,
    };
}

fn parseJson(comptime T: type, allocator: std.mem.Allocator, json: []const u8) !ReadResult(T) {
    const parsed = try std.json.parseFromSlice(T, allocator, json, .{
        .allocate = .alloc_always,
    });
    return .{
        .parsed = parsed,
        .value = parsed.value,
    };
}

fn requireStatus(value: u32, fallback: Error) !void {
    if (value == 0) {
        return hostFailure(fallback);
    }
}

fn hostFailure(fallback: Error) Error {
    return switch (hostErrorCode()) {
        1 => Error.Disposed,
        2 => Error.InvalidHandle,
        3 => Error.InvalidPointer,
        4 => Error.InvalidLength,
        5 => Error.InvalidJson,
        6 => Error.UnsafePath,
        7 => Error.LimitExceeded,
        8 => Error.InvalidTransaction,
        9 => Error.UnsupportedValue,
        10 => Error.OperationFailed,
        else => fallback,
    };
}

test "scopes expose resolved handles" {
    const by_handle = Scope.fromHandle(42);
    try std.testing.expect(by_handle.isValid());
    try std.testing.expectEqual(@as(ScopeHandle, 42), by_handle.handle);

    try std.testing.expect(!Scope.fromHandle(0).isValid());
}

test "scope wrapper validates references before host calls" {
    const invalid = Scope.fromHandle(0);
    const title = Field([]const u8).init("title");
    try std.testing.expect(!invalid.isValid());
    try std.testing.expectError(Error.InvalidScope, invalid.set(title, "Todo"));
    try std.testing.expectError(Error.InvalidScope, invalid.delete(title));
    try std.testing.expectError(Error.InvalidScope, invalid.sync());
    try std.testing.expectError(Error.InvalidScope, invalid.watch(title));
    try std.testing.expectError(Error.InvalidScope, invalid.unbind());
    try std.testing.expectError(Error.InvalidScope, invalid.get(title));
}

test "typed fields encode, decode, watch, and transact without raw JSON" {
    resetNativeTestHost();
    configureNativeTestHost(42, 9);
    setNativeTestBuffer(77, "\"Ada\"");

    const name = Field([]const u8).init("name");
    const health = Field(u32).init("health");
    const scope = try Scope.resolve("player:main");

    var decoded = try scope.get(name);
    defer decoded.deinit();
    try std.testing.expectEqualStrings("Ada", decoded.value);

    try scope.set(health, 90);
    try std.testing.expectEqualStrings("health", nativeTestWritePath());
    try std.testing.expectEqualStrings("90", nativeTestWriteValue());

    try scope.update(.{
        health.set(100),
        name.set("Grace"),
    });
    try std.testing.expectEqualStrings("$transaction", nativeTestWritePath());
    try std.testing.expectEqualStrings(
        "{\"set\":{\"health\":100,\"name\":\"Grace\"}}",
        nativeTestWriteValue(),
    );

    var watch = try scope.watch(name);
    try std.testing.expect(watch.isValid());
    watch.deinit();
    try std.testing.expect(!watch.isValid());
}

test "typed updates validate paths and decode values" {
    const title = Field([]const u8).init("title");
    const update = Update{
        .scope_handle = 7,
        .path = "title",
        .value_json = "\"Review Zig\"",
    };

    var decoded = try update.decode(title);
    defer decoded.deinit();
    try std.testing.expectEqualStrings("Review Zig", decoded.value);

    const other = Field([]const u8).init("other");
    try std.testing.expectError(Error.UnexpectedPath, update.decode(other));
}

test "scoped observers dispatch matching updates and release with their watch" {
    resetNativeTestHost();
    configureNativeTestHost(42, 9);

    const Context = struct {
        updates: usize = 0,
        value: [32]u8 = undefined,
        value_len: usize = 0,

        fn receive(self: *@This(), value: ?[]const u8) void {
            const title = value orelse "";
            self.value_len = @min(title.len, self.value.len);
            @memcpy(self.value[0..self.value_len], title[0..self.value_len]);
            self.updates += 1;
        }
    };

    var context = Context{};
    const title = Field([]const u8).init("title");
    const scope = try Scope.resolve("todo:main");
    var observation = try scope.observe(title, &context, &Context.receive);

    const matching = "{\"set\":{\"title\":\"Observed\",\"other\":true}}";
    ng_scope_on_transaction(42, @intFromPtr(matching.ptr), matching.len);
    try std.testing.expectEqual(@as(usize, 1), context.updates);
    try std.testing.expectEqualStrings("Observed", context.value[0..context.value_len]);

    const deleted = "{\"delete\":[\"title\"]}";
    ng_scope_on_transaction(42, @intFromPtr(deleted.ptr), deleted.len);
    try std.testing.expectEqual(@as(usize, 2), context.updates);
    try std.testing.expectEqual(@as(usize, 0), context.value_len);

    observation.deinit();
    const ignored = "{\"set\":{\"title\":\"Ignored\"}}";
    ng_scope_on_transaction(42, @intFromPtr(ignored.ptr), ignored.len);
    try std.testing.expectEqual(@as(usize, 2), context.updates);
}

test "event observers preserve synchronization origin" {
    resetNativeTestHost();
    configureNativeTestHost(42, 10);

    const Context = struct {
        received_socket_origin: bool = false,

        fn receive(self: *@This(), update: Update) void {
            self.received_socket_origin = if (update.origin) |origin|
                std.mem.eql(u8, origin, "socket")
            else
                false;
        }
    };

    var context = Context{};
    const title = Field([]const u8).init("title");
    const scope = try Scope.resolve("todo:main");
    var observation = try scope.observeUpdates(title, &context, &Context.receive);
    defer observation.deinit();

    const transaction = "{\"set\":{\"title\":\"Remote\"},\"origin\":\"socket\"}";
    ng_scope_on_transaction(42, @intFromPtr(transaction.ptr), transaction.len);
    try std.testing.expect(context.received_socket_origin);
}

test "host failures map to Zig errors" {
    resetNativeTestHost();
    configureNativeTestHost(42, 9);
    setNativeTestError(@intFromEnum(AbiError.unsafe_path));

    const scope = Scope.fromHandle(42);
    try std.testing.expectError(Error.UnsafePath, scope.setJson("unsafe", "true"));
    try std.testing.expectEqual(AbiError.unsafe_path, lastError());
    clearError();
    try std.testing.expectEqual(AbiError.none, lastError());
}

test "abi version matches the shared boundary" {
    try std.testing.expectEqual(@as(u32, 3), ng_abi_version());
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
var last_update: Update = .{
    .scope_handle = 0,
    .path = "",
    .value_json = "",
    .deleted = false,
};
var last_update_path: [64]u8 = undefined;
var last_update_value: [64]u8 = undefined;

fn rememberBind(scope_handle: ScopeHandle, name_value: []const u8) void {
    last_bind_handle = scope_handle;
    last_bind_name = name_value;
}

fn rememberUpdate(update: Update) void {
    const path_len = @min(update.path.len, last_update_path.len);
    const value_len = @min(update.value_json.len, last_update_value.len);

    @memcpy(last_update_path[0..path_len], update.path[0..path_len]);
    @memcpy(last_update_value[0..value_len], update.value_json[0..value_len]);
    last_update = .{
        .scope_handle = update.scope_handle,
        .path = last_update_path[0..path_len],
        .value_json = last_update_value[0..value_len],
        .deleted = update.deleted,
    };
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

    const transaction = "{\"set\":{\"newTodo\":\"Review Zig\"},\"delete\":[\"draft\"]}";
    ng_scope_on_transaction(
        7,
        @intFromPtr(transaction.ptr),
        transaction.len,
    );

    try std.testing.expectEqual(@as(ScopeHandle, 7), last_update.scope_handle);
    try std.testing.expectEqualStrings("draft", last_update.path);
    try std.testing.expectEqualStrings("null", last_update.value_json);
    try std.testing.expect(last_update.deleted);
}
