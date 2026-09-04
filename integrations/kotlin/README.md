# AngularTS for Kotlin/JS

Use AngularTS from Kotlin with typed modules, injection tokens, components,
directives, services, and scopes.

## Availability

The Kotlin binding is currently distributed as source. Add this directory as a
Gradle project dependency and use `examples/basic_app` as the project structure.
The application must also load the matching `@angular-wave/angular.ts` runtime.

## Gradle setup

Enable Kotlin/JS IR with a browser target and executable binary. Add the binding
project to `jsMain`; its Gradle path depends on where the source binding is
included in your build. The complete settings and dependency are in
`examples/basic_app`.

Register modules with `ng.createModule(...)`, use typed tokens for dependencies,
and call `ng.bootstrap(...)` after choosing the element owned by the module.
Prefer typed Kotlin wrappers over `dynamic`, and keep JavaScript interop at the
edge of the application.

Build the production Kotlin/JS output and test it with the same AngularTS bundle
used in deployment. See `examples/basic_app` for a complete todo project and
`examples/web_components` for custom elements.
