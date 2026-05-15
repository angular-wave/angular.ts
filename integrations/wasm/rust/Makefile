.PHONY: all check test parity bridge-typecheck build-tool scope-bridge-build-tool example-check example-build wasm-check scope-bridge-check scope-bridge-build scope-bridge-wasm-check browser-test clean

CARGO ?= cargo
NODE ?= node
PLAYWRIGHT ?= ../../../node_modules/.bin/playwright
TSC ?= ../../../node_modules/.bin/tsc

all: check

check: parity bridge-typecheck
	$(CARGO) check --workspace

test: parity bridge-typecheck
	$(CARGO) test --workspace

parity:
	$(NODE) tool/check-ng-namespace-parity.mjs

bridge-typecheck:
	$(TSC) --project tsconfig.typecheck.json

build-tool:
	$(CARGO) run -p angular-ts-build -- build --manifest examples/basic_app/angular-ts.json --out examples/basic_app/.angular-ts/bootstrap.js

scope-bridge-build-tool:
	$(CARGO) run -p angular-ts-build -- build --manifest examples/scope_bridge/angular-ts.json --out examples/scope_bridge/.angular-ts/bootstrap.js

example-check:
	$(CARGO) check -p angular-ts-rust-basic-app

scope-bridge-check:
	$(CARGO) check -p angular-ts-rust-scope-bridge

wasm-check:
	$(CARGO) check -p angular-ts-rust-basic-app --target wasm32-unknown-unknown

scope-bridge-wasm-check:
	$(CARGO) check -p angular-ts-rust-scope-bridge --target wasm32-unknown-unknown

example-build: wasm-check
	$(CARGO) build -p angular-ts-rust-basic-app --target wasm32-unknown-unknown
	wasm-bindgen target/wasm32-unknown-unknown/debug/angular_ts_rust_basic_app.wasm --target web --out-dir examples/basic_app/pkg
	$(MAKE) build-tool

scope-bridge-build: scope-bridge-wasm-check
	$(CARGO) build -p angular-ts-rust-scope-bridge --target wasm32-unknown-unknown
	wasm-bindgen target/wasm32-unknown-unknown/debug/angular_ts_rust_scope_bridge.wasm --target web --out-dir examples/scope_bridge/pkg
	$(MAKE) scope-bridge-build-tool

browser-test: example-build scope-bridge-build
	$(PLAYWRIGHT) test --config playwright.config.ts

clean:
	$(CARGO) clean
	rm -rf .angular-ts pkg dist examples/basic_app/.angular-ts examples/basic_app/pkg examples/scope_bridge/.angular-ts examples/scope_bridge/pkg
