.PHONY: build test types

setup:
	@rm -r ./node_modules/
	@npm i
	@npx playwright install

BUILD_DIR = ./dist	
MIN_JS      := dist/angular-ts.umd.min.js
GZ_JS  := $(MIN_JS).gz
MIN_SIZE    := $(shell stat -c %s $(MIN_JS))
MIN_SIZE_H  := $(shell stat -c %s $(MIN_JS) | numfmt --to=iec)
GZIP_SIZE   := $(shell gzip -9 -c $(MIN_JS) | wc -c)
GZIP_SIZE_H := $(shell gzip -9 -c $(MIN_JS) | wc -c | numfmt --to=iec)

build:
	@if [ -d "$(BUILD_DIR)" ]; then \
		echo "Removing $(BUILD_DIR)..."; \
		rm -r "$(BUILD_DIR)"; \
	fi
	@npm i
	./node_modules/.bin/rollup -c

size:
	./node_modules/.bin/rollup -c --configName min --silent
	@echo "Expected bundle:  $(MIN_SIZE) ~ $(MIN_SIZE_H)"
	@echo "Expected gzip:    $(GZIP_SIZE) ~ $(GZIP_SIZE_H)"
	@git checkout -q $(BUILD_DIR)
	@git checkout -q ./docs
	@echo "Current bundle:    $(MIN_SIZE) ~ $(MIN_SIZE_H)"
	@echo "Current gzip:      $(GZIP_SIZE) ~ $(GZIP_SIZE_H)"

$(GZ_JS): $(MIN_JS)
	@gzip -9 -c $< > $@

gzip: $(GZ_JS)
	@echo "Created gzipped file: $(GZ_JS)"

size-html:
	@printf 'Bundle size: <b>%s</b> Gzip size: <b>%s</b>' "$(MIN_SIZE_H)" "$(GZIP_SIZE_H)" > docs/layouts/shortcodes/size-report.html

version:
	@node utils/version.cjs	

pretty:
	@npx prettier ./ --write --cache --log-level=silent
	
lint:
	@npx eslint ./src --fix

check:
	@echo "Typechecking Js"
	./node_modules/.bin/tsc 

types:
	@rm -rf @types
	@echo "Generating *.d.ts"
	@npx -p typescript tsc --project tsconfig.types.json
	$(MAKE) pretty

TYPEDOC_DIR = docs/static/typedoc
doc: 
	@rm -rf $(TYPEDOC_DIR)
	@node_modules/.bin/typedoc
	@npx prettier ./typedoc --write
	@mv typedoc $(TYPEDOC_DIR)

serve:
	@node_modules/.bin/vite --config utils/vite.config.js & \
	node --watch ./utils/express.js & \
	wait

prepare-release: test check types doc pretty build gzip version size-html

PLAYWRIGHT_TEST := npx playwright test

test:
	@echo $(INFO) "Playwright test JS"
	@$(PLAYWRIGHT_TEST) 

test-ui:
	@echo $(INFO) "Playwright test JS with ui"
	@$(PLAYWRIGHT_TEST) --ui

hugo:
	hugo server --source=docs --disableFastRender