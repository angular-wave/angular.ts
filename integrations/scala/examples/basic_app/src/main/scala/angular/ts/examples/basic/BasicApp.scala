package angular.ts.examples.basic

import angular.ts.*
import org.scalajs.dom.document
import scala.scalajs.js

final class Todo(val task: String, var done: Boolean = false) extends js.Object

final class TodoModel(
    var newTodo: String = "",
    var tasks: js.Array[Todo] = js.Array(
      new Todo("Learn AngularTS from Scala.js"),
      new Todo("Compile with Scala.js"),
    ),
) extends js.Object:
  def add(): Unit =
    val task = newTodo.trim

    if task.nonEmpty then
      tasks = tasks.concat(js.Array(new Todo(task)))
      newTodo = ""

  def archive(): Unit =
    tasks = tasks.filter(todo => !todo.done)

object BasicApp:
  @main def main(): Unit =
    val app = AngularTS.module("scalaTodo")
    val todoModel = AngularTS.token[Model[TodoModel]]("todoModel")

    app
      .model(todoModel, () => new TodoModel())
      .controller("TodoCtrl", todoModel)

    val _ = AngularTS.bootstrap(document.body, Seq(app.name))
