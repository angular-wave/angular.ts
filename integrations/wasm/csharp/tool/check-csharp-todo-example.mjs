import { readFileSync } from "node:fs";

const files = [
  {
    path: "../examples/todo/Todo.cs",
    fragments: [
      "namespace AngularTs.Wasm.Todo;",
      "using AngularTs.Wasm;",
      "using System.Runtime.Versioning;",
      "Scope.Named(scopeName ?? ScopeName)",
      "[SupportedOSPlatform(\"browser\")]",
      '_scope.Watch("newTodo", OnScopeUpdate)',
      '_scope.SetJson("items", EncodeItemsJson())',
      '_scope.SetJson("remainingCount", RemainingCount().ToString())',
      '_scope.SetJson("newTodo", EncodeJsonString(_newTodo))',
      '_ = _scope.GetJson("items")',
      "_scope.Sync()",
      "[JSExport]",
      "TodoBind",
      "TodoAdd",
      "TodoToggle",
      "TodoArchiveCompleted",
      "TodoUnbind",
      "TodoItemsJson",
      "EncodeItemsJson",
      "EncodeJsonString",
    ],
  },
  {
    path: "../examples/todo/bootstrap.js",
    fragments: [
      'import { angular } from "@angular-wave/angular.ts";',
      'import { WasmAbi } from "@angular-wave/angular.ts/services/wasm";',
      "WasmAbi.create()",
      "trackResultBuffers(scopeAbi.imports.angular_ts)",
      "globalThis.__angularTsCsharpWasmStats",
      "import(\"./_framework/dotnet.js\")",
      "runtime.setModuleImports(\"angular_ts\", scopeAbi.imports.angular_ts)",
      "runtime.getAssemblyExports(config.mainAssemblyName)",
      "exports.AngularTs.Wasm.Todo.Todo",
      "const conformanceExports = {",
      "scopeAbi.attach(conformanceExports)",
      "globalThis.__angularTsWasmConformance",
      "memory:",
      "runtime.Module._malloc",
      "runtime.Module._free",
      "NgScopeOnTransactionJs",
      'angular.module(moduleName, [])',
      'app.controller("csharpTodoController"',
      "scopeAbi.createScope($scope, { name: scopeName })",
      "exports.TodoBind(scopeName)",
      "exports.TodoUnbind()",
      "scopeAbi.unbind(scope.name)",
    ],
  },
  {
    path: "../examples/todo/index.html",
    fragments: [
      "ng-controller=\"csharpTodoController\"",
      "ng-submit=\"add(newTodo)\"",
      "ng-model=\"newTodo\"",
      "ng-repeat=\"todo in items\"",
      "ng-class=\"{done: todo.done}\"",
      "ng-click=\"toggle($index)\"",
      "ng-click=\"archive()\"",
    ],
  },
  {
    path: "../examples/todo/CsharpTodo.csproj",
    fragments: [
      '<Project Sdk="Microsoft.NET.Sdk">',
      "<TargetFramework>net8.0</TargetFramework>",
      "<RuntimeIdentifier>browser-wasm</RuntimeIdentifier>",
      "<AllowUnsafeBlocks>true</AllowUnsafeBlocks>",
      '<Compile Include="../../src/AngularTsWasm.cs" Link="AngularTsWasm.cs" />',
    ],
  },
  {
    path: "../examples/todo/Program.cs",
    fragments: [
      "namespace AngularTs.Wasm.Todo;",
      "public static class Program",
      "public static void Main()",
    ],
  },
  {
    path: "../tool/build-csharp-todo.mjs",
    fragments: [
      "dotnet",
      "publish",
      "CsharpTodo.csproj",
      "-warnaserror",
      "_framework",
      "dotnet.js",
      "blazor.boot.json",
      "findFrameworkDir(join(exampleDir, \"bin\"))",
      "C# todo browser output copied",
    ],
  },
  {
    path: "../tool/check-csharp-project.mjs",
    fragments: [
      "process.env.DOTNET || \"dotnet\"",
      "dotnet --info failed",
      "C# Wasm facade compile validation passed.",
    ],
  },
  {
    path: "../tool/install-dotnet-sdk.mjs",
    fragments: [
      "https://dot.net/v1/dotnet-install.sh",
      "DOTNET_INSTALL_DIR",
      "DOTNET_CHANNEL",
      "--channel",
      "--install-dir",
      "--no-path",
      "DOTNET_ROOT",
      "Local .NET SDK is available",
    ],
  },
  {
    path: "../Makefile",
    fragments: [
      "DOTNET_INSTALL_DIR",
      "DOTNET_LOCAL",
      "local-sdk:",
      "local-workload:",
      "facade-build:",
      "example-build:",
      "runtime-test:",
      "ci-check:",
      "local-ci-check:",
      "tool/install-dotnet-sdk.mjs",
      "tool/build-csharp-todo.mjs",
    ],
  },
  {
    path: "../.gitignore",
    fragments: [
      ".dotnet/",
      ".dotnet-install/",
      "examples/todo/_framework/",
    ],
  },
  {
    path: "../playwright.config.ts",
    fragments: [
      "testDir: \"./tests\"",
      "make -C ../../.. serve",
      "Desktop Chrome",
    ],
  },
  {
    path: "../tests/todo_basic.test.ts",
    fragments: [
      "C# Wasm todo demo updates AngularTS scope through WasmScope",
      "test.skip(",
      "../examples/todo/_framework/dotnet.js",
      "C# browser runtime output is not built yet",
      "page.goto(\"/integrations/wasm/csharp/examples/todo/\")",
      "getByLabel(\"C# todo title\")",
      "Review C# bridge",
      "Archive completed",
      "__angularTsCsharpWasmStats",
      "stats.created === stats.freed",
      "expect(pageErrors).toEqual([])",
      "expect(consoleErrors).toEqual([])",
    ],
  },
  {
    path: "../../../../.github/workflows/ci.yml",
    fragments: [
      "csharp-wasm:",
      "actions/setup-dotnet@v5",
      "dotnet-version: \"8.0.x\"",
      "dotnet workload install wasm-tools",
      "working-directory: integrations/wasm/csharp",
      "make -C integrations/wasm/csharp ci-check",
      "csharp-wasm-playwright-report",
    ],
  },
  {
    path: "../global.json",
    fragments: [
      '"version": "8.0.100"',
      '"rollForward": "latestFeature"',
      '"allowPrerelease": false',
    ],
  },
];

const missing = [];

for (const file of files) {
  const source = readFileSync(new URL(file.path, import.meta.url), "utf8");

  for (const fragment of file.fragments) {
    if (!source.includes(fragment)) {
      missing.push(`${file.path}: ${fragment}`);
    }
  }
}

if (missing.length > 0) {
  console.error("C# Wasm todo example is missing required fragments:");
  for (const fragment of missing) {
    console.error(`- ${fragment}`);
  }
  process.exit(1);
}

console.log("C# Wasm todo example source check passed.");
