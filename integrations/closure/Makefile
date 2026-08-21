.PHONY: closure-generate closure-externs closure-validate closure-build closure-test closure-demo clojurescript-generate clojurescript-format clojurescript-format-check clojurescript-lint clojurescript-validate clojurescript-build clojurescript-unit-test clojurescript-test clojurescript-package clojurescript-package-check clojurescript-version-check clojurescript-deploy java-generate java-package java-version-check java-docs-test java-types-test java-artifact-check java-deploy java-check generate-check

CLOSURE_INTEGRATION_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
CLOSURE_REPO_ROOT := $(abspath $(CLOSURE_INTEGRATION_DIR)/../..)
CLOSURE_NODE ?= $(shell command -v node)
CLOJURESCRIPT_JAVA_HOME ?= $(firstword $(wildcard $(HOME)/.sdkman/candidates/java/21*))
J2CL_JAVA_HOME ?= $(firstword $(wildcard $(HOME)/.sdkman/candidates/java/11* /usr/lib/jvm/java-11*))
closure-generate: closure-externs clojurescript-generate java-generate

closure-externs:
	@"$(CLOSURE_NODE)" $(CLOSURE_INTEGRATION_DIR)/scripts/generate-externs.mjs

closure-validate:
	@"$(CLOSURE_NODE)" $(CLOSURE_INTEGRATION_DIR)/scripts/validate-externs.mjs

closure-build: closure-validate
	@$(MAKE) -C $(CLOSURE_REPO_ROOT) release-build
	@"$(CLOSURE_NODE)" $(CLOSURE_INTEGRATION_DIR)/scripts/build.mjs

closure-test: closure-build clojurescript-build java-check
	@cd $(CLOSURE_REPO_ROOT) && npx playwright test --config integrations/closure/playwright.config.ts

closure-demo: closure-build
	@echo "Open http://localhost:4000/integrations/closure/demo/index.html after running make serve"

clojurescript-generate: closure-externs
	@"$(CLOSURE_NODE)" $(CLOSURE_INTEGRATION_DIR)/clojurescript/scripts/generate-cljs-types.mjs

clojurescript-format:
	@cd $(CLOSURE_INTEGRATION_DIR)/clojurescript && \
		npx shadow-cljs clj-run cljfmt.main fix src demo/src test/src

clojurescript-format-check:
	@cd $(CLOSURE_INTEGRATION_DIR)/clojurescript && \
		npx shadow-cljs clj-run cljfmt.main check src demo/src test/src

clojurescript-lint:
	@cd $(CLOSURE_INTEGRATION_DIR)/clojurescript && \
		npx shadow-cljs clj-run clj-kondo.main -- --lint src demo/src test/src

clojurescript-validate: closure-validate clojurescript-format-check clojurescript-lint
	@"$(CLOSURE_NODE)" $(CLOSURE_INTEGRATION_DIR)/clojurescript/scripts/generate-cljs-types.mjs --check

generate-check: clojurescript-validate

clojurescript-build: clojurescript-validate
	@cd $(CLOSURE_INTEGRATION_DIR)/clojurescript && \
		if [ -n "$(CLOJURESCRIPT_JAVA_HOME)" ]; then \
			PATH="$(CLOJURESCRIPT_JAVA_HOME)/bin:$$PATH" npx shadow-cljs release todo; \
		else \
			npx shadow-cljs release todo; \
		fi

clojurescript-unit-test: clojurescript-validate
	@cd $(CLOSURE_INTEGRATION_DIR)/clojurescript && \
		NODE_OPTIONS="--require ./test/setup.cjs" npx shadow-cljs compile test

clojurescript-test: clojurescript-build clojurescript-unit-test clojurescript-package-check
	@cd $(CLOSURE_REPO_ROOT) && npx playwright test --config integrations/closure/playwright.config.ts integrations/closure/clojurescript/clojurescript.test.ts

clojurescript-package: clojurescript-generate
	@cd $(CLOSURE_REPO_ROOT) && \
		mvn --batch-mode --no-transfer-progress \
			-f integrations/closure/clojurescript/pom.xml clean package

clojurescript-package-check: clojurescript-version-check clojurescript-package
	@"$(CLOSURE_NODE)" $(CLOSURE_INTEGRATION_DIR)/clojurescript/scripts/verify-cljs-package.mjs

clojurescript-version-check:
	@cd $(CLOSURE_REPO_ROOT) && \
		"$(CLOSURE_NODE)" integrations/closure/clojurescript/scripts/check-clojurescript-release-version.mjs

clojurescript-deploy: clojurescript-generate clojurescript-version-check
	@cd $(CLOSURE_REPO_ROOT) && \
		mvn --batch-mode --no-transfer-progress \
			-f integrations/closure/clojurescript/pom.xml -Prelease clean deploy

java-generate: closure-externs
	@cd $(CLOSURE_REPO_ROOT) && \
		mvn -f integrations/closure/java/pom.xml process-sources

java-package:
	@cd $(CLOSURE_REPO_ROOT) && \
		mvn -f integrations/closure/java/pom.xml clean package

java-version-check:
	@cd $(CLOSURE_REPO_ROOT) && \
		"$(CLOSURE_NODE)" integrations/closure/java/scripts/check-java-release-version.mjs

java-docs-test:
	@cd $(CLOSURE_REPO_ROOT) && \
		"$(CLOSURE_NODE)" --test integrations/closure/java/scripts/apply-jsinterop-javadocs.test.mjs

java-types-test:
	@cd $(CLOSURE_REPO_ROOT) && \
		"$(CLOSURE_NODE)" --test integrations/closure/java/scripts/refine-generated-jsinterop-types.test.mjs

java-artifact-check:
	@cd $(CLOSURE_REPO_ROOT) && \
		"$(CLOSURE_NODE)" integrations/closure/java/scripts/verify-java-artifact.mjs

java-deploy: java-version-check
	@cd $(CLOSURE_REPO_ROOT) && \
		mvn -f integrations/closure/java/pom.xml -Prelease clean deploy

java-check: java-docs-test java-types-test
	@cd $(CLOSURE_REPO_ROOT) && \
		mvn -f integrations/closure/java/pom.xml clean install
	@cd $(CLOSURE_REPO_ROOT) && \
		"$(CLOSURE_NODE)" integrations/closure/java/scripts/verify-java-artifact.mjs
	@cd $(CLOSURE_REPO_ROOT) && \
		if [ -n "$(J2CL_JAVA_HOME)" ]; then \
			JAVA_HOME="$(J2CL_JAVA_HOME)" \
			PATH="$(J2CL_JAVA_HOME)/bin:$$PATH" \
			mvn -f integrations/closure/java/demo/pom.xml clean j2cl:clean verify; \
		else \
			mvn -f integrations/closure/java/demo/pom.xml clean j2cl:clean verify; \
		fi
