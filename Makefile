.PHONY: build build-ts release-build check test test-integrations test-types test-namespace-js test-wasm-browsers wasm-contracts-check namespace-surface-check public-type-docs-check assert-policy-check error-policy-check dollar-prefixed-api-check private-method-check internal-composition-check internal-composition-report types generated-check integrations-generated-check generated-check-closure generated-check-dart generated-check-gleam generated-check-kotlin generated-check-scala generated-check-wasm-contracts generated-check-wasm-go generated-check-wasm-rust generated-check-wasm-assemblyscript generated-check-wasm-c generated-check-wasm-cpp generated-check-wasm-csharp generated-check-wasm-zig public-namespace-api update-public-namespace-api docs-examples-check docs-runtime-api-check docs-type-links-check docs-snippets-check docs-learning-check docs-requirement doc coverage coverage-check coverage-update-baseline coverage-open setup ensure-deps ensure-docs-deps lint lint-check lint-fix format-check version-check release-notes-test release-notes-check prepare-release publish-release published-maven-check published-maven-check-test underscore-property-key-check wasm-parity scala-check vscode-build vscode-test vscode-smoke hugo

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

dollar-prefixed-api-check:
	@node ./utils/check-dollar-prefixed-api.mjs

private-method-check:
	@node ./utils/check-private-methods.mjs

assert-policy-check:
	@node ./utils/check-assert-policy.mjs

error-policy-check:
	@node ./utils/check-error-policy.mjs

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
	@$(MAKE) dollar-prefixed-api-check
	@$(MAKE) private-method-check
	@$(MAKE) assert-policy-check
	@$(MAKE) error-policy-check
	@echo "Typechecking source"
	./node_modules/.bin/tsc 
	@$(MAKE) test-types
	@$(MAKE) test-namespace-js
	@$(MAKE) wasm-parity
	@$(MAKE) docs-examples-check
	@$(MAKE) docs-runtime-api-check
	@$(MAKE) docs-type-links-check
	@$(MAKE) docs-snippets-check
	@$(MAKE) docs-snippet-tests-check
	@$(MAKE) docs-learning-check

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

docs-runtime-api-check: ensure-deps
	@echo "Checking documentation runtime/API alignment"
	@node ./utils/check-docs-runtime-api.mjs

docs-type-links-check:
	@echo "Checking documentation TypeDoc links"
	@node ./utils/check-docs-type-links.mjs

docs-snippets-check:
	@echo "Checking documentation snippet style"
	@node ./utils/check-docs-snippets.mjs

.PHONY: docs-snippet-tests-check
docs-snippet-tests-check:
	@echo "Checking documentation snippet test coverage"
	@node ./utils/check-docs-tested-snippets.mjs

docs-learning-check:
	@echo "Checking beginner documentation structure"
	@node ./utils/check-docs-learning.mjs

public-type-docs-check:
	@node ./utils/check-public-type-docs.mjs

docs-requirement: generated-check docs-examples-check docs-runtime-api-check docs-type-links-check docs-snippets-check docs-snippet-tests-check docs-learning-check doc public-type-docs-check
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

generated-check: integrations-generated-check

integrations-generated-check: types
	@$(MAKE) --keep-going --jobs=8 --output-sync=target \
		generated-check-closure \
		generated-check-dart \
		generated-check-gleam \
		generated-check-kotlin \
		generated-check-scala \
		generated-check-wasm-contracts \
		generated-check-wasm-go \
		generated-check-wasm-rust \
		generated-check-wasm-assemblyscript \
		generated-check-wasm-c \
		generated-check-wasm-cpp \
		generated-check-wasm-csharp \
		generated-check-wasm-zig

generated-check-closure:
	@$(MAKE) -f integrations/closure/Makefile generate-check

generated-check-dart:
	@$(MAKE) -C integrations/dart generate-check

generated-check-gleam:
	@$(MAKE) -C integrations/gleam generate-check

generated-check-kotlin:
	@$(MAKE) -C integrations/kotlin generate-check-local

generated-check-scala:
	@node integrations/scala/tool/generate_ng_namespace_parity.mjs --check
	@node integrations/scala/tool/check_ng_namespace_parity.mjs

generated-check-wasm-contracts:
	@$(MAKE) wasm-contracts-check

generated-check-wasm-go:
	@$(MAKE) -C integrations/wasm/go generate-check

generated-check-wasm-rust:
	@$(MAKE) -C integrations/wasm/rust generate-check

generated-check-wasm-assemblyscript:
	@$(MAKE) -C integrations/wasm/assemblyscript generate-check

generated-check-wasm-c:
	@$(MAKE) -C integrations/wasm/c generate-check

generated-check-wasm-cpp:
	@$(MAKE) -C integrations/wasm/cpp generate-check

generated-check-wasm-csharp:
	@$(MAKE) -C integrations/wasm/csharp generate-check

generated-check-wasm-zig:
	@$(MAKE) -C integrations/wasm/zig generate-check

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
	@$(MAKE) version
	@$(MAKE) release-build
	@$(MAKE) docs-requirement
	@$(MAKE) size-html

publish-release:
	@test -z "$$(git status --porcelain)" || \
		(echo "Refusing to release from a dirty worktree." >&2; exit 1)
	@git fetch origin master
	@test "$$(git rev-parse HEAD)" = "$$(git rev-parse origin/master)" || \
		(echo "Refusing to release: HEAD does not match origin/master." >&2; exit 1)
	@version="$$(node -p 'require("./package.json").version')"; \
		tag="v$$version"; \
		git tag -a "$$tag" -m "Version $$version" && \
		git show --no-patch "$$tag" && \
		git push origin "$$tag"

PUBLISHED_MAVEN_VERSION ?= $(shell node -p 'require("./package.json").version')
PUBLISHED_MAVEN_ARTIFACTS ?= java,clojurescript,scala

published-maven-check-test:
	@node --test tool/check-published-maven-artifacts.test.mjs

published-maven-check: published-maven-check-test
	@node tool/check-published-maven-artifacts.mjs \
		--version "$(PUBLISHED_MAVEN_VERSION)" \
		--artifacts "$(PUBLISHED_MAVEN_ARTIFACTS)"

check: published-maven-check-test

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

.PHONY: docs-public-surface-check
docs-public-surface-check:
	@echo "Checking public documentation surface parity"
	@node utils/check-docs-public-surface.mjs

check: docs-public-surface-check

.PHONY: docs-links-check docs-tutorial-typecheck
docs-links-check:
	@echo "Checking documentation links and fragments"
	@node utils/check-docs-links.mjs

docs-tutorial-typecheck:
	@echo "Typechecking executable documentation tutorial"
	@./node_modules/.bin/tsc --project docs/examples/task-board/tsconfig.json

check: docs-links-check docs-tutorial-typecheck
