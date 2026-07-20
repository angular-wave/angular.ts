.PHONY: check test fmt wasm-check example-check example-test wasm-build js-check browser-test clean

ZIG ?= $(shell if [ -x /snap/zig/current/zig ]; then printf '/snap/zig/current/zig'; elif command -v zig >/dev/null 2>&1; then command -v zig; else printf zig; fi)
ZIG_LIB_DIR ?= $(shell if [ -d /snap/zig/current/lib ]; then printf '/snap/zig/current/lib'; fi)
ZIG_GLOBAL_CACHE_DIR ?= /tmp/angular-ts-zig-global-cache
ZIG_LOCAL_CACHE_DIR ?= /tmp/angular-ts-zig-local-cache
NODE ?= node
PLAYWRIGHT ?= ../../../node_modules/.bin/playwright

export ZIG_LIB_DIR
export ZIG_GLOBAL_CACHE_DIR
export ZIG_LOCAL_CACHE_DIR

check: fmt test wasm-check example-check example-test js-check

fmt:
	$(ZIG) fmt build.zig src/angular_ts.zig tests/generated_contract.zig examples/todo/main.zig

test:
	$(ZIG) build test

wasm-check:
	$(ZIG) build wasm-check

example-check:
	$(ZIG) build example-check

example-test:
	$(ZIG) build example-test

wasm-build:
	$(ZIG) build-exe -target wasm32-freestanding -fno-entry -rdynamic \
		-femit-bin=examples/todo/main.wasm \
		--dep angular-ts \
		-Mroot=examples/todo/main.zig \
		-Mangular-ts=src/angular_ts.zig

js-check:
	$(NODE) --check examples/todo/bootstrap.js

browser-test: wasm-build
	$(PLAYWRIGHT) test --config playwright.config.ts

clean:
	rm -f examples/todo/main.wasm
