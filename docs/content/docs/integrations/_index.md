---
title: Integrations
weight: 170
description:
  'Use AngularTS from supported JVM, JavaScript-targeting, native, and
  WebAssembly language ecosystems.'
---

AngularTS is one browser runtime with generated or maintained bindings for
Closure, ClojureScript, Java/J2CL, Kotlin, Scala.js, Dart, Gleam, Rust, and
WebAssembly-facing environments.

Begin with the [integration
model]({{< relref "/docs/integrations/choosing" >}}). Each integration should
expose the same public namespace concepts while using its language's normal
module, type, and build conventions.

The Java and ClojureScript artifacts are published to Maven for Maven-compatible
consumers. The npm package remains the browser runtime used by applications.

## Browser-language integrations

- [ClojureScript]({{< relref "/docs/integrations/clojurescript" >}})
- [Closure Compiler]({{< relref "/docs/integrations/closure" >}})
- [Dart]({{< relref "/docs/integrations/dart" >}})
- [Gleam]({{< relref "/docs/integrations/gleam" >}})
- [Java and J2CL]({{< relref "/docs/integrations/java-j2cl" >}})
- [Kotlin/JS]({{< relref "/docs/integrations/kotlin" >}})
- [Scala.js]({{< relref "/docs/integrations/scala" >}})

## WebAssembly integrations

- [AssemblyScript]({{< relref "/docs/integrations/wasm-assemblyscript" >}})
- [C]({{< relref "/docs/integrations/wasm-c" >}})
- [C++]({{< relref "/docs/integrations/wasm-cpp" >}})
- [C# and .NET]({{< relref "/docs/integrations/wasm-csharp" >}})
- [Go]({{< relref "/docs/integrations/wasm-go" >}})
- [Rust]({{< relref "/docs/integrations/wasm-rust" >}})
- [Zig]({{< relref "/docs/integrations/wasm-zig" >}})
