# AngularTS VS Code Extension

Local editor tooling for AngularTS templates, directives, components, filters,
and dependency injection.

## Features

- Built-in `ng-*` directive completion in HTML and JavaScript/TypeScript inline
  templates.
- HTML syntax highlighting inside AngularTS inline `template` strings.
- Hover documentation for built-in directives, custom directives, components,
  bindings, and filters.
- Go to definition from standard directives to AngularTS source, and from
  custom template usage to local registrations.
- Custom `.directive()`, `.component()`, `.filter()`, `.controller()`,
  `.service()`, `.factory()`, `.provider()`, and `.constant()` indexing.
- Component and directive binding completion with binding mode documentation.
- Filter completion, hover, returned-callback signatures, definition, usage
  search, and unknown-filter diagnostics, including chained filters with
  arguments.
- Template diagnostics for unknown directives, invalid directive locations,
  missing required expression values, malformed expressions, unknown component
  bindings, unresolved controllers, unresolved injectable tokens, DI arity
  mismatches, and missing literal `templateUrl` files.
- Navigation from `ng-controller`, `controller: "Name"`, route/state
  `component: "name"`, DI arrays, and `$inject` assignments to indexed
  registrations.
- Hover and definition support for indexed AngularTS symbols used inside
  interpolation and directive expressions.
- Source-backed TypeScript hover and go to definition for symbols used inside
  inline-template AngularTS expressions when declarations are visible in the
  source document.
- `ng-controller="Controller as alias"` scope locals are inferred for
  source-backed expression analysis.
- Inline component templates infer the component controller local from
  `controller`, `controllerAs`, and the default `$ctrl` alias.
- Inline component templates augment that controller local with binding-mode
  types from the component definition.
- `ng-repeat` item locals are inferred, including item types when the repeated
  collection type is visible to source-backed expression analysis.
- Completion for indexed AngularTS symbols inside interpolation and directive
  expressions.
- Source-backed TypeScript signature help for AngularTS expression calls when
  the relevant declarations are visible to the analyzer.
- `$event` type hints for built-in event directives such as `ng-click`,
  `ng-keydown`, and `ng-submit`.
- `AngularTS: Find Usage` for directives, components, filters, controllers, and
  injectable tokens across HTML, source files, and inline templates.
- `AngularTS: Create Component` context command for generating component source,
  template, optional CSS, optional test stub, and module registration.
- Snippets for common AngularTS authoring patterns, HTTP directives, Wasm,
  `$inject`, DI arrays, typed bindings, and web-component wrappers.

## Commands

- `AngularTS: Restart Language Server`
- `AngularTS: Show Index`
- `AngularTS: Rebuild Index`
- `AngularTS: Find Usage`
- `AngularTS: Create Component`

## Settings

- `angularTs.enable`: Enable AngularTS editor support.
- `angularTs.inlineTemplates`: Enable AngularTS support inside JavaScript and
  TypeScript inline template strings.
- `angularTs.diagnostics`: Enable AngularTS template and dependency-injection
  diagnostics.
- `angularTs.diagnosticsSeverity`: Controls whether AngularTS diagnostics are
  reported as `hint`, `information`, `warning`, or `error`.
- `angularTs.projectConfig`: Optional path to an AngularTS project
  configuration file.
- `angularTs.trace.server`: Trace AngularTS language-service activity.
- `angularTs.includeAngularJsCompatibility`: Include compatibility completions
  for AngularJS-era syntax not documented by AngularTS.

## Development

```sh
npm install
npm run build
npm test
npm run test:lsp
```

From the repository root:

```sh
make vscode-build
make vscode-test
make vscode-smoke
```

Open `tools/vscode` in VS Code and run the extension host to test completions,
hover, and definition support against the fixtures.

`npm run test:lsp` is the CI-friendly language-service harness. It runs the
same built extension tests without launching a VS Code window.

`npm run test:smoke` launches a VS Code extension host against
`test-fixtures/route-completions` and verifies route-name and route-param
completion through the registered provider.

## Packaging

```sh
npm run package
```

The generated `.vsix` should be smoke-tested in a clean VS Code profile before
publishing.

Use `RELEASE_CHECKLIST.md` for version, packaging, smoke-test, marketplace, and
publish gates.

## Compatibility

The extension targets VS Code `^1.90.0` and AngularTS projects using the
registration and template APIs documented by this repository. AngularJS-era
compatibility behavior is intentionally opt-in through
`angularTs.includeAngularJsCompatibility`.

## Limitations

- TypeScript semantic expression intelligence is being wired incrementally:
  source-backed expression signature help exists, while full controller alias,
  component binding, and `ng-repeat` local type inference are still roadmap
  items.
- Inline template support is regex and scanner based; complex generated
  templates may not be fully understood.
- Diagnostics are conservative and focus on actionable AngularTS authoring
  mistakes.

## Screenshots

Screenshots and GIFs will be captured during marketplace smoke testing.

## Current MVP Status

- built-in `ng-*` directive completion in HTML and inline template contexts;
- custom component and element-directive tag completion;
- component and directive binding attribute completion, hover, definition, and
  usage scanning;
- hover documentation for built-in directives;
- go to definition from built-in directives to AngularTS source files;
- built-in and custom filter completion, hover, go to definition, and
  unknown-filter diagnostics in interpolation expressions;
- lightweight indexing for custom `.directive()`, `.component()`, `.filter()`,
  `.controller()`, `.service()`, `.factory()`, and `.provider()` registrations;
- conservative HTML diagnostics for unknown AngularTS directives and component
  binding typos;
- navigation from `ng-controller`, `controller: "Name"`, and DI string tokens
  to indexed registrations, including `$inject` assignments;
- dependency-injection array arity and unresolved-token diagnostics for
  JavaScript and TypeScript, using built-in tokens generated from
  `src/injection-tokens.ts`;
- unresolved controller diagnostics in HTML and source metadata;
- missing literal `templateUrl` file diagnostics;
- invalid directive location diagnostics based on `restrict`;
- malformed interpolation and directive expression diagnostics;
- route/state component navigation;
- `AngularTS: Find Usage` for indexed directives, components, filters,
  controllers, and injectable tokens across HTML and inline templates;
- `AngularTS: Create Component` context command with generated component,
  template, optional CSS, optional test stub, and module registration;
- snippets for common AngularTS authoring patterns, HTTP directives, Wasm,
  `$inject`, DI arrays, typed bindings, and web-component wrappers.
