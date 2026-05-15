.PHONY: all deps format format-check test generate-namespace generate-injection-tokens generate parity check example-build demo clean

GLEAM ?= gleam
NODE ?= node

all: check

deps:
	$(GLEAM) deps download

format:
	$(GLEAM) format src test

format-check:
	$(GLEAM) format --check src test

test: deps
	$(GLEAM) test

generate-namespace:
	$(NODE) tool/generate_ng_namespace.mjs

generate-injection-tokens:
	$(NODE) tool/generate_injection_tokens.mjs

generate: generate-namespace generate-injection-tokens

parity:
	$(NODE) tool/generate_ng_namespace.mjs --check
	$(NODE) tool/generate_injection_tokens.mjs --check
	$(NODE) tool/check_ng_namespace_parity.mjs

check: format-check test parity

example-build:
	cd examples/basic_app && $(GLEAM) build

demo: example-build
	@echo "Open http://localhost:4000/integrations/gleam/examples/basic_app/web/ after running make serve from the repository root."

clean:
	rm -rf build examples/basic_app/build
