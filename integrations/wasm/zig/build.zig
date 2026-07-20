const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const wasm_target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
    });

    const module = b.addModule("angular-ts", .{
        .root_source_file = b.path("src/angular_ts.zig"),
        .target = target,
        .optimize = optimize,
    });
    const wasm_module = b.addModule("angular-ts-wasm", .{
        .root_source_file = b.path("src/angular_ts.zig"),
        .target = wasm_target,
        .optimize = optimize,
    });

    const tests = b.addTest(.{
        .root_module = module,
    });

    const run_tests = b.addRunArtifact(tests);

    const player_contract = b.addModule("player-contract", .{
        .root_source_file = b.path("../contracts/generated/player_contract.zig"),
        .target = target,
        .optimize = optimize,
        .imports = &.{
            .{ .name = "angular-ts", .module = module },
        },
    });
    const contract_tests = b.addTest(.{
        .root_module = b.createModule(.{
            .root_source_file = b.path("tests/generated_contract.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{
                .{ .name = "angular-ts", .module = module },
                .{ .name = "player-contract", .module = player_contract },
            },
        }),
    });
    const run_contract_tests = b.addRunArtifact(contract_tests);

    const test_step = b.step("test", "Run Zig binding tests");
    test_step.dependOn(&run_tests.step);
    test_step.dependOn(&run_contract_tests.step);

    const wasm_object = b.addObject(.{
        .name = "angular_ts_wasm_zig",
        .root_module = wasm_module,
    });

    const wasm_check = b.step("wasm-check", "Typecheck the Zig binding for wasm32-freestanding");
    wasm_check.dependOn(&wasm_object.step);

    const todo_example = b.addObject(.{
        .name = "angular_ts_zig_todo_example",
        .root_module = b.createModule(.{
            .root_source_file = b.path("examples/todo/main.zig"),
            .target = wasm_target,
            .optimize = optimize,
            .imports = &.{
                .{ .name = "angular-ts", .module = wasm_module },
            },
        }),
    });

    const example_check = b.step("example-check", "Typecheck the Zig todo example for wasm32-freestanding");
    example_check.dependOn(&todo_example.step);

    const todo_tests = b.addTest(.{
        .root_module = b.createModule(.{
            .root_source_file = b.path("examples/todo/main.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{
                .{ .name = "angular-ts", .module = module },
            },
        }),
    });
    const run_todo_tests = b.addRunArtifact(todo_tests);

    const example_test = b.step("example-test", "Run Zig todo example tests");
    example_test.dependOn(&run_todo_tests.step);
}
