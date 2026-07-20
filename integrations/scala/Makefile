.PHONY: all root-types compile test scaladoc-check generate generate-check parity example-build runtime-build runtime-test check release-readiness package-local release-check publish-local clean

SBT ?= sbt
SBT_FLAGS ?= --batch --no-server
NODE ?= node

all: check

root-types:
	$(MAKE) -C ../.. types

compile:
	$(SBT) $(SBT_FLAGS) Test/compile

test:
	$(SBT) $(SBT_FLAGS) test

scaladoc-check:
	$(SBT) $(SBT_FLAGS) Compile/doc

example-build:
	$(SBT) $(SBT_FLAGS) basicApp/fastLinkJS

generate: root-types
	$(NODE) tool/generate_ng_namespace_parity.mjs

generate-check: root-types
	$(NODE) tool/generate_ng_namespace_parity.mjs --check

parity: generate-check
	$(NODE) tool/check_ng_namespace_parity.mjs

runtime-build:
	$(MAKE) -C ../.. release-build

runtime-test: runtime-build example-build
	../../node_modules/.bin/playwright test --config playwright.config.ts

check: parity compile test scaladoc-check runtime-test

release-readiness:
	$(NODE) tool/check_release_readiness.mjs

package-local:
	$(SBT) $(SBT_FLAGS) package

release-check: check release-readiness package-local

publish-local:
	$(SBT) $(SBT_FLAGS) publishLocal

clean:
	$(SBT) $(SBT_FLAGS) clean
	rm -rf target project/target project/project
