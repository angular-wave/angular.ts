.PHONY: check fmt test typecheck wasm-build js-check browser-test clean

CC ?= cc
CFLAGS ?= -std=c11 -Wall -Wextra -Werror -Iinclude -I../contracts/generated
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
		clang-format -i include/angular_ts_wasm.h src/angular_ts_wasm.c tests/wasm_test.c; \
	else \
		echo "clang-format not available; C sources are manually formatted"; \
	fi

test: $(BUILD_DIR)/wasm_test
	./$(BUILD_DIR)/wasm_test

typecheck:
	$(CC) $(CFLAGS) -fsyntax-only src/angular_ts_wasm.c tests/wasm_test.c
	$(CC) $(CFLAGS) -fsyntax-only src/angular_ts_wasm.c examples/todo/main.c

wasm-build:
	$(ZIG) cc -target wasm32-freestanding -D__wasm__ -Iinclude -nostdlib \
		-fno-sanitize=undefined \
		-Wl,--no-entry \
		-Wl,--export=ng_abi_version \
		-Wl,--export=ng_abi_alloc \
		-Wl,--export=ng_abi_free \
		-Wl,--export=ng_scope_on_bind \
		-Wl,--export=ng_scope_on_unbind \
		-Wl,--export=ng_scope_on_transaction \
		-Wl,--export=todo_bind \
		-Wl,--export=todo_add \
		-Wl,--export=todo_toggle \
		-Wl,--export=todo_archive_completed \
		-Wl,--export=todo_unbind \
		-o examples/todo/main.wasm \
		src/angular_ts_wasm.c examples/todo/main.c

js-check:
	$(NODE) --check examples/todo/bootstrap.js

browser-test: wasm-build
	$(PLAYWRIGHT) test --config playwright.config.ts

example: $(BUILD_DIR)/todo_example
	./$(BUILD_DIR)/todo_example

$(BUILD_DIR)/wasm_test: src/angular_ts_wasm.c tests/wasm_test.c include/angular_ts_wasm.h ../contracts/generated/player_contract.h
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) src/angular_ts_wasm.c tests/wasm_test.c -o $@

$(BUILD_DIR)/todo_example: src/angular_ts_wasm.c examples/todo/main.c include/angular_ts_wasm.h
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) src/angular_ts_wasm.c examples/todo/main.c -o $@

clean:
	rm -rf $(BUILD_DIR)
	rm -f examples/todo/main.wasm
