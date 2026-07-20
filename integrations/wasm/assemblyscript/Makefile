.PHONY: check build facade-build wasm-build js-check browser-test clean

ASC ?= asc
OUT_DIR ?= /tmp/angular-ts-assemblyscript
NODE ?= node
PLAYWRIGHT ?= ../../../node_modules/.bin/playwright

check: build js-check

build: facade-build wasm-build

facade-build:
	@mkdir -p "$(OUT_DIR)"
	$(ASC) src/angular_ts.ts \
		--runtime incremental \
		--exportRuntime \
		--debug \
		--outFile "$(OUT_DIR)/angular_ts.wasm" \
		--textFile "$(OUT_DIR)/angular_ts.wat"
	@test -s "$(OUT_DIR)/angular_ts.wasm"

wasm-build:
	$(ASC) examples/todo/main.ts \
		--runtime incremental \
		--exportRuntime \
		--debug \
		--outFile examples/todo/main.wasm \
		--textFile "$(OUT_DIR)/todo.wat"
	@test -s examples/todo/main.wasm

js-check:
	$(NODE) --check examples/todo/bootstrap.js

browser-test: wasm-build
	$(PLAYWRIGHT) test --config playwright.config.ts

clean:
	rm -rf "$(OUT_DIR)"
	rm -f examples/todo/main.wasm
