SHELL := /usr/bin/env bash

.PHONY: bootstrap openharmony-bootstrap openharmony-audit openharmony-build toolchain-check generate generate-check contract-check artifact-check core-test script-test sample-check coverage-check bridge-test protocol-parity security-check node-test layout-test accessibility-test typecheck package-check proof-assets-check stage-proof-assets format-check lint compile proof compatibility-check parity-check check clean-consumer release-check publication-check device-evidence-check publish verify-published publish-release clean

bootstrap:
	./scripts/bootstrap-sdk.sh

openharmony-bootstrap:
	./scripts/bootstrap-openharmony-sdk.sh

openharmony-audit: openharmony-bootstrap
	node scripts/run-openharmony-arkts-audit.mjs

openharmony-build: generate-check proof-assets-check
	node scripts/build-openharmony-hap.mjs

toolchain-check:
	node scripts/check-toolchain.mjs

generate:
	node scripts/generate-native-contracts.mjs
	node scripts/generate-workspace.mjs
	node scripts/generate-package-docs.mjs
	node scripts/generate-samples.mjs

generate-check:
	node scripts/generate-native-contracts.mjs --check
	node scripts/generate-workspace.mjs --check
	node scripts/generate-package-docs.mjs --check
	node scripts/generate-samples.mjs --check

contract-check: artifact-check generate-check typecheck core-test package-check format-check compatibility-check

artifact-check:
	node scripts/check-artifacts.mjs

core-test bridge-test protocol-parity security-check node-test layout-test accessibility-test:
	node --test $$(find packages -path '*/src/test/*.test.mjs' -type f | sort)
	node --test scripts/*.test.mjs

script-test:
	node --test scripts/*.test.mjs

sample-check: generate-check script-test proof-assets-check
	$(MAKE) -C samples/kitchen-sink check
	$(MAKE) -C samples/pulse check
	node --test ../native/samples/pulse/model.test.mjs ../native/samples/pulse/server.test.mjs

coverage-check:
	node --experimental-test-coverage --test --test-isolation=none \
		--test-coverage-lines=100 --test-coverage-branches=100 --test-coverage-functions=100 \
		$$(find packages samples -path '*/src/test/*.test.mjs' -type f | sort)

package-check: artifact-check generate-check
	node scripts/check-packages.mjs

proof-assets-check:
	node scripts/check-proof-assets.mjs

stage-proof-assets: proof-assets-check
	rm -rf entry/src/main/resources/rawfile/dist
	mkdir -p entry/src/main/resources/rawfile/dist
	cp -R ../../dist/. entry/src/main/resources/rawfile/dist/

typecheck:
	../../node_modules/.bin/tsc --project tsconfig.json

format-check:
	node scripts/check-format.mjs

lint: toolchain-check
	codelinter --check .

compile: toolchain-check generate-check stage-proof-assets
	@trap 'rm -rf entry/src/main/resources/rawfile/dist' EXIT; \
		ohpm install --all && \
		hvigorw --mode project -p product=default -p buildMode=release assembleHar assembleHap && \
		$(MAKE) -C samples/kitchen-sink compile && \
		$(MAKE) -C samples/pulse compile

proof: compile

compatibility-check:
	node ../native/scripts/check-platform-matrix.mjs --require-implemented=harmonyos

parity-check:
	node ../native/scripts/check-platform-matrix.mjs --require-implemented=harmonyos

clean-consumer: compile
	node scripts/check-clean-consumer.mjs

check: artifact-check typecheck coverage-check package-check format-check compatibility-check sample-check

release-check: check lint compile clean-consumer

publication-check: release-check parity-check device-evidence-check

publish: toolchain-check
	@if [[ -z "$$HARMONY_OHPM_ARTIFACT_DIR" ]]; then $(MAKE) compile; fi
	node scripts/harmony-release.mjs publish

verify-published: toolchain-check
	node scripts/harmony-release.mjs verify

publish-release: publication-check publish

device-evidence-check:
	node scripts/verify-device-release-evidence.mjs

clean:
	rm -rf entry/src/main/resources/rawfile/dist
	$(MAKE) -C samples/kitchen-sink clean
	$(MAKE) -C samples/pulse clean
