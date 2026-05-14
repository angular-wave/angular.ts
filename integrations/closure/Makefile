.PHONY: closure-generate closure-externs closure-validate closure-build closure-test closure-demo clojurescript-generate clojurescript-validate clojurescript-build clojurescript-test clojurescript-package clojurescript-deploy java-generate java-check

CLOSURE_INTEGRATION_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
CLOSURE_REPO_ROOT := $(abspath $(CLOSURE_INTEGRATION_DIR)/../..)
CLOSURE_NODE ?= $(shell command -v node)
SHADOW_CLJS_VERSION ?= 3.4.10
CLOJURESCRIPT_JAVA_HOME ?= $(firstword $(wildcard $(HOME)/.sdkman/candidates/java/21*))
CLOSURE_JAVA_21_HOME ?= $(firstword $(wildcard $(HOME)/.sdkman/candidates/java/21*))
JSINTEROP_GENERATOR_JAVA ?= $(if $(CLOSURE_JAVA_21_HOME),$(CLOSURE_JAVA_21_HOME)/bin/java,java)
CLOJARS_REPOSITORY_ID ?= clojars
CLOJARS_URL ?= https://repo.clojars.org/
CLOJURESCRIPT_GROUP_ID ?= org.angular.ts
CLOJURESCRIPT_ARTIFACT_ID ?= angular-ts-cljs
CLOJURESCRIPT_PACKAGE_VERSION ?= $(shell cd $(CLOSURE_REPO_ROOT) && node -p "JSON.parse(require('fs').readFileSync('package.json', 'utf8')).version")

closure-generate: closure-externs clojurescript-generate java-generate

closure-externs:
	@"$(CLOSURE_NODE)" $(CLOSURE_INTEGRATION_DIR)/scripts/generate-externs.mjs

closure-validate:
	@"$(CLOSURE_NODE)" $(CLOSURE_INTEGRATION_DIR)/scripts/validate-externs.mjs

closure-build: closure-validate
	@$(MAKE) -C $(CLOSURE_REPO_ROOT) build
	@"$(CLOSURE_NODE)" $(CLOSURE_INTEGRATION_DIR)/scripts/build.mjs

closure-test: closure-build clojurescript-build java-check
	@cd $(CLOSURE_REPO_ROOT) && npx playwright test --config integrations/closure/playwright.config.ts

closure-demo: closure-build
	@echo "Open http://localhost:4000/integrations/closure/demo/index.html after running make serve"

clojurescript-generate: closure-externs
	@"$(CLOSURE_NODE)" $(CLOSURE_INTEGRATION_DIR)/clojurescript/scripts/generate-cljs-types.mjs

clojurescript-validate: closure-validate
	@"$(CLOSURE_NODE)" $(CLOSURE_INTEGRATION_DIR)/clojurescript/scripts/generate-cljs-types.mjs --check

clojurescript-build: clojurescript-validate
	@cd $(CLOSURE_INTEGRATION_DIR)/clojurescript && \
		if [ -n "$(CLOJURESCRIPT_JAVA_HOME)" ]; then \
			PATH="$(CLOJURESCRIPT_JAVA_HOME)/bin:$$PATH" npx --yes shadow-cljs@$(SHADOW_CLJS_VERSION) release todo; \
		else \
			npx --yes shadow-cljs@$(SHADOW_CLJS_VERSION) release todo; \
		fi

clojurescript-test: clojurescript-build
	@cd $(CLOSURE_REPO_ROOT) && npx playwright test --config integrations/closure/playwright.config.ts integrations/closure/clojurescript/clojurescript.test.ts

clojurescript-package: clojurescript-generate
	@CLOJURESCRIPT_GROUP_ID="$(CLOJURESCRIPT_GROUP_ID)" \
		CLOJURESCRIPT_ARTIFACT_ID="$(CLOJURESCRIPT_ARTIFACT_ID)" \
		CLOJURESCRIPT_PACKAGE_VERSION="$(CLOJURESCRIPT_PACKAGE_VERSION)" \
		"$(CLOSURE_NODE)" $(CLOSURE_INTEGRATION_DIR)/clojurescript/scripts/package-cljs.mjs

clojurescript-deploy: clojurescript-package
	@cd $(CLOSURE_REPO_ROOT) && \
		mvn deploy:deploy-file \
			-Dfile=integrations/closure/clojurescript/target/$(CLOJURESCRIPT_ARTIFACT_ID)-$(CLOJURESCRIPT_PACKAGE_VERSION).jar \
			-DpomFile=integrations/closure/clojurescript/target/$(CLOJURESCRIPT_ARTIFACT_ID)-$(CLOJURESCRIPT_PACKAGE_VERSION).pom \
			-DrepositoryId=$(CLOJARS_REPOSITORY_ID) \
			-Durl=$(CLOJARS_URL)

java-generate: closure-externs
	@cd $(CLOSURE_REPO_ROOT) && \
		JSINTEROP_GENERATOR_JAVA="$(JSINTEROP_GENERATOR_JAVA)" \
		mvn -f integrations/closure/java/pom.xml process-sources

java-check:
	@cd $(CLOSURE_REPO_ROOT) && \
		JSINTEROP_GENERATOR_JAVA="$(JSINTEROP_GENERATOR_JAVA)" \
		mvn -f integrations/closure/java/pom.xml clean verify
	@cd $(CLOSURE_REPO_ROOT) && \
		mvn -f integrations/closure/java/demo/pom.xml clean j2cl:clean verify
