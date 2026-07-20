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

const TodoView = struct {
    task: []const u8,
    done: bool,
};

const Fields = struct {
    const items = angular.Field([]const TodoView).init("items");
    const remaining_count = angular.Field(usize).init("remainingCount");
    const new_todo = angular.Field([]const u8).init("newTodo");
};

const TodoApp = struct {
    scope: angular.Scope = angular.Scope.fromHandle(0),
    watch: angular.Watch = .{ .handle = 0 },
    items: [max_items]Todo = undefined,
    item_count: usize = 0,
    new_todo: [max_task]u8 = undefined,
    new_todo_len: usize = 0,

    fn bind(self: *TodoApp, scope_name: []const u8) !void {
        self.scope = try angular.Scope.resolve(scope_name);
        self.watch = try self.scope.observe(
            Fields.new_todo,
            self,
            &TodoApp.receiveNewTodo,
        );

        self.item_count = 2;
        self.items[0].setTask("Learn AngularTS");
        self.items[0].done = false;
        self.items[1].setTask("Build a Zig Wasm app");
        self.items[1].done = false;
        self.new_todo_len = 0;

        try self.publish();
    }

    fn unbind(self: *TodoApp) void {
        self.watch.deinit();
    }

    fn add(self: *TodoApp) !void {
        const title = self.newTodoText();
        if (title.len == 0 or self.item_count >= self.items.len) {
            return;
        }

        self.items[self.item_count].setTask(title);
        self.items[self.item_count].done = false;
        self.item_count += 1;
        self.new_todo_len = 0;
        try self.publish();
    }

    fn toggle(self: *TodoApp, index: usize) !void {
        if (index >= self.item_count) {
            return;
        }

        self.items[index].done = !self.items[index].done;
        try self.publish();
    }

    fn archiveCompleted(self: *TodoApp) !void {
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
        try self.publish();
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

    fn publish(self: *const TodoApp) !void {
        var items: [max_items]TodoView = undefined;
        var index: usize = 0;
        while (index < self.item_count) : (index += 1) {
            items[index] = .{
                .task = self.items[index].taskText(),
                .done = self.items[index].done,
            };
        }

        try self.scope.update(.{
            Fields.items.set(items[0..self.item_count]),
            Fields.remaining_count.set(self.remainingCount()),
            Fields.new_todo.set(self.newTodoText()),
        });
    }

    fn receiveNewTodo(self: *TodoApp, value: ?[]const u8) void {
        const title = value orelse "";
        const size = @min(title.len, self.new_todo.len);
        @memcpy(self.new_todo[0..size], title[0..size]);
        self.new_todo_len = size;
    }
};

var app = TodoApp{};

export fn todo_bind() u32 {
    app.bind("zigTodo:main") catch return 0;
    return 1;
}

export fn todo_add() u32 {
    app.add() catch return 0;
    return 1;
}

export fn todo_toggle(index: usize) u32 {
    app.toggle(index) catch return 0;
    return 1;
}

export fn todo_archive_completed() u32 {
    app.archiveCompleted() catch return 0;
    return 1;
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
    angular.testing.resetHost();
    angular.testing.configureHost(12, 24);
    try std.testing.expectEqual(@as(u32, 1), todo_bind());
    try std.testing.expectEqual(@as(usize, 2), todo_item_count());
    try std.testing.expectEqual(@as(usize, 2), todo_remaining_count());

    const transaction = "{\"set\":{\"newTodo\":\"Review Zig bridge\"}}";
    angular.ng_scope_on_transaction(
        12,
        @intFromPtr(transaction.ptr),
        transaction.len,
    );
    try std.testing.expectEqualStrings("Review Zig bridge", app.newTodoText());

    try std.testing.expectEqual(@as(u32, 1), todo_add());
    try std.testing.expectEqual(@as(usize, 3), todo_item_count());
    try std.testing.expectEqual(@as(usize, 3), todo_remaining_count());
    try std.testing.expectEqual(@as(usize, 0), todo_new_todo_len());

    try std.testing.expectEqual(@as(u32, 1), todo_toggle(0));
    try std.testing.expect(todo_done(0));
    try std.testing.expectEqual(@as(usize, 2), todo_remaining_count());

    try std.testing.expectEqual(@as(u32, 1), todo_archive_completed());
    try std.testing.expectEqual(@as(usize, 2), todo_item_count());
    try std.testing.expectEqual(@as(usize, 2), todo_remaining_count());
    try std.testing.expectEqualStrings("Build a Zig Wasm app", app.taskText(0));

    todo_unbind();
}
