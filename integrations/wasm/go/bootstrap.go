package angularwasm

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// BootstrapConfig controls generated JavaScript bootstrap output for a
// Go-authored AngularTS Wasm app.
type BootstrapConfig struct {
	// ModuleName is the AngularTS module name to create and bootstrap.
	ModuleName string
	// Requires is the ordered list of AngularTS module dependencies.
	Requires []string
	// Manifest is the Go-authored registration metadata to emit.
	Manifest *NgModule
	// AngularImport is the JavaScript module specifier for AngularTS exports.
	AngularImport string
	// GoWasmScopeAbiImport is the JavaScript module specifier for GoWasmScopeAbi.
	GoWasmScopeAbiImport string
	// WasmExecImport is the JavaScript module specifier for wasm_exec.js.
	WasmExecImport string
	// WasmPath is the runtime URL for the compiled Go Wasm module.
	WasmPath string
	// Bootstrap controls whether generated code calls angular.bootstrap.
	Bootstrap bool
}

// GenerateBootstrap serializes JavaScript bootstrap code for a Go-authored
// AngularTS Wasm app.
func GenerateBootstrap(config BootstrapConfig) (string, error) {
	config = normalizeBootstrapConfig(config)
	if err := config.Validate(); err != nil {
		return "", err
	}

	manifest, err := config.Manifest.manifestPayload()
	if err != nil {
		return "", err
	}

	manifestJSON, err := json.Marshal(manifest)
	if err != nil {
		return "", err
	}

	requiresJSON, err := json.Marshal(config.Requires)
	if err != nil {
		return "", err
	}

	var out strings.Builder
	out.WriteString("import { angular, WasmScopeAbi } from ")
	out.WriteString(jsString(config.AngularImport))
	out.WriteString(";\n")
	out.WriteString("import { GoWasmScopeAbi } from ")
	out.WriteString(jsString(config.GoWasmScopeAbiImport))
	out.WriteString(";\n")
	out.WriteString("import ")
	out.WriteString(jsString(config.WasmExecImport))
	out.WriteString(";\n\n")
	out.WriteString("const moduleName = ")
	out.WriteString(jsString(config.ModuleName))
	out.WriteString(";\n")
	out.WriteString("const requires = ")
	out.Write(requiresJSON)
	out.WriteString(";\n")
	out.WriteString("const manifest = ")
	out.Write(manifestJSON)
	out.WriteString(";\n\n")
	out.WriteString(`const scopeAbi = new WasmScopeAbi();
const goScopeAbi = new GoWasmScopeAbi(scopeAbi);

globalThis.__angularTsGoWasmScopeAbi = goScopeAbi;

const goReady = new Promise((resolve) => {
  globalThis.addEventListener("angular-ts-go-ready", resolve, { once: true });
});

const go = new Go();
go.importObject.angular_ts = goScopeAbi.imports();

const result = await WebAssembly.instantiateStreaming(
  fetch(new URL(`)
	out.WriteString(jsString(config.WasmPath))
	out.WriteString(`, import.meta.url)),
  go.importObject,
);
const exports = result.instance.exports;

goScopeAbi.attach(exports);

void go.run(result.instance);
await goReady;

const readExport = (name) => {
  const value = globalThis[name];

  if (!value) {
    throw new Error(`)
	out.WriteString(jsString("Go Wasm export is not available"))
	out.WriteString(` + ": " + name);
  }

  return value;
};

const createController = (registration) => [
  "$scope",
  ($scope) => {
    const controller = readExport(registration.export);
    const scopeName =
      registration.scopeName || controller.scopeName || registration.name + ":main";
    const scope = goScopeAbi.createScope($scope, { name: scopeName });
    const methods = registration.methods || controller.methods || [];

    methods.forEach((method) => {
      if (typeof controller[method] !== "function") {
        throw new Error(`)
	out.WriteString(jsString("Go Wasm controller method is not available"))
	out.WriteString(` + ": " + method);
      }

      $scope[method] = (...args) => controller[method](...args);
    });

    $scope.$on("$destroy", () => {
      if (typeof controller.unbind === "function") {
        controller.unbind();
      }
      goScopeAbi.unbind(scope.name);
    });

    if (typeof controller.bind === "function") {
      controller.bind(scope.name);
    }
  },
];

const register = (module, registration) => {
  switch (registration.kind) {
    case "controller":
      module.controller(registration.name, createController(registration));
      break;
    case "component":
      module.component(registration.name, {
        controller: createController(registration),
        template: registration.template,
        templateUrl: registration.templateUrl,
      });
      break;
    case "service":
      module.service(registration.name, readExport(registration.export));
      break;
    case "factory":
      module.factory(registration.name, readExport(registration.export));
      break;
    case "value":
      module.value(registration.name, readExport(registration.export));
      break;
    default:
      throw new Error(`)
	out.WriteString(jsString("Unsupported Go AngularTS registration kind"))
	out.WriteString(` + ": " + registration.kind);
  }
};

const module = angular.module(moduleName, requires);

(manifest.registrations || []).forEach((registration) => {
  register(module, registration);
});
`)

	if config.Bootstrap {
		out.WriteString("\nangular.bootstrap(document.body, [moduleName]);\n")
	}

	return out.String(), nil
}

// WriteBootstrapFile writes generated JavaScript bootstrap code for a
// Go-authored AngularTS Wasm app.
func WriteBootstrapFile(config BootstrapConfig, path string) error {
	if path == "" {
		return fmt.Errorf("angular.ts wasm: bootstrap path is required")
	}

	source, err := GenerateBootstrap(config)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	return os.WriteFile(path, []byte(source), 0o644)
}

// Validate checks that the bootstrap configuration can generate runnable
// JavaScript.
func (c BootstrapConfig) Validate() error {
	if c.ModuleName == "" {
		return fmt.Errorf("angular.ts wasm: bootstrap module name is required")
	}
	if c.Manifest == nil {
		return fmt.Errorf("angular.ts wasm: bootstrap manifest is required")
	}
	if c.Manifest.Name() != "" && c.Manifest.Name() != c.ModuleName {
		return fmt.Errorf("angular.ts wasm: bootstrap module name %q does not match manifest module %q", c.ModuleName, c.Manifest.Name())
	}
	if c.AngularImport == "" {
		return fmt.Errorf("angular.ts wasm: AngularTS import path is required")
	}
	if c.GoWasmScopeAbiImport == "" {
		return fmt.Errorf("angular.ts wasm: GoWasmScopeAbi import path is required")
	}
	if c.WasmExecImport == "" {
		return fmt.Errorf("angular.ts wasm: wasm_exec.js import path is required")
	}
	if c.WasmPath == "" {
		return fmt.Errorf("angular.ts wasm: Wasm path is required")
	}

	return c.Manifest.Validate()
}

func normalizeBootstrapConfig(config BootstrapConfig) BootstrapConfig {
	if config.Requires == nil {
		config.Requires = []string{}
	}
	if config.ModuleName == "" && config.Manifest != nil {
		config.ModuleName = config.Manifest.Name()
	}
	if config.AngularImport == "" {
		config.AngularImport = "@angular-wave/angular.ts"
	}
	if config.GoWasmScopeAbiImport == "" {
		config.GoWasmScopeAbiImport = "./go-wasm-scope-abi.js"
	}
	if config.WasmExecImport == "" {
		config.WasmExecImport = "./wasm_exec.js"
	}
	if config.WasmPath == "" {
		config.WasmPath = "./main.wasm"
	}

	return config
}

func jsString(value string) string {
	encoded, _ := json.Marshal(value)
	return string(encoded)
}
