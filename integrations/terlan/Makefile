TERLC ?= terlc
NODE ?= node
RUNTIME_ROOT ?= $(abspath ../..)
BUILD_DIR ?= build
BINDINGS := $(abspath $(BUILD_DIR)/bindings)
BINDING_MANIFEST := $(BINDINGS)/std/js/manifests/std_js_bindings.json

.PHONY: bindings build check compatibility

bindings:
	$(NODE) tool/bindings.mjs --compiler "$(TERLC)" --runtime-root "$(RUNTIME_ROOT)" --out "$(BINDINGS)"

build:
	TERLAN_JS_BINDING_MANIFESTS="$(BINDING_MANIFEST)" $(TERLC) build src --target js.shared --out-dir "$(BUILD_DIR)/compiled" --declarations

check:
	TERLC="$(TERLC)" ANGULAR_RUNTIME_ROOT="$(RUNTIME_ROOT)" $(NODE) --test tests/integration.test.mjs

compatibility:
	TERLAN_ANGULAR_RUNTIME_ROOT="$(RUNTIME_ROOT)" $(TERLC) test tools/src/terlan/angular/tools/AngularCompatibilityTest.terl --target terlan-vm
