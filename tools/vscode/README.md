# AngularTS VS Code Extension

Local editor tooling for AngularTS templates, directives, components, filters,
and dependency injection.

## Development

```sh
npm install
npm run build
npm test
```

Open `tools/vscode` in VS Code and run the extension host to test completions,
hover, and definition support against the fixtures.

## Current MVP

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
- `AngularTS: Find Usage` for indexed directives, components, filters,
  controllers, and injectable tokens;
- `AngularTS: Create Component` context command with generated component,
  template, optional CSS, optional test stub, and module registration;
- snippets for common AngularTS authoring patterns, HTTP directives, Wasm,
  `$inject`, DI arrays, typed bindings, and web-component wrappers.
