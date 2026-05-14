.PHONY: all deps analyze test parity format check runtime-build runtime-test example-deps example-build demo clean

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

format:
	$(DART) format lib test example tool

check: analyze test parity runtime-test

runtime-build:
	$(MAKE) -C ../.. build

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
