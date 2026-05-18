# Kotlin Binding Generation Roadmap

This roadmap tracks the Kotlin raw facade generator. The generator is the
low-level JavaScript boundary; the safe authoring API remains handwritten.

## Current Status

- Generated output exists at
  `src/jsMain/kotlin/angular/ts/generated/NgFacades.kt`.
- `tool/generate_kotlin_bindings.mjs` creates deterministic external facade
  interfaces for every public `ng` namespace type.
- `tool/check_generated_bindings.mjs` fails when generated output is stale.
- Public members are generated as raw Kotlin/JS declarations with primitive
  type mapping where TypeScript exposes safe primitives.
- Override metadata supports renames, manual members, unsupported members,
  callable properties, return type fixes, and type mapping hooks.

## Next Steps

1. Add type mapping overrides for Kotlin browser/platform types.
2. Improve callback and array mappings beyond raw `dynamic`.
3. Use generated raw facades as bases/delegates for handwritten ergonomic
   wrappers.
4. Keep handwritten DSL surfaces in `angular.ts`, and keep raw generated
   facades isolated in `angular.ts.generated`.

## Gates

```sh
make -C integrations/kotlin generate
make -C integrations/kotlin generate-check
make -C integrations/kotlin check
```
