.PHONY: check root-types test parity generate generate-check example-build browser-test clean

GO ?= go
PLAYWRIGHT ?= ../../../node_modules/.bin/playwright

check: parity generate test
	GOOS=js GOARCH=wasm $(GO) build ./...

root-types:
	$(MAKE) -C ../../../ types

test:
	$(GO) test ./...

parity: root-types
	node tool/check-ng-namespace-parity.mjs

generate:
	$(GO) generate ./examples/basic_app

generate-check:
	@before="$$(mktemp)"; \
	trap 'rm -f "$$before"' EXIT; \
	sha256sum \
		examples/basic_app/.angular-ts/bootstrap.js \
		examples/basic_app/angular-ts.json \
		examples/basic_app/scope_sync_gen.go > "$$before"; \
	$(GO) generate ./examples/basic_app; \
	sha256sum \
		examples/basic_app/.angular-ts/bootstrap.js \
		examples/basic_app/angular-ts.json \
		examples/basic_app/scope_sync_gen.go | diff -u "$$before" -

example-build:
	GOOS=js GOARCH=wasm $(GO) build -o examples/basic_app/main.wasm ./examples/basic_app
	cp "$$($(GO) env GOROOT)/misc/wasm/wasm_exec.js" examples/basic_app/wasm_exec.js

browser-test: example-build
	$(PLAYWRIGHT) test --config playwright.config.ts

clean:
	rm -f examples/basic_app/main.wasm examples/basic_app/wasm_exec.js
