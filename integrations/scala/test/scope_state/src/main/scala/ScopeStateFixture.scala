package angular.ts.scopestate

import angular.ts.Scope
import angular.ts.Scope.*
import scala.scalajs.js
import scala.scalajs.js.annotation.{JSExport, JSExportTopLevel}

final case class Todo(@JSExport title: String, @JSExport done: Boolean)

@js.native
trait TodoState extends js.Object:
  var task: Todo = js.native

object ScopeStateFixture:
  @JSExportTopLevel("createTodo")
  def createTodo(): Todo = Todo("Immutable todo", false)

  @JSExportTopLevel("replaceTodo")
  def replaceTodo(scope: Scope): Unit =
    val state = scope.state[TodoState]
    state.task = state.task.copy(done = true)

  @JSExportTopLevel("stateHandle")
  def stateHandle(scope: Scope): js.Object = scope.state[TodoState]
