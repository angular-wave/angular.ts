.PHONY: all deps format format-check test generate generate-check parity check runtime-build example-build runtime-test demo clean

GRADLE ?= gradle
NODE ?= node
PLAYWRIGHT ?= ../../node_modules/.bin/playwright

all: check

deps:
	$(GRADLE) kotlinNpmInstall

format:
	$(GRADLE) formatKotlin

format-check:
	$(GRADLE) checkKotlinFormat

test: deps
	$(GRADLE) jsBrowserTest

generate:
	$(NODE) tool/generate_kotlin_bindings.mjs
	$(GRADLE) formatKotlin

generate-check:
	$(NODE) tool/check_generated_bindings.mjs

parity:
	$(NODE) tool/check_ng_namespace_parity.mjs
	$(NODE) tool/check_ng_namespace_members.mjs

runtime-build:
	$(MAKE) -C ../.. build

example-build:
	@echo "Kotlin examples start in Phase 7."

runtime-test:
	@echo "Kotlin runtime browser tests start in Phase 7."

check: generate-check format-check test parity runtime-test

demo:
	@echo "Kotlin demos start in Phase 7."

clean:
	$(GRADLE) clean
