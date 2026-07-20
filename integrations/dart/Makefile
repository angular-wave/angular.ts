.PHONY: all deps analyze test parity generated-base-check manual-overrides-check generate generate-check format format-check check runtime-build runtime-test example-deps example-build demo clean

DART ?= dart
PLAYWRIGHT ?= ../../node_modules/.bin/playwright
EXAMPLE_DIR := example/basic_app
EXAMPLE_OUT := $(EXAMPLE_DIR)/web/main.dart.js

all: check

deps:
	$(DART) pub get

analyze: deps
	$(DART) analyze

test: deps
	$(DART) test -p chrome

parity: deps
	$(DART) run tool/check_ng_namespace_parity.dart
	node tool/check_ng_namespace_members.mjs
	node tool/check_manual_overrides.mjs
	node tool/check_override_coverage.mjs

generated-base-check:
	node tool/check_generated_base_usage.mjs

manual-overrides-check:
	node tool/check_manual_overrides.mjs

generate:
	node tool/generate_dart_bindings.mjs
	$(DART) format lib/src/generated/ng_facades.dart

generate-check:
	node tool/check_generated_bindings.mjs

format:
	$(DART) format lib test example tool

format-check: deps
	$(DART) format --set-exit-if-changed lib test example tool

check: generate-check format-check analyze test parity generated-base-check runtime-test

runtime-build:
	$(MAKE) -C ../.. release-build

runtime-test: runtime-build example-build
	$(PLAYWRIGHT) test --config playwright.config.ts

example-deps:
	cd $(EXAMPLE_DIR) && $(DART) pub get

example-build: example-deps
	cd $(EXAMPLE_DIR) && $(DART) compile js lib/main.dart -o web/main.dart.js

demo: runtime-build example-build
	@echo "Open http://localhost:4000/integrations/dart/example/basic_app/ after running make serve from the repository root."

clean:
	rm -f $(EXAMPLE_OUT) $(EXAMPLE_OUT).deps $(EXAMPLE_OUT).map
