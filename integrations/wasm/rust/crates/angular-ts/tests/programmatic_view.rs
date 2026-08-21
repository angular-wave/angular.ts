use angular_ts::{module_manifest_json, ComponentController, ComponentMetadata, NgModule};

struct ViewPanel;

impl ComponentController for ViewPanel {
    const NAME: &'static str = "viewPanel";
    const METADATA: ComponentMetadata = ComponentMetadata::view("view-panel", "render_view_panel");
    const EXPORT_NAME: &'static str = "create_view_panel";
}

#[test]
fn serializes_programmatic_view_exports() {
    let mut module = NgModule::new("viewModule");
    module.component::<ViewPanel>();

    assert_eq!(
        module_manifest_json(&module),
        r#"{"registrations":[{"kind":"component","name":"viewPanel","export":"create_view_panel","view":"render_view_panel"}]}"#,
    );
}
