# AngularTS for Gleam

Add typed AngularTS behavior to server-rendered pages with Gleam. The package
covers modules, dependency injection, components, HTTP, routing, storage, and
application startup.

## Install

```sh
npm install @angular-wave/angular.ts
gleam add angular_ts
```

The package targets JavaScript. Load the AngularTS runtime before the compiled
Gleam output and keep the npm and Gleam packages on the same version.

## First component

```gleam
import angular_ts as ng
import angular_ts/component
import angular_ts/module

fn controller() { Nil }

pub fn main() {
  ng.create_module("gleamDemo")
  |> module.component(
    "welcomeCard",
    component.new("<p>Welcome</p>", ng.inject0(controller)),
  )
  |> ng.bootstrap_body
}
```

Build with `gleam build --target javascript`, include the generated JavaScript
after AngularTS, and serve the page over HTTP. Start with server-rendered HTML;
use Gleam components for the parts that need client-side state.

The `examples/basic_app` directory contains a complete todo application with
an injected store, component, HTML page, and build setup. The full AngularTS
guide is linked from the package sidebar.

## Access shared models

After bootstrap, `ng.get_model("cart")` or `runtime.get_model("cart")` lazily
retrieves a registered reactive model. The result is a `namespace.Model(Dynamic)`
handle; use the existing `angular_ts/unsafe` interop helpers to read or mutate
its JavaScript fields. Both getters preserve the proxy shared with dependency
injection, so writes update observing views. Unknown names, ordinary services,
and uninitialized or destroyed apps throw runtime errors.
