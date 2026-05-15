use angular_ts::{
    angular_module, component, service, Controller, InjectionMetadata, NgModule, Value,
};

#[cfg(target_arch = "wasm32")]
use angular_ts::{wasm_bridge, HttpResponse, HttpService};
#[cfg(target_arch = "wasm32")]
use js_sys::{Array, JsString, Object, Reflect};
#[cfg(target_arch = "wasm32")]
use serde::Deserialize;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Todo {
    id: usize,
    task: String,
    done: bool,
}

impl Todo {
    pub fn new(id: usize, task: impl Into<String>) -> Self {
        Self {
            id,
            task: task.into(),
            done: false,
        }
    }

    pub fn id(&self) -> usize {
        self.id
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
    next_id: usize,
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
                Todo::new(1, "Learn AngularTS"),
                Todo::new(2, "Build an AngularTS app"),
            ],
            next_id: 3,
        }
    }

    pub fn add(&mut self, title: impl Into<String>) -> Option<&Todo> {
        let task = title.into().trim().to_string();

        if task.is_empty() {
            return None;
        }

        let id = self.next_id;

        self.next_id += 1;
        self.todos.push(Todo::new(id, task));
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

    pub fn remaining_count(&self) -> usize {
        self.todos.iter().filter(|todo| !todo.done()).count()
    }

    pub fn todos(&self) -> &[Todo] {
        &self.todos
    }
}

pub struct AppTitle;

impl Value for AppTitle {
    const TOKEN_NAME: &'static str = "appTitle";
    const EXPORT_NAME: &'static str = "__ng_value_AppTitle";
}

pub struct DemoInfo;

impl Controller for DemoInfo {
    const NAME: &'static str = "demoInfo";
    const EXPORT_NAME: &'static str = "__ng_controller_DemoInfo";
    const INJECTIONS: &'static [InjectionMetadata] =
        &[InjectionMetadata::new("title", "appTitle", "String")];
}

#[derive(Default)]
#[component(selector = "todo-list", template_url = "templates/todo-list.html")]
pub struct TodoList {
    #[inject(token = "todoStore")]
    store: Option<TodoStore>,
    #[cfg(target_arch = "wasm32")]
    #[inject(token = "$http")]
    _http: Option<HttpService>,
}

impl TodoList {
    pub fn has_injected_store(&self) -> bool {
        self.store.is_some()
    }
}

#[angular_module(name = "rustDemo")]
pub fn app(module: &mut NgModule) {
    module
        .service::<TodoStore>()
        .value::<AppTitle>()
        .controller::<DemoInfo>()
        .component::<TodoList>();
}

#[cfg(target_arch = "wasm32")]
#[wasm_bridge]
pub struct TodoItem {
    id: usize,
    task: String,
    done: bool,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bridge]
impl TodoItem {
    pub fn id(&self) -> u32 {
        self.id as u32
    }

    pub fn task(&self) -> String {
        self.task.clone()
    }

    pub fn done(&self) -> bool {
        self.done
    }

    pub fn set_done(&mut self, done: bool) {
        self.done = done;
    }
}

#[cfg(target_arch = "wasm32")]
impl From<&Todo> for TodoItem {
    fn from(todo: &Todo) -> Self {
        Self {
            id: todo.id(),
            task: todo.task().to_string(),
            done: todo.done(),
        }
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bridge]
pub struct TodoStoreService {
    inner: TodoStore,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bridge]
impl TodoStoreService {
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

    fn done_at(&self, index: usize) -> Option<bool> {
        self.inner.todos.get(index).map(Todo::done)
    }

    fn archive_done(&mut self) {
        self.inner.archive_done();
    }

    fn items_array(&self) -> Array {
        self.inner.todos().iter().map(todo_object).collect()
    }
}

#[cfg(target_arch = "wasm32")]
fn todo_object(todo: &Todo) -> JsValue {
    let item = Object::new();

    let _ = Reflect::set(
        &item,
        &JsString::from("id").into(),
        &JsValue::from_f64(todo.id() as f64),
    );
    let _ = Reflect::set(
        &item,
        &JsString::from("task").into(),
        &JsValue::from_str(todo.task()),
    );
    let _ = Reflect::set(
        &item,
        &JsString::from("done").into(),
        &JsValue::from_bool(todo.done()),
    );

    item.into()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bridge(service = "TodoStore")]
pub fn ng_service_todo_store() -> TodoStoreService {
    TodoStoreService::new()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bridge(value = "AppTitle")]
pub fn ng_value_app_title() -> String {
    "Rust-authored AngularTS Todos".to_string()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bridge(controller = "DemoInfo")]
pub struct DemoInfoController {
    pub title: String,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bridge(controller = "DemoInfo")]
impl DemoInfoController {
    pub fn new(title: String) -> Self {
        Self { title }
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bridge(component = "TodoList")]
pub struct TodoListController {
    store: TodoStoreService,
    http: HttpService,
    pub items: Array,
    pub remaining_count: usize,
    pub server_status: String,
    pub server_task_count: usize,
    pub server_tasks: Array,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bridge(component = "TodoList")]
impl TodoListController {
    pub fn new(store: TodoStoreService, http: HttpService) -> Self {
        let items = store.items_array();

        let mut controller = Self {
            store,
            http,
            items,
            remaining_count: 0,
            server_status: "Not loaded".to_string(),
            server_task_count: 0,
            server_tasks: Array::new(),
        };

        controller.refresh();
        controller
    }

    pub async fn load_server_tasks(&mut self) {
        self.server_status = "Loading".to_string();
        self.server_task_count = 0;
        self.server_tasks = Array::new();
        self.refresh();

        let result = self.http.get_json::<Vec<ServerTask>>("/api/tasks").await;

        match result {
            Ok(response) => self.apply_server_tasks(response),
            Err(error) => self.apply_server_error(error),
        }
    }

    pub fn add(&mut self, title: String) {
        let title = title.trim();
        if title.is_empty() {
            return;
        }

        self.store.add(title.to_string());
        self.refresh();
    }

    pub fn toggle(&mut self, index: usize) {
        let Some(done) = self.store.done_at(index) else {
            return;
        };

        self.store.set_done(index, !done);
        self.refresh();
    }

    pub fn archive(&mut self) {
        self.store.archive_done();
        self.refresh();
    }

    fn refresh(&mut self) {
        self.items = self.store.items_array();
        self.remaining_count = self.store.inner.remaining_count();
    }

    fn apply_server_tasks(&mut self, response: HttpResponse<Vec<ServerTask>>) {
        self.server_task_count = response.data().len();
        self.server_tasks = response.data().iter().map(server_task_object).collect();
        self.server_status = format!(
            "Loaded {} tasks with HTTP {}",
            self.server_task_count,
            response.status()
        );
        self.refresh();
    }

    fn apply_server_error(&mut self, error: JsValue) {
        self.server_status = error
            .as_string()
            .unwrap_or_else(|| "HTTP request failed".to_string());
        self.server_task_count = 0;
        self.server_tasks = Array::new();
        self.refresh();
    }
}

#[cfg(target_arch = "wasm32")]
#[derive(Debug, Deserialize)]
struct ServerTask {
    id: usize,
    title: String,
    owner: String,
    status: String,
}

#[cfg(target_arch = "wasm32")]
fn server_task_object(task: &ServerTask) -> JsValue {
    let item = Object::new();

    let _ = Reflect::set(
        &item,
        &JsString::from("id").into(),
        &JsValue::from_f64(task.id as f64),
    );
    let _ = Reflect::set(
        &item,
        &JsString::from("title").into(),
        &JsValue::from_str(&task.title),
    );
    let _ = Reflect::set(
        &item,
        &JsString::from("owner").into(),
        &JsValue::from_str(&task.owner),
    );
    let _ = Reflect::set(
        &item,
        &JsString::from("status").into(),
        &JsValue::from_str(&task.status),
    );

    item.into()
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
        assert_eq!(module.registrations().len(), 4);
        assert_eq!(module.registrations()[0].kind, RegistrationKind::Service);
        assert_eq!(module.registrations()[0].angular_name, "todoStore");
        assert_eq!(
            module.registrations()[0].export_name,
            "__ng_service_TodoStore"
        );
        assert_eq!(module.registrations()[1].kind, RegistrationKind::Value);
        assert_eq!(module.registrations()[1].angular_name, "appTitle");
        assert_eq!(module.registrations()[1].export_name, "__ng_value_AppTitle");
        assert_eq!(module.registrations()[2].kind, RegistrationKind::Controller);
        assert_eq!(module.registrations()[2].angular_name, "demoInfo");
        assert_eq!(
            module.registrations()[2].export_name,
            "__ng_controller_DemoInfo"
        );
        assert_eq!(module.registrations()[3].kind, RegistrationKind::Component);
        assert_eq!(module.registrations()[3].angular_name, "todoList");
        assert_eq!(
            module.registrations()[3].export_name,
            "__ng_component_TodoList"
        );
    }

    #[test]
    fn angular_module_macro_generates_collector() {
        let module = __ng_collect_app();

        assert_eq!(module.name(), "rustDemo");
        assert_eq!(module.registrations().len(), 4);
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
        assert_eq!(TodoList::METADATA.injections()[1].field(), "_http");
        assert_eq!(TodoList::METADATA.injections()[1].token(), "$http");
        assert_eq!(
            TodoList::METADATA.injections()[1].rust_type(),
            "Option<HttpService>"
        );
    }

    #[test]
    fn todo_authoring_avoids_manual_bridge_exports() {
        let source = include_str!("lib.rs");
        let manifest = include_str!("../angular-ts.json");
        let raw_wasm_bindgen_attr = concat!("#[", "wasm_bindgen");
        let raw_export_argument = concat!("wasm_bridge", "(export");
        let controller_impl_marker = concat!(
            "#[wasm_bridge(component = \"TodoList\")]",
            "\nimpl TodoListController"
        );
        let controller_impl = source
            .split(controller_impl_marker)
            .nth(1)
            .expect("TodoListController impl should exist");
        let items_getter = concat!("pub fn ", "items(&self)");
        let remaining_count_getter = concat!("pub fn ", "remaining_count(&self)");
        let server_status_getter = concat!("pub fn ", "server_status(&self)");
        let server_task_count_getter = concat!("pub fn ", "server_task_count(&self)");
        let server_tasks_getter = concat!("pub fn ", "server_tasks(&self)");
        let manual_scope_set = concat!("scope", ".set(");
        let manual_scope_flush = concat!("scope", ".flush(");
        let manual_spawn = concat!("spawn", "_local");
        let raw_controller_pointer = concat!(" as *", "mut TodoListController");

        assert!(!source.contains(raw_wasm_bindgen_attr));
        assert!(!source.contains(raw_export_argument));
        assert!(!source.contains(manual_scope_set));
        assert!(!source.contains(manual_scope_flush));
        assert!(!source.contains(manual_spawn));
        assert!(!source.contains(raw_controller_pointer));
        assert!(!controller_impl.contains(items_getter));
        assert!(!controller_impl.contains(remaining_count_getter));
        assert!(!controller_impl.contains(server_status_getter));
        assert!(!controller_impl.contains(server_task_count_getter));
        assert!(!controller_impl.contains(server_tasks_getter));
        assert!(!manifest.contains("\"export\""));
        assert!(!manifest.contains("syncProperties"));
        assert!(!manifest.contains("\"methods\""));
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
