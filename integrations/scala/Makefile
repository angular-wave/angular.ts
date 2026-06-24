.PHONY: all root-types compile test scaladoc-check generate generate-check parity example-build runtime-build runtime-test check release-readiness package-local release-check publish-local clean

SBT ?= sbt
NODE ?= node

all: check

root-types:
	$(MAKE) -C ../.. types

compile:
	$(SBT) Test/compile

test:
	$(SBT) test

scaladoc-check:
	$(SBT) Compile/doc

example-build:
	$(SBT) basicApp/fastLinkJS

generate: root-types
	$(NODE) tool/generate_ng_namespace_parity.mjs

generate-check: root-types
	$(NODE) tool/generate_ng_namespace_parity.mjs --check

parity: generate-check
	$(NODE) tool/check_ng_namespace_parity.mjs

runtime-build:
	$(MAKE) -C ../.. build

runtime-test: runtime-build example-build
	../../node_modules/.bin/playwright test --config playwright.config.ts

check: parity compile test scaladoc-check runtime-test

release-readiness:
	$(NODE) tool/check_release_readiness.mjs

package-local:
	$(SBT) package

release-check: check release-readiness package-local

publish-local:
	$(SBT) publishLocal

clean:
	$(SBT) clean
	rm -rf target project/target project/project
