package angular.ts.examples.basic

import angular.ts.*
import org.scalajs.dom.document
import org.scalajs.dom.HTMLElement
import scala.scalajs.js

final class GreetingController(val message: String) extends js.Object

final class InterpolationScope(val value: String) extends js.Object

final class PanelScope(val message: String) extends js.Object

final class NativeCardScope(var status: String) extends js.Object

final class NativeCardElement extends ScopeElement[NativeCardScope]:
  override def connected(): js.UndefOr[js.Function0[Unit]] =
    scope.status = "Native ScopeElement from Scala.js"
    js.undefined

object BasicApp:
  @main def main(): Unit =
    val app = AngularTS.module("scalaBasicApp")
    val greeting = AngularTS.token[String]("greeting")
    val nativeCardClass =
      js.constructorOf[NativeCardElement].asInstanceOf[js.Dynamic]

    nativeCardClass.updateDynamic("template")(
      """<section>
        |  <p data-testid="scala-native-card">{{status}}</p>
        |</section>""".stripMargin,
    )
    nativeCardClass.updateDynamic("scope")(new NativeCardScope("connecting"))

    app
      .value(greeting, "Hello from Scala.js")
      .component(
        "scalaGreeting",
        Component(
          template =
            """<section>
              |  <p data-testid="scala-greeting">{{$ctrl.message}}</p>
              |</section>""".stripMargin,
          controller = AngularTS.inject2(greeting, Tokens.interpolate) {
            (value, interpolate) =>
              val message = interpolate("Interpolated {{value}}")
                .map(fn => fn(new InterpolationScope(value), js.undefined).toString)
                .getOrElse(value)

              new GreetingController(message)
          },
        ),
      )
      .component(
        "scalaLabel",
        Component(
          template =
            """<section>
              |  <p data-testid="scala-bound">{{$ctrl.label}}</p>
              |</section>""".stripMargin,
          bindings = Map("label" -> "@"),
        ),
      )
      .directive(
        "scalaMark",
        Directive(
          restrict = DirectiveRestrict.Attribute,
          link = (_scope: Scope, element: HTMLElement) =>
            element.setAttribute("data-scala-linked", "true"),
        ),
      )
      .appComponent(
        "scala-panel",
        AppComponentOptions[PanelScope](
          template =
            """<section>
              |  <p data-testid="scala-panel">{{message}}</p>
              |</section>""".stripMargin,
          scope = new PanelScope("App component from Scala.js"),
          isolate = true,
        ),
      )
      .webComponent(
        "scala-native-card",
        js.constructorOf[NativeCardElement]
          .asInstanceOf[ScopeElementConstructor[NativeCardScope]],
      )

    val _ = AngularTS.bootstrap(document.body, Seq(app.name))
