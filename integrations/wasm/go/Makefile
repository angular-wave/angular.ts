.PHONY: check test generate example-build browser-test clean

GO ?= go
PLAYWRIGHT ?= ../../../node_modules/.bin/playwright

check: generate test
	GOOS=js GOARCH=wasm $(GO) build ./...

test:
	$(GO) test ./...

generate:
	$(GO) generate ./examples/basic_app

example-build:
	GOOS=js GOARCH=wasm $(GO) build -o examples/basic_app/main.wasm ./examples/basic_app
	cp "$$($(GO) env GOROOT)/misc/wasm/wasm_exec.js" examples/basic_app/wasm_exec.js

browser-test: example-build
	$(PLAYWRIGHT) test --config playwright.config.ts

clean:
	rm -f examples/basic_app/main.wasm examples/basic_app/wasm_exec.js
