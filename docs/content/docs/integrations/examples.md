---
title: Executable integration examples
description:
  Locate and validate the maintained example application for every language
  integration.
weight: 15
---

Every integration guide is backed by a repository example or browser acceptance
test. Documentation parity verifies these artifacts remain present; integration
CI compiles and exercises them.

| Integration      | Executable evidence                                  |
| ---------------- | ---------------------------------------------------- |
| Closure Compiler | `integrations/closure/demo/index.html`               |
| ClojureScript    | `integrations/closure/clojurescript/demo/index.html` |
| Java/J2CL        | `integrations/closure/java/demo/index.html`          |
| Kotlin/JS        | `integrations/kotlin/examples/basic_app`             |
| Scala.js         | `integrations/scala/examples/basic_app`              |
| Dart             | `integrations/dart/example/basic_app`                |
| Gleam            | `integrations/gleam/examples/basic_app`              |
| AssemblyScript   | `integrations/wasm/assemblyscript/examples/todo`     |
| C                | `integrations/wasm/c/examples/todo`                  |
| C++              | `integrations/wasm/cpp/examples/todo`                |
| C#/.NET          | `integrations/wasm/csharp/examples/todo`             |
| Go               | `integrations/wasm/go/examples/basic_app`            |
| Rust             | `integrations/wasm/rust/tests/todo_basic.test.ts`    |
| Zig              | `integrations/wasm/zig/examples/todo`                |

Run all maintained integration checks:

```bash
make test-integrations
```

When changing a binding, run its generation and local checks first, then the
aggregate command. Never copy generated declarations between integrations by
hand.
