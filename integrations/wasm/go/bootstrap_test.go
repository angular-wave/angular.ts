package angularwasm

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type bootstrapTodoController struct{}

func TestGenerateBootstrapUsesManifestRegistrations(t *testing.T) {
	source, err := GenerateBootstrap(BootstrapConfig{
		Manifest:             basicAppBootstrapModule(),
		GoWasmScopeAbiImport: "../go-wasm-scope-abi.js",
		WasmExecImport:       "../wasm_exec.js",
		WasmPath:             "../main.wasm",
		Bootstrap:            true,
	})
	if err != nil {
		t.Fatalf("GenerateBootstrap returned error: %v", err)
	}

	required := []string{
		`import { angular, WasmScopeAbi } from "@angular-wave/angular.ts";`,
		`import { GoWasmScopeAbi } from "../go-wasm-scope-abi.js";`,
		`import "../wasm_exec.js";`,
		`const requires = [];`,
		`fetch(new URL("../main.wasm", import.meta.url))`,
		`"name":"goTodoController"`,
		`"export":"__ng_controller_GoTodoController"`,
		`"scopeName":"goTodo:main"`,
		`"methods":["add","toggle","archive"]`,
		`"fields":[{"name":"items"`,
		`{"name":"remainingCount"`,
		`"watches":[{"path":"newTodo","handler":"onNewTodoChanged","goType":"string"}]`,
		`module.controller(registration.name, createController(registration));`,
		`angular.bootstrap(document.body, [moduleName]);`,
	}
	for _, expected := range required {
		if !strings.Contains(source, expected) {
			t.Fatalf("generated bootstrap missing %q:\n%s", expected, source)
		}
	}

	assertFileSnapshot(t, "testdata/basic_app_bootstrap.snapshot.js", source)
}

func TestWriteBootstrapFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".angular-ts", "bootstrap.js")
	if err := WriteBootstrapFile(BootstrapConfig{Manifest: basicAppBootstrapModule()}, path); err != nil {
		t.Fatalf("WriteBootstrapFile returned error: %v", err)
	}

	source, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read generated bootstrap: %v", err)
	}
	if !strings.Contains(string(source), `const moduleName = "goWasmTodo";`) {
		t.Fatalf("unexpected generated bootstrap:\n%s", source)
	}
}

func TestGenerateBootstrapRejectsMismatchedModuleName(t *testing.T) {
	_, err := GenerateBootstrap(BootstrapConfig{
		ModuleName: "otherModule",
		Manifest:   basicAppBootstrapModule(),
	})
	if err == nil {
		t.Fatal("expected mismatched module name error")
	}
}

func basicAppBootstrapModule() *NgModule {
	module := NewNgModule("goWasmTodo")
	module.Controller(NewController[bootstrapTodoController](
		"goTodoController",
		"__ng_controller_GoTodoController",
	).
		WithScopeName("goTodo:main").
		WithMethods("add", "toggle", "archive").
		WithFields(
			ScopeField{Name: "items", GoName: "items", GoType: "[]main.Todo"},
			ScopeField{Name: "remainingCount", GoName: "remainingCount", GoType: "int"},
			ScopeField{Name: "newTodo", GoName: "newTodo", GoType: "string"},
			ScopeField{Name: "titleSeen", GoName: "titleSeen", GoType: "string"},
		).
		WithWatchRoutes(
			ScopeWatchRoute{Path: "newTodo", Handler: "onNewTodoChanged", GoType: "string"},
		))

	return module
}
