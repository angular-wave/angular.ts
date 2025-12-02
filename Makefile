.PHONY: build test types

setup:
	@rm -r ./node_modules/
	@npm i
	@npx playwright install

BUILD_DIR = ./dist		
build: version
	@if [ -d "$(BUILD_DIR)" ]; then \
		echo "Removing $(BUILD_DIR)..."; \
		rm -r "$(BUILD_DIR)"; \
	fi
	@npm i
	./node_modules/.bin/rollup -c

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
	@vite --config utils/vite.config.js & \
	node --watch ./utils/express.js & \
	wait

prepare-release: test check types doc pretty build

PLAYWRIGHT_TEST := npx playwright test

test:
	@echo $(INFO) "Playwright test JS"
	@$(PLAYWRIGHT_TEST) 

test-ui:
	@echo $(INFO) "Playwright test JS with ui"
	@$(PLAYWRIGHT_TEST) --ui

hugo:
	hugo server --source=docs --disableFastRender