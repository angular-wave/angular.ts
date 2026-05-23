.PHONY: all deps format format-check test root-types generate generate-check parity check runtime-build example-build runtime-test release-check publish-local demo clean

GRADLE ?= ./gradlew
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

root-types:
	$(MAKE) -C ../.. types

generate: root-types
	$(NODE) tool/generate_kotlin_bindings.mjs
	$(GRADLE) formatKotlin

generate-check: root-types
	$(NODE) tool/check_generated_bindings.mjs

parity: root-types
	$(NODE) tool/check_ng_namespace_parity.mjs
	$(NODE) tool/check_ng_namespace_members.mjs

runtime-build:
	$(MAKE) -C ../.. build

example-build:
	$(GRADLE) :examples:basic_app:jsBrowserProductionWebpack
	$(GRADLE) :examples:web_components:jsBrowserProductionWebpack

runtime-test: runtime-build example-build
	$(PLAYWRIGHT) test --config playwright.config.ts

check: generate-check format-check test parity runtime-test

release-check: check
	$(MAKE) -C ../dart check
	$(MAKE) -C ../.. build

publish-local:
	$(GRADLE) publishToMavenLocal

demo:
	$(GRADLE) :examples:basic_app:jsBrowserDevelopmentRun

clean:
	$(GRADLE) clean
	rm -rf .gradle build kotlin-js-store playwright-report test-results
	rm -rf examples/basic_app/build examples/web_components/build
