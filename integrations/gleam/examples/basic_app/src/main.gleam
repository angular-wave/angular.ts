import angular_ts as ng
import angular_ts/component
import angular_ts/module
import angular_ts/web_component

type TodoStore {
  TodoStore(items: List(String))
}

fn new_store() -> TodoStore {
  TodoStore(["Learn AngularTS", "Build a Gleam app"])
}

fn controller(_store: TodoStore) {
  Nil
}

pub fn main() {
  let app = ng.module("gleamDemo")
  let todo_store = ng.token("todoStore")

  app
  |> module.factory(todo_store, ng.inject0(new_store))
  |> module.component(
    "todoList",
    component.new(
      "
        <section class=\"todo-app\">
          <p>Gleam AngularTS integration loaded.</p>
        </section>
      ",
      ng.inject1(todo_store, controller),
    ),
  )
  |> module.web_component(
    "gleam-status",
    web_component.new("<strong>{{ status }}</strong>")
      |> web_component.input("status", web_component.input_string()),
  )
  |> ng.bootstrap_body
}
