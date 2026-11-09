# Typed scope state conformance

Run `make -C integrations/reactivity test` from the repository root. This requires
Gleam, Node.js, JDK 21, sbt, and Playwright Chromium.

The target compiles real Gleam records and Scala.js case classes, then exercises
them in Chromium with the source AngularTS runtime. Tests cover live typed state
identity, immutable replacement notifying watches and DOM bindings, unchanged
reference assignment, and Scala getter-only fields rejecting mutation. These are
ordinary JavaScript scopes, not WASM scopes or stand-in JavaScript proxies.

Scala case-class fields read by templates explicitly use `@JSExport`; ordinary
Scala members do not automatically become public JavaScript properties. Frozen
object-valued data properties are a separate Proxy-invariant concern and are not
covered by this contract.
