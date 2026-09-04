# AngularTS for Gleam

Use AngularTS from Gleam with typed modules, dependency injection, components,
and application startup.

## Install

```sh
gleam add angular_ts
```

The package targets JavaScript. Load `@angular-wave/angular.ts` before the
compiled Gleam output and keep both packages on the same version.

## Register a component

```gleam
import angular_ts as ng
import angular_ts/component
import angular_ts/module

fn controller() {
  Nil
}

pub fn main() {
  ng.create_module("gleamDemo")
  |> module.component(
    "helloCard",
    component.new("<p>Hello from Gleam</p>", ng.inject0(controller)),
  )
  |> ng.bootstrap_body
}
```

Build with `gleam build --target javascript`, include the generated JavaScript
in the page, and serve the page over HTTP. Keep foreign JavaScript functions at
the integration boundary and prefer typed package functions in application
code.

See `examples/basic_app` for a complete project with a component, injected
store, and custom element.
