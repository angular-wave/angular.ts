---
title: 'Scala.js'
weight: 60
description:
  'Create an sbt Scala.js application with typed AngularTS models, controllers,
  a linked browser bundle, and the matching runtime.'
---

The Scala artifact provides typed facades and idiomatic builders. Scala.js links
the application; `@angular-wave/angular.ts` remains the browser runtime. Keep
the Maven and npm versions equal.

## Before you start

Install JDK 21, sbt, and Node.js. Start with `project/plugins.sbt`, `build.sbt`,
`src/main/scala`, and an HTML entry page.

## Enable Scala.js

Add the Scala.js plugin:

<!-- tested-by: src/docs-examples/integration-setup.test.ts, integrations/scala/test/basic_app.test.ts -->
```text
addSbtPlugin("org.scala-js" % "sbt-scalajs" % "1.17.0")
```

Enable the plugin and add the facade with `%%%`. sbt expands the standard
Scala.js and Scala binary suffixes automatically.

<!-- tested-by: src/docs-examples/integration-setup.test.ts, integrations/scala/test/basic_app.test.ts -->
```text
scalaVersion := "3.3.3"
enablePlugins(ScalaJSPlugin)

libraryDependencies +=
  "io.github.angular-wave" %%% "angular-ts-scala" % "0.35.0"

scalaJSUseMainModuleInitializer := true
```

## Register and bootstrap the application

Model tokens can be registered directly as controllers; no identity factory is
needed.

<!-- tested-by: src/docs-examples/integration-setup.test.ts, integrations/scala/test/basic_app.test.ts -->
```text
package todo

import angular.ts.*
import org.scalajs.dom.document
import scala.scalajs.js

final class TodoModel(var newTodo: String = "") extends js.Object

object App:
  @main def main(): Unit =
    val app = AngularTS.createModule("todo")
    val model = AngularTS.token[Model[TodoModel]]("todoModel")

    app
      .model(model, () => new TodoModel())
      .controller("TodoCtrl", model)

    AngularTS.bootstrap(document.body, Seq(app.name))
```

Use classes extending `js.Object` for values that cross into AngularTS. Keep
ordinary Scala domain types behind that boundary.

## Load the browser runtime

Load AngularTS before the linked Scala.js output:

<!-- tested-by: src/docs-examples/integration-setup.test.ts, integrations/scala/test/basic_app.test.ts -->
```html
<main ng-controller="TodoCtrl as ctrl">
  <input ng-model="ctrl.newTodo" />
</main>
<script src="angular-ts.umd.js"></script>
<script src="main.js"></script>
```

Run `sbt fastLinkJS` while developing and `sbt fullLinkJS` for production. Point
the page at the generated `main.js` and serve it over HTTP.

## Production practices

- Prefer typed tokens, builders, and injection helpers over `js.Dynamic`.
- Keep AngularTS models as the shared reactive boundary rather than mirroring
  state into DOM-root scopes.
- Replace Scala collections with `js.Array` only where the browser-facing model
  requires JavaScript collection semantics.
- Use `fullLinkJS` and test the linked output against the release runtime.
- Keep the Scala.js artifact and AngularTS runtime on the same version.

## Complete example

Use `integrations/scala/examples/basic_app` as a complete sbt todo project, or
browse all [integration examples](../examples/).
