.PHONY: all deps format format-check test generate-namespace generate-injection-tokens generate generate-check parity check example-build version-check package-check release-check publish demo clean

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
	$(NODE) ../../utils/generate-programmatic-view-tags.mjs --integration gleam

generate-check:
	$(NODE) tool/generate_ng_namespace.mjs --check
	$(NODE) tool/generate_injection_tokens.mjs --check
	$(NODE) ../../utils/generate-programmatic-view-tags.mjs --integration gleam --check

parity:
	$(MAKE) generate-check
	$(NODE) tool/check_ng_namespace_parity.mjs

check: format-check test parity

example-build:
	cd examples/basic_app && $(GLEAM) build

version-check:
	@test "$$(sed -n 's/^version = "\([^"]*\)"/\1/p' gleam.toml)" = "$$(node -p 'require("../../package.json").version')" || \
		(echo "Gleam package version must match package.json" >&2; exit 1)

package-check: version-check check
	$(GLEAM) docs build
	$(GLEAM) export hex-tarball

release-check: package-check example-build

publish: release-check
	$(GLEAM) publish --yes

demo: example-build
	@echo "Open http://localhost:4000/integrations/gleam/examples/basic_app/web/ after running make serve from the repository root."

clean:
	rm -rf build examples/basic_app/build
