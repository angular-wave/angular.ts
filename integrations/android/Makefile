.PHONY: check quality-check quality-baseline-check quality-suppression-check format format-check version-check generate-native-elements generate-native-capabilities generate-check package-check maven-consumer-check reproducibility-check signing-check release-check connected-check benchmark-emulator-smoke-check physical-device-check physical-benchmark-check physical-check sample-social-run ci-check publish clean

GRADLEW := ./gradlew
ROOT_VERSION := $(shell node -p 'require("../../package.json").version')
ANDROID_PACKAGE_TASKS := $(shell node scripts/android-artifacts.mjs package-task)
ANDROID_POM_TASKS := $(shell node scripts/android-artifacts.mjs pom-task)
STAGING_REPOSITORY := $(CURDIR)/.gradle/staging-repository

version-check:
	@test "$$($(GRADLEW) -q printVersion)" = "$(ROOT_VERSION)" || \
		(echo "Android package version must match package.json" >&2; exit 1)

generate-native-elements:
	node scripts/generate-native-elements.mjs

generate-native-capabilities:
	node scripts/generate-native-capabilities.mjs

generate-check:
	node scripts/android-artifacts.mjs artifact >/dev/null
	node --test scripts/android-artifacts.test.mjs
	node --test scripts/pom-contract.test.mjs
	node --test scripts/native-capabilities-schema.test.mjs
	node --test scripts/native-capabilities-parity.test.mjs
	node --test scripts/native-elements-schema.test.mjs
	node --test scripts/native-elements-parity.test.mjs
	node --test scripts/native-protocol-schema.test.mjs
	node --test scripts/roadmap-gates.test.mjs
	node --test scripts/physical-device-check.test.mjs
	node --test scripts/benchmark-results.test.mjs
	node --test scripts/verify-physical-release-evidence.test.mjs
	node --test scripts/reproducibility-check.test.mjs
	node --test scripts/release-workflow.test.mjs
	node --test sample-social-server/model.test.mjs sample-social-server/server.test.mjs
	node scripts/generate-native-elements.mjs --check
	node scripts/generate-native-capabilities.mjs --check

format:
	$(GRADLEW) spotlessApply

format-check:
	$(GRADLEW) spotlessCheck

quality-baseline-check:
	@baselines="$$(find . -path '*/build' -prune -o -type f -iname '*baseline*.xml' -print)"; \
		test -z "$$baselines" || \
		(echo "Android quality baselines are forbidden:" >&2; echo "$$baselines" >&2; exit 1)

quality-suppression-check:
	node --test scripts/kotlin-suppressions.test.mjs

quality-check: format-check quality-baseline-check quality-suppression-check
	$(GRADLEW) detekt --continue

check: version-check generate-check quality-check
	$(GRADLEW) \
	core:lint \
	browser:lint \
	credentials:lint \
	custom-elements-sample:lint \
	maps:lint \
	media:lint \
	paging:lint \
	navigation-fragments:lint \
	demo:lint \
	sample-social:lint \
	core:test \
	browser:test \
	credentials:test \
	maps:test \
	media:test \
	paging:test \
	native-elements-compiler:test \
	custom-elements-sample:test \
	navigation-fragments:test \
	demo:test \
	sample-social:test

package-check: check
	$(GRADLEW) $(ANDROID_PACKAGE_TASKS) demo:assembleDebug sample-social:assembleDebug benchmark:assembleBenchmark $(ANDROID_POM_TASKS)
	node scripts/package-check.mjs

maven-consumer-check: package-check
	node -e 'require("node:fs").rmSync(process.argv[1], { recursive: true, force: true })' "$(STAGING_REPOSITORY)"
	$(GRADLEW) -PangularTsStagingRepository="$(STAGING_REPOSITORY)" publishAllPublicationsToAngularTsStagingRepository
	$(GRADLEW) -p maven-consumer -PangularTsVersion=$(ROOT_VERSION) -PangularTsRepository="$(STAGING_REPOSITORY)" --refresh-dependencies clean assembleDebug assembleRelease testDebugUnitTest lint

reproducibility-check: maven-consumer-check
	@manifest="$(CURDIR)/.gradle/android-publication-digests.json"; \
		trap 'rm -f "$$manifest"' EXIT; \
		$(GRADLEW) -PangularTsStagingRepository="$(STAGING_REPOSITORY)" publishAllPublicationsToAngularTsStagingRepository --rerun-tasks; \
		node scripts/reproducibility-check.mjs record "$$manifest" "$(STAGING_REPOSITORY)"; \
		$(GRADLEW) -PangularTsStagingRepository="$(STAGING_REPOSITORY)" publishAllPublicationsToAngularTsStagingRepository --rerun-tasks; \
		node scripts/reproducibility-check.mjs verify "$$manifest" "$(STAGING_REPOSITORY)"

signing-check:
	./scripts/signing-check.sh

release-check: reproducibility-check signing-check

connected-check:
	$(MAKE) -C ../.. release-build
	./scripts/with-sample-social-server.sh $(GRADLEW) navigation-fragments:connectedCheck browser:connectedCheck credentials:connectedCheck maps:connectedCheck media:connectedCheck custom-elements-sample:connectedCheck demo:connectedCheck sample-social:connectedCheck

sample-social-run:
	$(MAKE) -C ../.. release-build
	./scripts/run-sample-social.sh

benchmark-emulator-smoke-check:
	$(GRADLEW) benchmark:connectedBenchmarkAndroidTest -Pandroid.testInstrumentationRunnerArguments.androidx.benchmark.suppressErrors=EMULATOR
	node scripts/benchmark-results.mjs --smoke

physical-device-check:
	./scripts/physical-device-check.sh

physical-benchmark-check: physical-device-check
	$(GRADLEW) benchmark:connectedBenchmarkAndroidTest
	node scripts/benchmark-results.mjs --physical

physical-check: physical-device-check
	$(MAKE) connected-check
	$(MAKE) physical-benchmark-check

ci-check: release-check connected-check

publish: release-check
	$(GRADLEW) publishAndReleaseToMavenCentral --no-configuration-cache

clean:
	$(GRADLEW) clean
