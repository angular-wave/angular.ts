package main

import (
	"os"

	angularwasm "angular.ts/wasm/go"
)

type goTodoController struct{}

func main() {
	module := angularwasm.NewNgModule("goWasmTodo")
	controller := angularwasm.NewController[goTodoController](
		"goTodoController",
		"__ng_controller_GoTodoController",
	).
		WithScopeName("goTodo:main").
		WithMethods("add", "toggle", "archive").
		WithFields(
			angularwasm.TypedField[[]Todo]("items"),
			angularwasm.TypedFieldFor[int]("remainingCount", "remainingCount()"),
			angularwasm.TypedField[string]("newTodo"),
			angularwasm.TypedField[string]("titleSeen"),
		).
		WithWatchRoutes(
			angularwasm.TypedWatchRoute[string]("newTodo", "onNewTodoChanged"),
		)
	module.Controller(controller)

	if err := angularwasm.WriteManifestFile(module, "angular-ts.json"); err != nil {
		panic(err)
	}

	if err := angularwasm.WriteBootstrapFile(angularwasm.BootstrapConfig{
		Manifest:             module,
		GoWasmScopeAbiImport: "../go-wasm-scope-abi.js",
		WasmExecImport:       "../wasm_exec.js",
		WasmPath:             "../main.wasm",
		Bootstrap:            true,
	}, ".angular-ts/bootstrap.js"); err != nil {
		panic(err)
	}

	registrations := module.Registrations()
	bridgeSource, err := angularwasm.GenerateControllerBridge(angularwasm.ControllerBridgeConfig{
		PackageName: "main",
		AppType:     "TodoApp",
		Controller:  registrations[0],
	})
	if err != nil {
		panic(err)
	}

	if err := os.WriteFile("scope_sync_gen.go", []byte(bridgeSource), 0o644); err != nil {
		panic(err)
	}
}

type Todo struct {
	Task string
	Done bool
}
