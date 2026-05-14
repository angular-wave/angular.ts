use angular_ts::{angular_module, component, service, NgModule};

#[cfg(target_arch = "wasm32")]
use js_sys::Array;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Todo {
    task: String,
    done: bool,
}

impl Todo {
    pub fn new(task: impl Into<String>) -> Self {
        Self {
            task: task.into(),
            done: false,
        }
    }

    pub fn task(&self) -> &str {
        &self.task
    }

    pub fn done(&self) -> bool {
        self.done
    }

    pub fn set_done(&mut self, done: bool) {
        self.done = done;
    }
}

#[derive(Debug)]
#[service]
pub struct TodoStore {
    todos: Vec<Todo>,
}

impl Default for TodoStore {
    fn default() -> Self {
        Self::new()
    }
}

impl TodoStore {
    pub fn new() -> Self {
        Self {
            todos: vec![
                Todo::new("Learn AngularTS"),
                Todo::new("Build an AngularTS app"),
            ],
        }
    }

    pub fn add(&mut self, title: impl Into<String>) -> Option<&Todo> {
        let task = title.into().trim().to_string();

        if task.is_empty() {
            return None;
        }

        self.todos.push(Todo::new(task));
        self.todos.last()
    }

    pub fn set_done(&mut self, index: usize, done: bool) -> bool {
        let Some(todo) = self.todos.get_mut(index) else {
            return false;
        };

        todo.set_done(done);
        true
    }

    pub fn archive_done(&mut self) {
        self.todos.retain(|todo| !todo.done());
    }

    pub fn todos(&self) -> &[Todo] {
        &self.todos
    }
}

#[derive(Debug, Default)]
#[component(
    selector = "todo-list",
    template = r#"
      <section class="todo-app">
        <button type="button" ng-click="ctrl.archive()">Archive</button>

        <ul class="todo-items">
          <li
            class="todo-row"
            ng-repeat="todo in ctrl.items"
            ng-class="{done: todo.done}"
          >
            <span>{{ todo.task }} {{ todo.done }}</span>
            <label>
              <input
                type="checkbox"
                ng-model="todo.done"
                ng-change="ctrl.setDone($index, todo.done)"
              />
            </label>
          </li>
        </ul>

        <form class="todo-entry" ng-submit="ctrl.add(newTodo)">
          <input
            aria-label="Todo title"
            type="text"
            ng-model="newTodo"
            ng-required="true"
          />
          <button type="submit">Add</button>
        </form>
      </section>
    "#
)]
pub struct TodoList {
    #[inject(token = "todoStore")]
    store: Option<TodoStore>,
}

impl TodoList {
    pub fn has_injected_store(&self) -> bool {
        self.store.is_some()
    }
}

#[angular_module(name = "rustDemo")]
pub fn app(module: &mut NgModule) {
    module.service::<TodoStore>().component::<TodoList>();
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub struct TodoItem {
    task: String,
    done: bool,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl TodoItem {
    #[wasm_bindgen(getter)]
    pub fn task(&self) -> String {
        self.task.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn done(&self) -> bool {
        self.done
    }

    #[wasm_bindgen(setter)]
    pub fn set_done(&mut self, done: bool) {
        self.done = done;
    }
}

#[cfg(target_arch = "wasm32")]
impl From<&Todo> for TodoItem {
    fn from(todo: &Todo) -> Self {
        Self {
            task: todo.task().to_string(),
            done: todo.done(),
        }
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub struct TodoStoreService {
    inner: TodoStore,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl TodoStoreService {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: TodoStore::new(),
        }
    }
}

#[cfg(target_arch = "wasm32")]
impl TodoStoreService {
    fn add(&mut self, title: String) {
        self.inner.add(title);
    }

    fn set_done(&mut self, index: usize, done: bool) {
        self.inner.set_done(index, done);
    }

    fn archive_done(&mut self) {
        self.inner.archive_done();
    }

    fn items_array(&self) -> Array {
        self.inner
            .todos()
            .iter()
            .map(TodoItem::from)
            .map(JsValue::from)
            .collect()
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(js_name = __ng_service_TodoStore)]
pub fn ng_service_todo_store() -> TodoStoreService {
    TodoStoreService::new()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(js_name = __ng_component_TodoList)]
pub struct TodoListController {
    store: TodoStoreService,
    items: Array,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(js_class = __ng_component_TodoList)]
impl TodoListController {
    #[wasm_bindgen(constructor)]
    pub fn new(store: TodoStoreService) -> Self {
        let items = store.items_array();

        Self { store, items }
    }

    #[wasm_bindgen(getter)]
    pub fn items(&self) -> Array {
        self.items.clone()
    }

    #[wasm_bindgen(js_name = add)]
    pub fn add(&mut self, title: String) {
        self.store.add(title);
        self.refresh();
    }

    #[wasm_bindgen(js_name = setDone)]
    pub fn set_done(&mut self, index: usize, done: bool) {
        self.store.set_done(index, done);
        self.refresh();
    }

    pub fn archive(&mut self) {
        self.store.archive_done();
        self.refresh();
    }

    fn refresh(&mut self) {
        self.items = self.store.items_array();
    }
}

#[cfg(test)]
mod tests {
    use angular_ts::{ComponentController, RegistrationKind, Service, TemplateSource};

    use super::*;

    #[test]
    fn app_collects_initial_registrations() {
        let mut module = NgModule::new("rustDemo");

        app(&mut module);

        assert_eq!(module.name(), "rustDemo");
        assert_eq!(module.registrations().len(), 2);
        assert_eq!(module.registrations()[0].kind, RegistrationKind::Service);
        assert_eq!(module.registrations()[0].angular_name, "todoStore");
        assert_eq!(
            module.registrations()[0].export_name,
            "__ng_service_TodoStore"
        );
        assert_eq!(module.registrations()[1].kind, RegistrationKind::Component);
        assert_eq!(module.registrations()[1].angular_name, "todoList");
        assert_eq!(
            module.registrations()[1].export_name,
            "__ng_component_TodoList"
        );
    }

    #[test]
    fn angular_module_macro_generates_collector() {
        let module = __ng_collect_app();

        assert_eq!(module.name(), "rustDemo");
        assert_eq!(module.registrations().len(), 2);
    }

    #[test]
    fn macros_generate_strict_metadata() {
        assert_eq!(TodoStore::TOKEN_NAME, "todoStore");
        assert_eq!(TodoStore::EXPORT_NAME, "__ng_service_TodoStore");
        assert_eq!(TodoList::METADATA.selector(), "todo-list");
        assert_eq!(TodoList::NAME, "todoList");
        assert_eq!(TodoList::EXPORT_NAME, "__ng_component_TodoList");
        assert!(matches!(
            TodoList::METADATA.template(),
            TemplateSource::Inline(template) if template.contains("ctrl.archive()") && template.contains("todo in ctrl.items")
        ));
        assert_eq!(TodoList::METADATA.injections().len(), 1);
        assert_eq!(TodoList::METADATA.injections()[0].field(), "store");
        assert_eq!(TodoList::METADATA.injections()[0].token(), "todoStore");
        assert_eq!(
            TodoList::METADATA.injections()[0].rust_type(),
            "Option<TodoStore>"
        );
    }

    #[test]
    fn todo_store_matches_dart_demo_behavior() {
        let mut store = TodoStore::new();

        assert_eq!(
            store.todos().iter().map(Todo::task).collect::<Vec<_>>(),
            vec!["Learn AngularTS", "Build an AngularTS app"]
        );

        assert!(store.add("  Ship Rust integration  ").is_some());
        assert!(store.add("   ").is_none());
        assert_eq!(store.todos().len(), 3);

        assert!(store.set_done(1, true));
        assert!(!store.set_done(99, true));
        store.archive_done();

        assert_eq!(
            store.todos().iter().map(Todo::task).collect::<Vec<_>>(),
            vec!["Learn AngularTS", "Ship Rust integration"]
        );
    }
}
