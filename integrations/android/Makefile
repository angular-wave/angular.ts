.PHONY: check version-check package-check release-check publish clean

GRADLEW := ./gradlew
ROOT_VERSION := $(shell node -p 'require("../../package.json").version')

version-check:
	@test "$$($(GRADLEW) -q printVersion)" = "$(ROOT_VERSION)" || \
		(echo "Android package version must match package.json" >&2; exit 1)

check: version-check
	$(GRADLEW) \
		core:lint \
		navigation-fragments:lint \
		core:test \
		navigation-fragments:test

package-check: check
	$(GRADLEW) core:assembleRelease navigation-fragments:assembleRelease

release-check: package-check

publish: release-check
	$(GRADLEW) publishAndReleaseToMavenCentral --no-configuration-cache

clean:
	$(GRADLEW) clean
