.PHONY: build build-ts check test test-types types docs-examples-check benchmark-parse benchmark-compile benchmark-link coverage coverage-check coverage-update-baseline coverage-open setup ensure-deps emulator-list emulator emulator-native-demo

BUILD_DIR 	= ./dist	
TS_BUILD_DIR = ./.build
MIN_JS      := dist/angular-ts.umd.min.js
GZ_JS  		:= $(MIN_JS).gz
EMULATOR_FLAGS ?= -netdelay none -netspeed full
NATIVE_DEMO_URL ?= http://127.0.0.1:4000/src/services/native/native-demo.html
ANDROID_SDK_CANDIDATES := $(ANDROID_HOME) $(ANDROID_SDK_ROOT) $(HOME)/Android/Sdk $(HOME)/.android/sdk /opt/android-sdk /usr/lib/android-sdk
ANDROID_EMULATOR ?= $(or $(shell command -v emulator 2>/dev/null),$(firstword $(wildcard $(addsuffix /emulator/emulator,$(ANDROID_SDK_CANDIDATES)))))
ADB ?= $(or $(shell command -v adb 2>/dev/null),$(firstword $(wildcard $(addsuffix /platform-tools/adb,$(ANDROID_SDK_CANDIDATES)))))


setup:
	@rm -rf ./node_modules/
	@npm ci
	@npx playwright install

ensure-deps:
	@if [ ! -d ./node_modules ]; then \
		echo "Installing dependencies..."; \
		npm ci; \
	fi

build: ensure-deps
	@if [ -d "$(BUILD_DIR)" ]; then \
		echo "Removing $(BUILD_DIR)..."; \
		rm -r "$(BUILD_DIR)"; \
	fi
	@./node_modules/.bin/tsc --project tsconfig.build.json
	@./node_modules/.bin/rollup -c

build-ts: ensure-deps
	@./node_modules/.bin/tsc --project tsconfig.build.json

size:
	@$(MAKE) build >/dev/null
	@echo "Minified build output:  $$(stat -c %s dist/angular-ts.umd.min.js) ~ $$(stat -c %s dist/angular-ts.umd.min.js | numfmt --to=iec)"
	@echo "Expected gzip:          $$(gzip -c dist/angular-ts.umd.min.js | wc -c) ~ $$(gzip -c dist/angular-ts.umd.min.js | wc -c | numfmt --to=iec)"
	@git checkout -q $(BUILD_DIR)
	@git checkout -q ./docs
	@echo "Current build output:   $$(stat -c %s dist/angular-ts.umd.min.js) ~ $$(stat -c %s dist/angular-ts.umd.min.js | numfmt --to=iec)"
	@echo "Current gzip:           $$(gzip -c dist/angular-ts.umd.min.js | wc -c) ~ $$(gzip -c dist/angular-ts.umd.min.js | wc -c | numfmt --to=iec)"

$(GZ_JS): $(MIN_JS)
	@gzip -9 -c $< > $@

gzip: $(GZ_JS)
	@echo "Created gzipped file: $(GZ_JS)"

size-html:
	@printf 'Bundle size: <b>%s</b> Gzip size: <b>%s</b>' \
		"$(shell stat -c %s dist/angular-ts.umd.min.js | numfmt --to=iec)" \
		"$(shell gzip -c dist/angular-ts.umd.min.js | wc -c | numfmt --to=iec)" \
	> docs/layouts/shortcodes/size-report.html

version:
	@node utils/version.cjs	

format:
	@npx prettier ./ --write --cache --log-level=silent
	
lint:
	@npx eslint ./src --fix

check: ensure-deps
	@echo "Typechecking source"
	./node_modules/.bin/tsc 
	@$(MAKE) test-types
	@$(MAKE) docs-examples-check

test-types: ensure-deps
	@echo "Typechecking tests"
	./node_modules/.bin/tsc --project tsconfig.test.json

docs-examples-check: ensure-deps
	@echo "Checking docs example API references"
	@node ./utils/check-docs-examples.mjs

benchmark-parse: ensure-deps
	@node ./utils/run-parse-benchmark.mjs $(ARGS)

benchmark-compile: ensure-deps
	@node ./utils/run-compile-benchmark.mjs $(ARGS)

benchmark-link: ensure-deps
	@node ./utils/run-link-benchmark.mjs $(ARGS)

types: ensure-deps
	@echo "Generating *.d.ts"
	@rm -rf @types
	@./node_modules/.bin/tsc --project tsconfig.types.json
	@npx prettier ./@types --write --cache --log-level=silent

TYPEDOC_DIR = docs/static/typedoc
doc: ensure-deps
	@rm -rf $(TYPEDOC_DIR)
	@node_modules/.bin/typedoc
	@npx prettier ./typedoc --write
	@mv typedoc $(TYPEDOC_DIR)

serve: ensure-deps
	@node_modules/.bin/vite --config utils/vite.config.js & \
	(cd utils/server && go run .) & \
	wait

emulator-list:
	@emulator_bin="$(ANDROID_EMULATOR)"; \
	if [ -z "$$emulator_bin" ]; then \
		echo "Android emulator command not found. Install Android Studio or add the SDK emulator directory to PATH."; \
		exit 1; \
	fi; \
	"$$emulator_bin" -list-avds

emulator:
	@emulator_bin="$(ANDROID_EMULATOR)"; \
	if [ -z "$$emulator_bin" ]; then \
		echo "Android emulator command not found. Install Android Studio or add the SDK emulator directory to PATH."; \
		exit 1; \
	fi; \
	avd="$(AVD)"; \
	if [ -z "$$avd" ]; then \
		avd="$$("$$emulator_bin" -list-avds | head -n 1)"; \
	fi; \
	if [ -z "$$avd" ]; then \
		echo "No Android AVD found. Create one in Android Studio, or pass AVD=<name>."; \
		exit 1; \
	fi; \
	echo "Starting Android emulator: $$avd"; \
	exec "$$emulator_bin" -avd "$$avd" $(EMULATOR_FLAGS)

emulator-native-demo:
	@adb_bin="$(ADB)"; \
	if [ -z "$$adb_bin" ]; then \
		echo "adb command not found. Install Android platform-tools or add them to PATH."; \
		exit 1; \
	fi; \
	"$$adb_bin" wait-for-device; \
	"$$adb_bin" reverse tcp:4000 tcp:4000; \
	"$$adb_bin" reverse tcp:3000 tcp:3000; \
	"$$adb_bin" reverse tcp:4433 tcp:4433; \
	"$$adb_bin" shell am start -a android.intent.action.VIEW -d "$(NATIVE_DEMO_URL)"

prepare-release: build test check types doc format gzip version size-html

PLAYWRIGHT_TEST := npx playwright test

test: ensure-deps
	@echo $(INFO) "Playwright test JS"
	@$(PLAYWRIGHT_TEST) 

test-ui: ensure-deps
	@echo $(INFO) "Playwright test JS with ui"
	@$(PLAYWRIGHT_TEST) --ui

coverage: ensure-deps
	@echo $(INFO) "Playwright coverage"
	@node ./utils/run-coverage.mjs

coverage-check: ensure-deps
	@echo $(INFO) "Playwright coverage threshold check"
	@node ./utils/run-coverage.mjs --check

coverage-update-baseline: ensure-deps
	@echo $(INFO) "Playwright coverage baseline update"
	@node ./utils/run-coverage.mjs --update-baseline

coverage-open: ensure-deps
	@echo $(INFO) "Open coverage report"
	@node ./utils/open-coverage.mjs

hugo:
	cd docs && npm run _hugo-dev -- serve --disableFastRender --ignoreCache --noHTTPCache
