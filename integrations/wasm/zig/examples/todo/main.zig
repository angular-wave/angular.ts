const std = @import("std");
const angular = @import("angular-ts");

const max_items = 8;
const max_task = 64;

const Todo = struct {
    task: [max_task]u8 = undefined,
    task_len: usize = 0,
    done: bool = false,

    fn setTask(self: *Todo, value: []const u8) void {
        const size = @min(value.len, self.task.len);
        @memcpy(self.task[0..size], value[0..size]);
        self.task_len = size;
    }

    fn taskText(self: *const Todo) []const u8 {
        return self.task[0..self.task_len];
    }
};

const TodoApp = struct {
    scope: angular.Scope = angular.Scope.fromHandle(0),
    watch: angular.Watch = .{ .handle = 0 },
    items: [max_items]Todo = undefined,
    item_count: usize = 0,
    new_todo: [max_task]u8 = undefined,
    new_todo_len: usize = 0,

    fn bind(self: *TodoApp, scope_name: []const u8) void {
        self.scope = angular.Scope.named(scope_name);
        self.watch = self.scope.watch("newTodo");
        angular.setScopeUpdateCallback(&onScopeUpdate);

        self.item_count = 2;
        self.items[0].setTask("Learn AngularTS");
        self.items[0].done = false;
        self.items[1].setTask("Build a Zig Wasm app");
        self.items[1].done = false;
        self.new_todo_len = 0;

        self.sync();
    }

    fn unbind(self: *TodoApp) void {
        _ = self.watch.unwatch();
        angular.setScopeUpdateCallback(null);
    }

    fn add(self: *TodoApp, title: []const u8) void {
        if (title.len == 0 or self.item_count >= self.items.len) {
            return;
        }

        self.items[self.item_count].setTask(title);
        self.items[self.item_count].done = false;
        self.item_count += 1;
        self.new_todo_len = 0;
        self.sync();
    }

    fn toggle(self: *TodoApp, index: usize) void {
        if (index >= self.item_count) {
            return;
        }

        self.items[index].done = !self.items[index].done;
        self.sync();
    }

    fn archiveCompleted(self: *TodoApp) void {
        var write: usize = 0;
        var read: usize = 0;
        while (read < self.item_count) : (read += 1) {
            if (!self.items[read].done) {
                if (write != read) {
                    self.items[write] = self.items[read];
                }
                write += 1;
            }
        }

        self.item_count = write;
        self.sync();
    }

    fn remainingCount(self: *const TodoApp) usize {
        var count: usize = 0;
        var index: usize = 0;
        while (index < self.item_count) : (index += 1) {
            if (!self.items[index].done) {
                count += 1;
            }
        }
        return count;
    }

    fn done(self: *const TodoApp, index: usize) bool {
        return index < self.item_count and self.items[index].done;
    }

    fn taskText(self: *const TodoApp, index: usize) []const u8 {
        if (index >= self.item_count) {
            return "";
        }
        return self.items[index].taskText();
    }

    fn newTodoText(self: *const TodoApp) []const u8 {
        return self.new_todo[0..self.new_todo_len];
    }

    fn sync(self: *const TodoApp) void {
        var json: [1024]u8 = undefined;
        const items_json = self.itemsJson(&json) catch return;
        _ = self.scope.set("items", items_json);

        var number: [32]u8 = undefined;
        const remaining = std.fmt.bufPrint(&number, "{d}", .{self.remainingCount()}) catch return;
        _ = self.scope.set("remainingCount", remaining);

        const title_json = quoteJson(&json, self.new_todo[0..self.new_todo_len]) catch return;
        _ = self.scope.set("newTodo", title_json);

        _ = self.scope.sync();
    }

    fn itemsJson(self: *const TodoApp, buffer: []u8) ![]const u8 {
        var writer: std.Io.Writer = .fixed(buffer);

        try writer.writeAll("[");
        var index: usize = 0;
        while (index < self.item_count) : (index += 1) {
            if (index != 0) {
                try writer.writeAll(",");
            }
            try writer.writeAll("{\"task\":");
            try writeJsonString(&writer, self.items[index].taskText());
            try writer.writeAll(",\"done\":");
            try writer.writeAll(if (self.items[index].done) "true" else "false");
            try writer.writeAll("}");
        }
        try writer.writeAll("]");

        return writer.buffered();
    }
};

var app = TodoApp{};

fn onScopeUpdate(update: angular.WasmScopeUpdate) void {
    if (!std.mem.eql(u8, update.path, "newTodo")) {
        return;
    }

    const value = decodeFlatJsonString(update.value_json);
    const size = @min(value.len, app.new_todo.len);
    @memcpy(app.new_todo[0..size], value[0..size]);
    app.new_todo_len = size;
}

fn decodeFlatJsonString(value: []const u8) []const u8 {
    if (value.len >= 2 and value[0] == '"' and value[value.len - 1] == '"') {
        return value[1 .. value.len - 1];
    }
    return value;
}

fn quoteJson(buffer: []u8, value: []const u8) ![]const u8 {
    var writer: std.Io.Writer = .fixed(buffer);
    try writeJsonString(&writer, value);
    return writer.buffered();
}

fn writeJsonString(writer: *std.Io.Writer, value: []const u8) !void {
    try writer.writeAll("\"");
    for (value) |byte| {
        if (byte == '"' or byte == '\\') {
            try writer.writeByte('\\');
        }
        try writer.writeByte(byte);
    }
    try writer.writeAll("\"");
}

export fn todo_bind() void {
    app.bind("zigTodo:main");
}

export fn todo_add(title_ptr: [*]const u8, title_len: usize) void {
    app.add(title_ptr[0..title_len]);
}

export fn todo_toggle(index: usize) void {
    app.toggle(index);
}

export fn todo_archive_completed() void {
    app.archiveCompleted();
}

export fn todo_unbind() void {
    app.unbind();
}

export fn todo_item_count() usize {
    return app.item_count;
}

export fn todo_remaining_count() usize {
    return app.remainingCount();
}

export fn todo_done(index: usize) bool {
    return app.done(index);
}

export fn todo_task_ptr(index: usize) usize {
    return @intFromPtr(app.taskText(index).ptr);
}

export fn todo_task_len(index: usize) usize {
    return app.taskText(index).len;
}

export fn todo_new_todo_ptr() usize {
    return @intFromPtr(app.newTodoText().ptr);
}

export fn todo_new_todo_len() usize {
    return app.newTodoText().len;
}

test "todo workflow updates Zig-owned state" {
    todo_bind();
    try std.testing.expectEqual(@as(usize, 2), todo_item_count());
    try std.testing.expectEqual(@as(usize, 2), todo_remaining_count());

    const path_value = "newTodo";
    const json_value = "\"Review Zig bridge\"";
    angular.ng_scope_on_update(
        12,
        @intFromPtr(path_value.ptr),
        path_value.len,
        @intFromPtr(json_value.ptr),
        json_value.len,
    );
    try std.testing.expectEqualStrings("Review Zig bridge", app.newTodoText());

    const title = "Review Zig bridge";
    todo_add(title.ptr, title.len);
    try std.testing.expectEqual(@as(usize, 3), todo_item_count());
    try std.testing.expectEqual(@as(usize, 3), todo_remaining_count());
    try std.testing.expectEqual(@as(usize, 0), todo_new_todo_len());

    todo_toggle(0);
    try std.testing.expect(todo_done(0));
    try std.testing.expectEqual(@as(usize, 2), todo_remaining_count());

    todo_archive_completed();
    try std.testing.expectEqual(@as(usize, 2), todo_item_count());
    try std.testing.expectEqual(@as(usize, 2), todo_remaining_count());
    try std.testing.expectEqualStrings("Build a Zig Wasm app", app.taskText(0));

    todo_unbind();
}
