use angular_ts::{angular_module, component, service, NgModule};

#[cfg(target_arch = "wasm32")]
use js_sys::{Array, JsString, Object, Reflect};
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

    pub fn toggle(&mut self, index: usize) -> bool {
        let Some(todo) = self.todos.get_mut(index) else {
            return false;
        };

        let done = !todo.done();
        todo.set_done(done);
        true
    }

    pub fn archive_done(&mut self) {
        self.todos.retain(|todo| !todo.done());
    }

    pub fn remaining_count(&self) -> usize {
        self.todos.iter().filter(|todo| !todo.done()).count()
    }

    pub fn todos(&self) -> &[Todo] {
        &self.todos
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
#[derive(Debug)]
pub struct WasmScope {
    value: js_sys::Object,
}

#[cfg(target_arch = "wasm32")]
impl Default for WasmScope {
    fn default() -> Self {
        Self {
            value: Object::new(),
        }
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl WasmScope {
    #[wasm_bindgen(constructor)]
    pub fn new(value: js_sys::Object) -> Self {
        Self { value }
    }

    /// Gets a property by name from the wrapped scope value.
    pub fn get(&self, path: &str) -> JsValue {
        if path.is_empty() {
            return JsValue::UNDEFINED;
        }

        let mut current = self.value.clone().into();
        for key in path.split('.').filter(|part| !part.is_empty()) {
            match Reflect::get(&current, &JsString::from(key).into()) {
                Ok(value) if !value.is_undefined() => current = value,
                _ => return JsValue::UNDEFINED,
            }
        }

        current
    }

    /// Sets a property by name on the wrapped scope value.
    pub fn set(&self, path: &str, value: JsValue) {
        let mut current = self.value.clone().into();
        let keys: Vec<&str> = path.split('.').filter(|key| !key.is_empty()).collect();

        if keys.is_empty() {
            return;
        }

        for key in &keys[..keys.len() - 1] {
            let key = JsValue::from_str(*key);
            let existing = Reflect::get(&current, &key).unwrap_or(JsValue::UNDEFINED);

            let next = if existing.is_object() {
                existing
            } else {
                let created = Object::new();
                let _ = Reflect::set(&current, &key, &created);
                created.into()
            };

            current = next;
        }

        let final_key = JsValue::from_str(keys[keys.len() - 1]);
        let _ = Reflect::set(&current, &final_key, &value);
    }
}

#[derive(Debug, Default)]
#[component(selector = "todo-list", template_url = "templates/todo-list.html")]
pub struct TodoList {
    #[inject(token = "todoStore")]
    store: Option<TodoStore>,
    #[cfg(target_arch = "wasm32")]
    #[inject(token = "$scope")]
    _scope: WasmScope,
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
    fn parse_todos_from_js(value: &JsValue) -> Vec<Todo> {
        if !Array::is_array(value) {
            return Vec::new();
        }

        Array::from(value)
            .iter()
            .map(|item| {
                let task = Reflect::get(&item, &JsString::from("task").into())
                    .ok()
                    .and_then(|task| task.as_string())
                    .unwrap_or_default();
                let done = Reflect::get(&item, &JsString::from("done").into())
                    .ok()
                    .and_then(|done| done.as_bool())
                    .unwrap_or(false);

                let mut todo = Todo::new(task);
                todo.set_done(done);
                todo
            })
            .collect()
    }

    fn add(&mut self, title: String) {
        self.inner.add(title);
    }

    fn set_done(&mut self, index: usize, done: bool) {
        self.inner.set_done(index, done);
    }

    fn toggle(&mut self, index: usize) -> bool {
        self.inner.toggle(index)
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
    scope: WasmScope,
    remaining_count: usize,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(js_class = __ng_component_TodoList)]
impl TodoListController {
    #[wasm_bindgen(constructor)]
    pub fn new(store: TodoStoreService, scope: WasmScope) -> Self {
        let items = store.items_array();

        let mut controller = Self {
            store,
            items,
            scope,
            remaining_count: 0,
        };

        controller.refresh();
        controller
    }

    #[wasm_bindgen(getter)]
    pub fn items(&self) -> Array {
        self.items.clone()
    }

    #[wasm_bindgen(js_name = remainingCount)]
    pub fn remaining_count(&self) -> u32 {
        self.remaining_count as u32
    }

    #[wasm_bindgen(js_name = add)]
    pub fn add(&mut self, title: String) {
        let title = title.trim();
        if title.is_empty() {
            return;
        }

        self.store.add(title.to_string());
        self.refresh();
        self.scope.set("newTodo", "".into());
    }

    #[wasm_bindgen(js_name = setDone)]
    pub fn set_done(&mut self, index: usize, done: bool) {
        self.store.set_done(index, done);
        self.refresh();
    }

    #[wasm_bindgen(js_name = toggle)]
    pub fn toggle(&mut self, index: usize) {
        if self.store.toggle(index) {
            self.refresh();
        }
    }

    pub fn archive(&mut self) {
        self.store.archive_done();
        self.refresh();
    }

    #[wasm_bindgen(js_name = applyItemsFromScope)]
    pub fn apply_items_from_scope(&mut self, value: JsValue) {
        self.store.inner.todos = TodoStoreService::parse_todos_from_js(&value);
        self.refresh();
    }

    fn refresh(&mut self) {
        self.items = self.store.items_array();
        self.remaining_count = self.store.inner.remaining_count();
        self.scope.set("items", self.items.clone().into());
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
            TemplateSource::Url(template) if template.contains("templates/todo-list.html")
        ));
        assert_eq!(TodoList::METADATA.injections().len(), 2);
        assert_eq!(TodoList::METADATA.injections()[0].field(), "store");
        assert_eq!(TodoList::METADATA.injections()[0].token(), "todoStore");
        assert_eq!(
            TodoList::METADATA.injections()[0].rust_type(),
            "Option<TodoStore>"
        );
        assert_eq!(TodoList::METADATA.injections()[1].field(), "_scope");
        assert_eq!(TodoList::METADATA.injections()[1].token(), "$scope");
        assert_eq!(TodoList::METADATA.injections()[1].rust_type(), "WasmScope");
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
        assert_eq!(store.remaining_count(), 3);

        assert!(store.set_done(1, true));
        assert!(!store.set_done(99, true));
        assert_eq!(store.remaining_count(), 2);
        store.archive_done();

        assert_eq!(
            store.todos().iter().map(Todo::task).collect::<Vec<_>>(),
            vec!["Learn AngularTS", "Ship Rust integration"]
        );
        assert_eq!(store.remaining_count(), 2);
    }
}
