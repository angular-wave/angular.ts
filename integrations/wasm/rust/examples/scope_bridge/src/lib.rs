use angular_ts::{angular_module, component, NgModule};

#[cfg(target_arch = "wasm32")]
use angular_ts::{wasm_bridge, Field, WasmScope};

#[cfg(target_arch = "wasm32")]
const COUNT: Field<i32> = Field::new("count");
#[cfg(target_arch = "wasm32")]
const SOURCE: Field<String> = Field::new("source");

#[derive(Debug, Default)]
#[component(selector = "scope-probe", template_url = "templates/scope-probe.html")]
pub struct ScopeProbe {
    #[cfg(target_arch = "wasm32")]
    #[inject(token = "$scope")]
    _scope: WasmScope,
}

#[angular_module(name = "rustScopeBridge")]
pub fn app(module: &mut NgModule) {
    module.component::<ScopeProbe>();
}

#[cfg(target_arch = "wasm32")]
#[wasm_bridge(component = "ScopeProbe")]
pub struct ScopeProbeController {
    scope: WasmScope,
    pub count: i32,
    pub seen_count: i32,
    pub source: String,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bridge(component = "ScopeProbe")]
impl ScopeProbeController {
    pub fn new(scope: WasmScope) -> Self {
        Self {
            scope,
            count: 0,
            seen_count: 0,
            source: "constructed".to_string(),
        }
    }

    pub fn increment(&mut self) {
        let count = self.count + 1;
        self.publish(count)
            .expect("typed scope transaction should succeed");

        self.count = count;
        self.seen_count = count;
        self.source = "rust".to_string();
    }

    fn publish(&self, count: i32) -> Result<(), angular_ts::WasmError> {
        self.scope
            .update()
            .set(COUNT, count)?
            .set(SOURCE, "rust".to_string())?
            .origin("rust")
            .commit()
    }

    #[scope_update(path = "count")]
    pub fn apply_count_from_scope(&mut self, count: i32) {
        if count == self.count {
            return;
        }

        self.count = count;
        self.seen_count = count;
        self.source = "browser".to_string();
    }
}

#[cfg(test)]
mod tests {
    use angular_ts::{ComponentController, RegistrationKind, TemplateSource};

    use super::*;

    #[test]
    fn module_registers_scope_probe_component() {
        let module = __ng_collect_app();

        assert_eq!(module.name(), "rustScopeBridge");
        assert_eq!(module.registrations().len(), 1);
        assert_eq!(module.registrations()[0].kind, RegistrationKind::Component);
        assert_eq!(module.registrations()[0].angular_name, "scopeProbe");
        assert_eq!(
            module.registrations()[0].export_name,
            "__ng_component_ScopeProbe"
        );
    }

    #[test]
    fn component_metadata_matches_template() {
        assert_eq!(ScopeProbe::NAME, "scopeProbe");
        assert_eq!(ScopeProbe::EXPORT_NAME, "__ng_component_ScopeProbe");
        assert!(matches!(
            ScopeProbe::METADATA.template(),
            TemplateSource::Url(template) if template.contains("templates/scope-probe.html")
        ));
    }

    #[test]
    fn scope_lifecycle_uses_macro_metadata_not_method_names() {
        let source = include_str!("lib.rs");
        let local_controller_registry = concat!("SCOPE", "_PROBE_CONTROLLERS");
        let local_update_export = concat!("pub extern \"C\" fn ", "ng_scope_on_transaction");
        let manual_watch_route = concat!("watch", "_with");
        let count_getter = concat!("pub fn ", "count(&self)");
        let seen_count_getter = concat!("pub fn ", "seen_count(&self)");
        let source_getter = concat!("pub fn ", "source(&self)");
        let manual_scope_set = concat!("scope", ".set(");
        let untyped_value = concat!("Js", "Value");

        assert!(!source.contains(local_controller_registry));
        assert!(!source.contains(local_update_export));
        assert!(!source.contains(manual_watch_route));
        assert!(!source.contains(manual_scope_set));
        assert!(!source.contains(count_getter));
        assert!(!source.contains(seen_count_getter));
        assert!(!source.contains(source_getter));
        assert!(!source.contains(untyped_value));
        assert!(source.contains("scope_update(path = \"count\")"));
    }
}
