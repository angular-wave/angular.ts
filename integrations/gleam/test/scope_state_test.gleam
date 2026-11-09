import angular_ts/scope
import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}
import gleeunit/should

pub type Todo {
  Todo(title: String, done: Bool)
}

pub type TodoState {
  TodoState(task: Todo)
}

pub fn create_todo() -> Todo {
  Todo("Immutable todo", False)
}

pub fn replace_todo(handle: Dynamic) -> Nil {
  let typed_scope: scope.Scope(TodoState) = scope.unsafe(handle)
  let original = scope.state(typed_scope).task
  let updated = Todo(..original, done: True)
  let _ = scope.set(typed_scope, "task", updated)
  Nil
}

pub fn state_handle(handle: Dynamic) -> Dynamic {
  let typed_scope: scope.Scope(TodoState) = scope.unsafe(handle)
  scope.state(typed_scope) |> unsafe.coerce
}

pub fn plain_scope_property_assignment_test() {
  let handle = unsafe.empty_object()
  let typed_scope: scope.Scope(TodoState) = scope.unsafe(handle)
  let updated_scope = scope.set(typed_scope, "task", create_todo())
  scope.state(updated_scope).task.done |> should.be_false
  handle
  |> unsafe.get_property("task")
  |> unsafe.from_dynamic
  |> should.equal(create_todo())
}

pub fn immutable_record_replacement_test() {
  let handle = unsafe.empty_object()
  let typed_scope: scope.Scope(TodoState) = scope.unsafe(handle)
  let original = create_todo()
  let _ = scope.set(typed_scope, "task", original)
  replace_todo(handle)
  original.done |> should.be_false
  scope.state(typed_scope).task.done |> should.be_true
  scope.state(typed_scope).task.title |> should.equal(original.title)
}
