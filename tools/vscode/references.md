# AngularTS VS Code References

This file records extension behavior to compare while building the AngularTS
extension.

## AngularJS Extension Behaviors To Preserve

- [AngularJS Go To Definition Support](https://marketplace.visualstudio.com/items?itemName=camjocotem.angular-js-go-to-definition-extension)
  focuses on navigating from custom AngularJS directives/components in HTML to
  implementation files. This validates prioritizing custom directive/component
  definition support early.
- [AngularJS Code Snippets](https://marketplace.visualstudio.com/items?itemName=nicholashsiang.vscode-angularjs-snippet)
  documents snippet coverage for directives, components, controllers, services,
  providers, filters, config, and run blocks.

- Complete built-in `ng-*` attributes in HTML attribute positions.
- Complete custom directives and components by reading workspace registrations.
- Normalize camelCase registration names to kebab-case HTML names.
- Show hover documentation for standard and custom directives.
- Navigate from template usage to `.directive()`, `.component()`,
  `.filter()`, `.controller()`, and service registrations.
- Validate dependency-injection arrays and `$inject` assignments.
- Provide AngularJS 1.x snippets for common module, component, directive,
  controller, service, factory, provider, filter, config, and run blocks.

## HTMX Extension Behaviors To Preserve

- [HTMX Toolkit](https://marketplace.visualstudio.com/items?itemName=atoolz.htmx-vscode-toolkit)
  emphasizes rich hover tooltips, descriptions, valid values, modifiers,
  examples, and links to official docs.
- [hx-complete](https://marketplace.visualstudio.com/items?itemName=pfeif.hx-complete)
  explicitly includes `data-*` attribute support, which maps well to
  AngularTS's `data-ng-*` aliases.
- [HTMX IntelliSense](https://marketplace.visualstudio.com/items?itemName=sameer-dudeja.htmx-intellisense)
  combines completion, hover, syntax highlighting, snippets, and version
  compatibility settings.

- Keep HTML completions attribute-first and concise.
- Put practical documentation in completion details and hover content.
- Prefer diagnostics that explain invalid attributes or values at the template
  site.
- Avoid heavy project setup before the first useful HTML completions appear.

## AngularTS-Specific Decisions

- Built-in documentation should prefer AngularTS source and `.d.ts` declarations
  over legacy AngularJS wording.
- Compatibility-only AngularJS syntax should be behind
  `angularTs.includeAngularJsCompatibility`.
- Standard directive documentation is the first release priority.
