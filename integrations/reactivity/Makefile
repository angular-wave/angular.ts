.PHONY: build test

build:
	$(MAKE) -C ../gleam test
	$(MAKE) -C ../scala scope-state-build

test: build
	cd ../.. && node_modules/.bin/playwright test --config integrations/reactivity/playwright.config.ts
