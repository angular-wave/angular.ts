DOTNET ?= dotnet
DOTNET_INSTALL_DIR ?= $(CURDIR)/.dotnet
DOTNET_LOCAL ?= $(DOTNET_INSTALL_DIR)/dotnet
PLAYWRIGHT ?= ../../../node_modules/.bin/playwright

.PHONY: check local-sdk local-workload facade-build example-build runtime-test ci-check local-ci-check

check:
	node tool/check-csharp-facade.mjs
	node tool/check-csharp-project.mjs
	node tool/check-csharp-todo-example.mjs

local-sdk:
	DOTNET_INSTALL_DIR=$(DOTNET_INSTALL_DIR) node tool/install-dotnet-sdk.mjs

local-workload: local-sdk
	DOTNET_ROOT=$(DOTNET_INSTALL_DIR) PATH="$(DOTNET_INSTALL_DIR):$(PATH)" $(DOTNET_LOCAL) workload install wasm-tools

facade-build:
	$(DOTNET) build src/AngularTs.Wasm.csproj --nologo

example-build:
	DOTNET=$(DOTNET) node tool/build-csharp-todo.mjs

runtime-test:
	$(PLAYWRIGHT) test --config playwright.config.ts

ci-check: check facade-build example-build runtime-test

local-ci-check: local-workload
	DOTNET_ROOT=$(DOTNET_INSTALL_DIR) PATH="$(DOTNET_INSTALL_DIR):$(PATH)" $(MAKE) ci-check DOTNET=$(DOTNET_LOCAL)
