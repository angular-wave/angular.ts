.PHONY: check fmt test typecheck wasm-build js-check browser-test clean

CXX ?= c++
CXXFLAGS ?= -std=c++17 -Wall -Wextra -Werror -Iinclude
ZIG ?= $(shell if [ -x /snap/zig/current/zig ]; then printf '/snap/zig/current/zig'; elif command -v zig >/dev/null 2>&1; then command -v zig; else printf zig; fi)
ZIG_LIB_DIR ?= $(shell if [ -d /snap/zig/current/lib ]; then printf '/snap/zig/current/lib'; fi)
ZIG_GLOBAL_CACHE_DIR ?= /tmp/angular-ts-zig-global-cache
ZIG_LOCAL_CACHE_DIR ?= /tmp/angular-ts-zig-local-cache
NODE ?= node
PLAYWRIGHT ?= ../../../node_modules/.bin/playwright
BUILD_DIR ?= build

export ZIG_LIB_DIR
export ZIG_GLOBAL_CACHE_DIR
export ZIG_LOCAL_CACHE_DIR

check: fmt test example typecheck js-check

fmt:
	@if command -v clang-format >/dev/null 2>&1; then \
		clang-format -i include/angular_ts/wasm.hpp tests/wasm_test.cpp; \
	else \
		echo "clang-format not available; C++ sources are manually formatted"; \
	fi

test: $(BUILD_DIR)/wasm_test
	./$(BUILD_DIR)/wasm_test

typecheck:
	$(CXX) $(CXXFLAGS) -fsyntax-only tests/wasm_test.cpp
	$(CXX) $(CXXFLAGS) -fsyntax-only examples/todo/main.cpp

wasm-build:
	$(ZIG) c++ -target wasm32-wasi -D__wasm__ -Iinclude \
		-fno-exceptions -fno-rtti \
		-Wl,--no-entry \
		-Wl,--export=ng_abi_alloc \
		-Wl,--export=ng_abi_free \
		-Wl,--export=ng_scope_on_bind \
		-Wl,--export=ng_scope_on_unbind \
		-Wl,--export=ng_scope_on_update \
		-Wl,--export=todo_bind \
		-Wl,--export=todo_add \
		-Wl,--export=todo_toggle \
		-Wl,--export=todo_archive_completed \
		-Wl,--export=todo_unbind \
		-o examples/todo/main.wasm \
		examples/todo/main.cpp

js-check:
	$(NODE) --check examples/todo/bootstrap.js

browser-test: wasm-build
	$(PLAYWRIGHT) test --config playwright.config.ts

example: $(BUILD_DIR)/todo_example
	./$(BUILD_DIR)/todo_example

$(BUILD_DIR)/wasm_test: tests/wasm_test.cpp include/angular_ts/wasm.hpp
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) tests/wasm_test.cpp -o $@

$(BUILD_DIR)/todo_example: examples/todo/main.cpp include/angular_ts/wasm.hpp
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) examples/todo/main.cpp -o $@

clean:
	rm -rf $(BUILD_DIR)
	rm -f examples/todo/main.wasm
