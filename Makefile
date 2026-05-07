.PHONY: build build-ts test types coverage coverage-check coverage-update-baseline coverage-open setup ensure-deps

BUILD_DIR 	= ./dist	
TS_BUILD_DIR = ./.build
MIN_JS      := dist/angular-ts.umd.min.js
GZ_JS  		:= $(MIN_JS).gz


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
	@echo "Typechecking Js"
	./node_modules/.bin/tsc 

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
	hugo server --source=docs --disableFastRender
