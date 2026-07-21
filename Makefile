.PHONY: build build-ts release-build check test test-integrations test-types test-namespace-js test-wasm-browsers wasm-contracts-check namespace-surface-check public-type-docs-check internal-composition-check internal-composition-report types generated-check public-namespace-api update-public-namespace-api docs-examples-check docs-requirement doc coverage coverage-check coverage-update-baseline coverage-open setup ensure-deps ensure-docs-deps lint lint-check lint-fix format-check version-check release-notes-test release-notes-check prepare-release underscore-property-key-check wasm-parity scala-check vscode-build vscode-test vscode-smoke hugo

BUILD_DIR 	= ./dist
TS_BUILD_DIR = ./.build
MIN_JS      := dist/angular-ts.umd.min.js
GZ_JS  		:= $(MIN_JS).gz
CLOSURE_EXTERNS := integrations/closure/externs/angular.js
DIST_CLOSURE_EXTERNS := $(BUILD_DIR)/externs/angular.js


setup:
	@rm -rf ./node_modules/
	@npm ci
	@npx playwright install

ensure-deps:
	@if [ ! -d ./node_modules ]; then \
		echo "Installing dependencies..."; \
		npm ci; \
	fi

ensure-docs-deps:
	@if [ ! -d ./docs/node_modules ]; then \
		echo "Installing docs dependencies..."; \
		cd docs && npm ci; \
	fi

ensure-vscode-deps:
	@if [ ! -d ./tools/vscode/node_modules ]; then \
		echo "Installing VS Code extension dependencies..."; \
		cd tools/vscode && npm ci; \
	fi

build: ensure-deps
	@node integrations/closure/scripts/validate-externs.mjs
	@./node_modules/.bin/tsc --project tsconfig.build.json

build-ts: build

release-build: build
	@if [ -d "$(BUILD_DIR)" ]; then \
		echo "Removing $(BUILD_DIR)..."; \
		rm -r "$(BUILD_DIR)"; \
	fi
	@./node_modules/.bin/rollup -c
	@node utils/check-default-bundle-boundaries.mjs
	@mkdir -p "$(BUILD_DIR)/externs"
	@cp "$(CLOSURE_EXTERNS)" "$(DIST_CLOSURE_EXTERNS)"
	@node -e 'const fs=require("fs"); const pkg=JSON.parse(fs.readFileSync("package.json","utf8")); const file="$(DIST_CLOSURE_EXTERNS)"; fs.writeFileSync(file, fs.readFileSync(file,"utf8").replaceAll("[VI]{version}[/VI]", pkg.version));'
	@$(MAKE) gzip

size:
	@$(MAKE) release-build >/dev/null
	@echo "Minified build output:  $$(stat -c %s dist/angular-ts.umd.min.js) ~ $$(stat -c %s dist/angular-ts.umd.min.js | numfmt --to=iec)"
	@echo "Expected gzip:          $$(gzip -c dist/angular-ts.umd.min.js | wc -c) ~ $$(gzip -c dist/angular-ts.umd.min.js | wc -c | numfmt --to=iec)"
	@git checkout -q $(BUILD_DIR)
	@git checkout -q ./docs
	@echo "Current build output:   $$(stat -c %s dist/angular-ts.umd.min.js) ~ $$(stat -c %s dist/angular-ts.umd.min.js | numfmt --to=iec)"
	@echo "Current gzip:           $$(gzip -c dist/angular-ts.umd.min.js | wc -c) ~ $$(gzip -c dist/angular-ts.umd.min.js | wc -c | numfmt --to=iec)"

$(GZ_JS): $(MIN_JS)
	@gzip -9 -n -c $< > $@

gzip: $(GZ_JS)
	@echo "Created gzipped file: $(GZ_JS)"

size-html:
	@printf 'Bundle size: <b>%s</b> Gzip size: <b>%s</b>' \
		"$(shell stat -c %s dist/angular-ts.umd.min.js | numfmt --to=iec)" \
		"$(shell gzip -c dist/angular-ts.umd.min.js | wc -c | numfmt --to=iec)" \
	> docs/layouts/shortcodes/size-report.html

version:
	@node utils/version.cjs	

version-check:
	@node utils/version.cjs --check

format:
	@npx prettier ./src --write --cache --log-level=silent

format-check:
	@npx prettier ./src --check --cache --log-level=silent
	
lint:
	@$(MAKE) lint-check

lint-check: ensure-deps
	@npx eslint ./src --max-warnings=0

lint-fix: ensure-deps
	@npx eslint ./src --fix

vscode-build: ensure-vscode-deps
	@cd tools/vscode && npm run build

vscode-test: ensure-vscode-deps
	@cd tools/vscode && npm test

vscode-smoke: ensure-vscode-deps
	@cd tools/vscode && npm run test:smoke

underscore-property-key-check:
	@node ./utils/check-underscore-property-keys.mjs

internal-composition-check:
	@node ./utils/check-internal-composition.mjs

internal-composition-report:
	@node ./utils/check-internal-composition.mjs --json

check: ensure-deps
	@$(MAKE) lint-check
	@$(MAKE) release-notes-test
	@$(MAKE) underscore-property-key-check
	@$(MAKE) internal-composition-check
	@$(MAKE) generated-check
	@echo "Typechecking source"
	./node_modules/.bin/tsc 
	@$(MAKE) test-types
	@$(MAKE) test-namespace-js
	@$(MAKE) wasm-parity
	@$(MAKE) docs-examples-check

test-types: ensure-deps
	@echo "Typechecking tests"
	./node_modules/.bin/tsc --project tsconfig.test.json

test-namespace-js: types
	@echo "Typechecking JavaScript namespace consumer"
	./node_modules/.bin/tsc --project tsconfig.namespace-js.json
	@$(MAKE) namespace-surface-check

namespace-surface-check:
	@node ./utils/check-namespace-surface.mjs

docs-examples-check: ensure-deps
	@echo "Checking docs example API references"
	@node ./utils/check-docs-examples.mjs

public-type-docs-check:
	@node ./utils/check-public-type-docs.mjs

docs-requirement: generated-check docs-examples-check doc public-type-docs-check
	@echo "Documentation requirement artifacts refreshed."

release-notes-test:
	@node --test utils/extract-release-notes.test.mjs

release-notes-check: release-notes-test
	@node utils/extract-release-notes.mjs \
		"$$(node -p 'require("./package.json").version')" >/dev/null

include utils/benchmarks/benchmarks.mk

types: ensure-deps
	@echo "Generating *.d.ts"
	@rm -rf @types
	@./node_modules/.bin/tsc --project tsconfig.types.json
	@npx prettier ./@types --write --cache --log-level=silent

generated-check: types
	@$(MAKE) -f integrations/closure/Makefile generate-check
	@$(MAKE) -C integrations/dart generate-check
	@$(MAKE) -C integrations/gleam generate-check
	@$(MAKE) -C integrations/kotlin generate-check
	@$(MAKE) -C integrations/wasm/go generate-check

public-namespace-api: types
	@$(MAKE) -f integrations/closure/Makefile closure-generate

update-public-namespace-api: public-namespace-api

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

prepare-release: release-notes-check
	@$(MAKE) format-check
	@$(MAKE) check
	@$(MAKE) test
	@$(MAKE) docs-requirement
	@$(MAKE) release-build
	@$(MAKE) types
	@$(MAKE) version
	@$(MAKE) size-html

PLAYWRIGHT_TEST := npx playwright test

test: ensure-deps
	@echo $(INFO) "Playwright test JS"
	@$(PLAYWRIGHT_TEST) 
	@$(MAKE) test-integrations

test-integrations: ensure-deps
	@echo $(INFO) "Playwright integration tests"
	@$(MAKE) -f integrations/closure/Makefile closure-test
	@$(MAKE) -C integrations/kotlin check
	@$(MAKE) scala-check
	@$(MAKE) wasm-parity

wasm-parity: ensure-deps
	@$(MAKE) -C integrations/wasm/rust parity

scala-check: ensure-deps
	@$(MAKE) -C integrations/scala check

test-ui: ensure-deps
	@echo $(INFO) "Playwright test JS with ui"
	@$(PLAYWRIGHT_TEST) --ui

test-wasm-browsers: ensure-deps
	@$(PLAYWRIGHT_TEST) --config playwright.wasm.config.ts

wasm-contracts-check:
	@node --test integrations/wasm/tool/generate-contract.test.mjs
	@node integrations/wasm/tool/generate-contract.mjs \
		integrations/wasm/contracts/player.json \
		--out integrations/wasm/contracts/generated \
		--check

coverage: ensure-deps
	@echo $(INFO) "Playwright coverage"
	@node ./utils/run-coverage.mjs --check

coverage-check:
	@echo $(INFO) "Playwright coverage threshold check"
	@$(MAKE) coverage

coverage-update-baseline: ensure-deps
	@echo $(INFO) "Playwright coverage baseline update"
	@node ./utils/run-coverage.mjs --update-baseline

coverage-open: ensure-deps
	@echo $(INFO) "Open coverage report"
	@node ./utils/open-coverage.mjs

hugo: ensure-docs-deps
	cd docs && npm run _hugo-dev -- serve --disableFastRender --ignoreCache --noHTTPCache
