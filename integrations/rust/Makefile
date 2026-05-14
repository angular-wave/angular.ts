.PHONY: all check test parity build-tool example-check example-build wasm-check browser-test clean

CARGO ?= cargo
NODE ?= node
PLAYWRIGHT ?= ../../node_modules/.bin/playwright

all: check

check: parity
	$(CARGO) check --workspace

test: parity
	$(CARGO) test --workspace

parity:
	$(NODE) tool/check-ng-namespace-parity.mjs

build-tool:
	$(CARGO) run -p angular-ts-build -- build --manifest examples/basic_app/angular-ts.json --out examples/basic_app/.angular-ts/bootstrap.js

example-check:
	$(CARGO) check -p angular-ts-rust-basic-app

wasm-check:
	$(CARGO) check -p angular-ts-rust-basic-app --target wasm32-unknown-unknown

example-build: wasm-check
	$(CARGO) build -p angular-ts-rust-basic-app --target wasm32-unknown-unknown
	wasm-bindgen target/wasm32-unknown-unknown/debug/angular_ts_rust_basic_app.wasm --target web --out-dir examples/basic_app/pkg
	$(MAKE) build-tool

browser-test: example-build
	$(PLAYWRIGHT) test --config playwright.config.ts

clean:
	$(CARGO) clean
	rm -rf .angular-ts pkg dist examples/basic_app/.angular-ts examples/basic_app/pkg
