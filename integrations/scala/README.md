# AngularTS for Scala.js

Use AngularTS from Scala with typed modules, models, injection tokens,
controllers, services, and scopes.

## Requirements

Install JDK 21, sbt, and Node.js. Enable Scala.js in the application:

```scala
addSbtPlugin("org.scala-js" % "sbt-scalajs" % "1.17.0")
```

Add the facade with `%%%`, which selects the Scala.js and Scala binary suffixes:

```scala
scalaVersion := "3.3.3"
enablePlugins(ScalaJSPlugin)

libraryDependencies +=
  "io.github.angular-wave" %%% "angular-ts-scala" % "0.35.0"

scalaJSUseMainModuleInitializer := true
```

Keep this artifact and `@angular-wave/angular.ts` on the same version.

## Register and start

```scala
package todo

import angular.ts.*
import org.scalajs.dom.document
import scala.scalajs.js

final class TodoModel(var newTodo: String = "") extends js.Object

object App:
  @main def main(): Unit =
    val app = AngularTS.createModule("todo")
    val model = AngularTS.token[Model[TodoModel]]("todoModel")

    app.model(model, () => new TodoModel())
      .controller("TodoCtrl", model)

    AngularTS.bootstrap(document.body, Seq(app.name))
```

Load AngularTS before the linked Scala.js file. Use `sbt fastLinkJS` during
development and `sbt fullLinkJS` for production. Keep values that cross into
AngularTS as `js.Object` or JavaScript collections; ordinary Scala domain types
can remain behind that boundary.

See `examples/basic_app` for a complete todo project.
