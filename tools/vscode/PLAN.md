# AngularTS VS Code Extension Plan

## Goal

Create a VS Code extension under `tools/vscode` that understands AngularTS
template syntax in HTML, inline template strings, and AngularTS registration
code. The first useful milestone is high-quality inline documentation for
standard and custom directives, followed by completion, navigation, diagnostics,
and authoring utilities.

The extension should draw on proven AngularJS extension behavior and HTMX
extension ergonomics:

- attribute-first HTML completion with useful docs shown in the completion
  details panel;
- hover docs that explain what an attribute does and what expression shape it
  expects;
- navigation from template usage to the registration source;
- lightweight diagnostics in HTML without requiring a full Angular runtime;
- snippets and context-menu generation for common AngularTS authoring patterns.

## Scope

The extension should support these authoring surfaces:

- standalone `.html` templates;
- inline HTML in TypeScript and JavaScript template literals;
- AngularTS registration code using `.directive()`, `.component()`, `.filter()`,
  `.controller()`, `.service()`, `.factory()`, `.provider()`, `.constant()`,
  `.config()`, and `.run()`;
- dependency-injection arrays, `$inject` assignments, and function parameters;
- template URLs, controller references, service references, and filter pipes;
- AngularTS built-ins exported from `@types`, `dist/directive`, and
  `dist/filters`.

## Non-Goals For The First Release

- runtime debugging inside the browser;
- full AngularJS compatibility beyond syntax and registration shapes used by
  AngularTS;
- refactors that rewrite application code;
- framework-specific project generation beyond component scaffolding;
- a custom TypeScript compiler fork.

## Architecture

- [x] Create `tools/vscode/package.json` as a workspace-local VS Code extension
      package with scripts for build, watch, lint, test, and package.
- [x] Use TypeScript for extension code and language-service code.
- [x] Split the extension into:
      `src/extension.ts` for activation and VS Code wiring,
      `src/providers/*` for provider features until an LSP server is needed,
      `src/analyzer/*` for AngularTS project indexing,
      `src/templates/*` for HTML/expression parsing, and
      `snippets/*` for snippets.
- [x] Use VS Code's built-in HTML support for base HTML parsing/completion
      rather than replacing it.
- [ ] Use the TypeScript compiler API or `tsserver` protocol for project-aware
      symbols, definitions, types, and signature help.
- [x] Add a small AngularTS metadata index that maps normalized directive,
      component, filter, controller, and service names to source locations,
      docs, bindings, dependencies, and template metadata.
- [x] Keep extension settings explicit:
      `angularTs.enable`,
      `angularTs.inlineTemplates`,
      `angularTs.diagnostics`,
      `angularTs.projectConfig`,
      `angularTs.trace.server`,
      `angularTs.includeAngularJsCompatibility`.

## Phase 0 - Reference Audit

- [ ] Review existing AngularJS VS Code extensions for:
      built-in `ng-*` completions,
      custom directive/component indexing,
      hover docs,
      definition providers,
      DI validation,
      controller/template navigation,
      usage search commands,
      and snippets.
- [ ] Review HTMX VS Code extensions for:
      HTML attribute completion style,
      compact attribute documentation,
      request-related diagnostics,
      hover formatting,
      and low-friction HTML integration.
- [x] Record source links, feature notes, and decisions in
      `tools/vscode/references.md`.
- [ ] Decide which AngularJS behaviors are accepted as AngularTS-compatible and
      which require AngularTS-specific syntax or names.
- [x] Create a small fixture project under `tools/vscode/test-fixtures/basic-app`
      that contains standard directives, custom directives, components, filters,
      controllers, services, `templateUrl`, and inline templates.

## Phase 1 - Extension Scaffold

- [x] Generate the extension package under `tools/vscode`.
- [x] Add `tsconfig.json`, `.vscodeignore`, extension entrypoint, and test
      harness.
- [x] Add a local command:
      `AngularTS: Restart Language Server`.
- [x] Add a local command:
      `AngularTS: Show Index`.
- [x] Add a local command:
      `AngularTS: Rebuild Index`.
- [ ] Add CI-friendly tests using `@vscode/test-electron` or a stable LSP test
      harness.
- [x] Document local development commands in `tools/vscode/README.md`.

## Phase 2 - Built-In Directive Knowledge Base

- [x] Generate a built-in directive catalog from AngularTS source and public
      TypeScript definitions (`src/ng.ts`, `src/namespace.ts`, and imported
      source files).
- [ ] Include all core AngularTS directives:
      `ng-app`,
      `ng-bind`,
      `ng-bind-html`,
      `ng-bind-template`,
      `ng-class`,
      `ng-cloak`,
      `ng-controller`,
      `ng-if`,
      `ng-include`,
      `ng-init`,
      `ng-listener`,
      `ng-model`,
      `ng-model-options`,
      `ng-non-bindable`,
      `ng-options`,
      `ng-repeat`,
      `ng-show`,
      `ng-hide`,
      `ng-style`,
      `ng-switch`,
      `ng-switch-when`,
      `ng-switch-default`,
      `ng-transclude`,
      `ng-ref`,
      `ng-ref-read`,
      `ng-scope`,
      `ng-setter`,
      router directives,
      HTTP/SSE directives,
      Wasm directives,
      worker directives,
      web transport directives,
      validators,
      and event aliases.
- [x] Include normalized aliases:
      `ng-*`,
      and `data-ng-*`.
- [ ] Store for each directive:
      name,
      aliases,
      allowed locations,
      expected expression kind,
      examples,
      docs,
      required companion attributes,
      conflicting attributes,
      and definition source.
- [ ] Add snapshot tests for the generated catalog.
- [x] Make the catalog usable without opening a TypeScript project.

## Phase 3 - Standard Directive Documentation MVP

- [x] Provide attribute completion for built-in `ng-*` directives in HTML.
- [x] Provide completion docs that include directive purpose, expected value,
      and one short example.
- [x] Provide hover docs for built-in directives.
- [x] Provide go to definition from a built-in directive usage to the AngularTS
      source or `.d.ts` declaration.
- [ ] Add docs for expression-sensitive directives first:
      `ng-model`,
      `ng-repeat`,
      `ng-if`,
      `ng-show`,
      `ng-hide`,
      `ng-class`,
      `ng-style`,
      `ng-options`,
      `ng-include`,
      `ng-controller`,
      event directives,
      and HTTP/SSE directives.
- [ ] Add completion and hover tests for `.html` files.
- [ ] Add completion and hover tests for inline template strings.

Acceptance criteria:

- [x] Typing `ng-` in an HTML attribute position offers AngularTS directives.
- [x] Hovering a standard directive shows AngularTS-specific documentation.
- [x] `Go to Definition` on a standard directive opens the source or type
      declaration.
- [ ] Inline template literals receive the same standard directive docs.

## Phase 4 - AngularTS Project Index

- [x] Parse TypeScript and JavaScript files in the active workspace.
- [x] Detect module registration chains:
      `angular.module(...).directive(...)`,
      `.component(...)`,
      `.filter(...)`,
      `.controller(...)`,
      `.service(...)`,
      `.factory(...)`,
      `.provider(...)`,
      `.constant(...)`,
      `.config(...)`,
      and `.run(...)`.
- [ ] Detect object-map registrations where AngularTS accepts them.
- [x] Detect `$inject` arrays and inline DI array notation.
- [x] Normalize directive and component names between camelCase registration
      names and kebab-case HTML usage.
- [x] Extract directive definition object fields:
      `restrict`,
      `scope`,
      `bindToController`,
      `bindings`,
      `require`,
      `controller`,
      `controllerAs`,
      `template`,
      `templateUrl`,
      `compile`,
      and `link`.
- [x] Extract component fields:
      `bindings`,
      `controller`,
      `controllerAs`,
      `template`,
      and `templateUrl`.
- [ ] Extract filter callable signatures when TypeScript type information is
      available.
- [ ] Extract JSDoc/TSDoc for custom directives, components, controllers,
      services, and filters.
- [x] Track source ranges for all symbols so navigation is precise.
- [x] Re-index incrementally on file changes.

## Phase 5 - Custom Directives And Components

- [x] Complete custom directive tags when `restrict` includes `E`.
- [ ] Complete custom directive attributes when `restrict` includes `A` or is
      omitted.
- [x] Complete custom component tags.
- [x] Complete component and directive binding attributes.
- [x] Show binding mode in completion docs:
      `@`,
      `<`,
      `=`,
      `&`,
      and optional bindings.
- [x] Provide hover docs on custom directive and component tags.
- [x] Provide hover docs on custom binding attributes.
- [x] Provide go to definition from a custom tag or attribute to its
      registration source.
- [x] Provide go to definition from a binding attribute to the binding
      declaration when available.
- [x] Add `Find AngularTS Usage` commands for directive/component definitions.

Acceptance criteria:

- [x] A `.component("userCard", { bindings: { user: "<" } })` registration
      completes `<user-card>` and `user`.
- [ ] Hovering `<user-card>` shows component documentation and controller
      details.
- [x] `Go to Definition` from `<user-card>` opens the component registration.
- [x] `Find AngularTS Usage` finds tag and attribute usage in HTML and inline
      templates.

## Phase 6 - Custom Filters

- [x] Complete built-in and custom filters inside AngularTS expressions.
- [ ] Show filter signatures and docs in completion details.
- [x] Provide hover docs on filter names.
- [x] Provide go to definition from filter usage to `.filter(...)`.
- [x] Diagnose unknown filters.
- [ ] Support chained filters and filter arguments.

Acceptance criteria:

- [x] `{{ total | currency }}` resolves `currency` to built-in docs.
- [x] `{{ items | activeOnly }}` resolves `activeOnly` to the custom filter
      registration.

## Phase 7 - HTML And Inline Template Syntax

- [ ] Register language support for `.html` files through VS Code's standard
      HTML language.
- [ ] Add embedded AngularTS expression regions for:
      interpolation,
      directive attribute values,
      event attributes,
      repeat expressions,
      options expressions,
      class/style object expressions,
      and filter expressions.
- [ ] Detect inline templates in:
      `template: "..."`,
      `template: \`...\``,
      component metadata,
      directive metadata,
      route/state declarations,
      and generated AngularTS runtime/web-component options.
- [ ] Provide HTML syntax highlighting inside inline templates.
- [ ] Avoid processing templates inside `ng-non-bindable`.
- [ ] Add grammar tests or snapshot tests for embedded regions.

## Phase 8 - Data Binding Intelligence

- [ ] Use TypeScript project information to infer controller aliases and scope
      symbols.
- [ ] Support completion for identifiers in interpolation and directive
      expressions.
- [ ] Provide hover type hints for expression identifiers and property access.
- [ ] Provide go to definition from expression identifiers to TypeScript
      declarations.
- [ ] Provide signature help for function calls in AngularTS expressions.
- [ ] Infer component binding types from controller/component definitions where
      possible.
- [ ] Infer `ng-repeat` local variables and item types.
- [ ] Infer `$event` types for event directives when possible.
- [ ] Fall back gracefully when a project is plain JavaScript.

Acceptance criteria:

- [ ] In `<button ng-click="save(user)">`, `save` offers signature help.
- [ ] In `{{ user.name }}`, `user.name` hover shows the TypeScript type when
      available.
- [ ] `Go to Definition` from `user.name` reaches the controller or component
      source when available.

## Phase 9 - Diagnostics

- [x] Diagnose unknown built-in/custom directives.
- [x] Diagnose invalid directive locations based on `restrict`.
- [ ] Diagnose missing required expression values.
- [ ] Diagnose malformed AngularTS expressions in HTML.
- [ ] Diagnose malformed interpolation expressions.
- [ ] Diagnose unknown filters.
- [x] Diagnose unresolved controller names.
- [x] Diagnose unresolved services in DI arrays.
- [x] Diagnose unresolved services in `$inject` assignments.
- [x] Diagnose DI array length/name mismatches.
- [x] Diagnose missing `templateUrl` files.
- [x] Diagnose component/directive binding typos.
- [ ] Provide quick fixes where safe:
      create missing template file,
      add missing binding,
      convert camelCase to kebab-case,
      and add missing DI token.
- [ ] Add workspace settings to control diagnostic severity.

## Phase 10 - Navigation Utilities

- [x] Navigate from `templateUrl` to the referenced HTML file.
- [x] Navigate from `controller: "Name"` to the controller registration.
- [x] Navigate from `ng-controller="Name"` to the controller registration.
- [x] Navigate from service names in DI arrays to service/factory/provider
      registrations.
- [ ] Navigate from route/state `component` names to component registrations.
- [x] Add CodeLens or commands for:
      find directive usage,
      find component usage,
      find filter usage,
      find controller usage,
      and find service injection sites.
- [ ] Ensure usage search covers `.html`, `.ts`, `.js`, and inline templates.

## Phase 11 - Snippets

- [x] Add snippets equivalent to the Angular 1.x snippet set:
      `ngcomponent`,
      `ngconfig`,
      `ngconstant`,
      `ngcontroller`,
      `ngdirective`,
      `ngfactory`,
      `ngfilter`,
      `ngmodule`,
      `ngprovider`,
      `ngrun`,
      and `ngservice`.
- [x] Update snippet bodies for AngularTS naming, imports, and preferred typing.
- [x] Add snippets for:
      `templateUrl` component,
      inline-template component,
      typed bindings,
      DI array,
      `$inject`,
      HTTP directive usage,
      Wasm directive usage,
      and web-component wrapper usage.
- [x] Add snippet tests or static validation that every snippet expands as
      valid TypeScript/JavaScript where applicable.

## Phase 12 - Component Creation Utility

- [x] Add context-menu command:
      `AngularTS: Create Component`.
- [x] Support generating:
      component TypeScript/JavaScript file,
      HTML template,
      optional CSS file,
      test stub,
      and module registration.
- [x] Infer target module from the selected file or nearest registration.
- [x] Prompt only for values that cannot be inferred:
      component name,
      template style,
      and destination directory.
- [x] Generate kebab-case tag names and camelCase registration names.
- [x] Open generated files after creation.
- [x] Add tests for generated file contents.

## Phase 13 - Packaging And Release

- [ ] Add a root-level script or Make target to build the VS Code extension.
- [ ] Add extension README with:
      feature list,
      screenshots or GIF placeholders,
      settings,
      commands,
      limitations,
      and AngularTS version compatibility.
- [ ] Add `CHANGELOG.md`.
- [ ] Add marketplace metadata:
      display name,
      icon,
      categories,
      keywords,
      repository,
      license,
      and extension kind.
- [ ] Package with `vsce`.
- [ ] Smoke-test the `.vsix` in a clean VS Code profile.
- [ ] Add release checklist for publishing and version bumps.

## Testing Matrix

- [x] Unit-test catalog generation.
- [x] Unit-test AngularTS registration extraction.
- [x] Unit-test directive/component/filter name normalization.
- [x] Unit-test expression region extraction.
- [x] Unit-test diagnostics.
- [ ] LSP-test completion, hover, definition, signature help, and references.
- [ ] VS Code integration-test snippets and commands.
- [ ] Fixture-test TypeScript projects.
- [ ] Fixture-test JavaScript projects.
- [ ] Fixture-test no-`tsconfig` projects.
- [ ] Fixture-test multi-root workspaces.
- [ ] Fixture-test inline templates.
- [ ] Fixture-test external `.html` templates.

## MVP Order

- [x] Scaffold the extension and tests.
- [x] Build the built-in directive catalog.
- [x] Ship standard directive completion, hover docs, and go to definition.
- [x] Add inline template detection.
- [x] Add custom directive/component indexing.
- [x] Add custom directive/component completion, hover, and go to definition.
- [x] Add `templateUrl`, controller, and service navigation.
- [x] Add expression diagnostics.
- [x] Add DI diagnostics.
- [ ] Add snippets and component generation.

## Open Decisions

- [ ] Decide whether the language engine should be a full LSP server or VS Code
      extension-host providers until cross-editor support is needed.
- [ ] Decide whether built-in docs are generated from TSDoc, handwritten
      curated Markdown, or a hybrid catalog.
- [ ] Decide whether AngularJS compatibility mode is enabled by default or only
      by explicit setting.
- [ ] Decide whether diagnostics should be workspace-wide by default or limited
      to open files for initial performance.
- [ ] Decide how much expression parsing should reuse AngularTS parser internals
      versus a lightweight editor-only parser.
- [ ] Decide whether generated component files should follow a fixed AngularTS
      convention or read project-local templates from settings.
