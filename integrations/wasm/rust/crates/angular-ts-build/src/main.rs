use std::env;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let mut args = env::args().skip(1);
    let command = args.next().unwrap_or_else(|| "help".to_string());

    match command.as_str() {
        "build" => build(args.collect()),
        "help" | "--help" | "-h" => {
            print_help();
            Ok(())
        }
        other => Err(format!(
            "unknown command `{other}`\n\nRun `angular-ts-rs help`."
        )),
    }
}

fn build(args: Vec<String>) -> Result<(), String> {
    let mut out = PathBuf::from(".angular-ts/bootstrap.js");
    let mut module_name = "app".to_string();
    let mut package_path = "./pkg/app.js".to_string();
    let mut manifest_path: Option<PathBuf> = None;

    let mut index = 0;
    while index < args.len() {
        match args[index].as_str() {
            "--out" => {
                index += 1;
                out = PathBuf::from(value_after("--out", &args, index)?);
            }
            "--module" => {
                index += 1;
                module_name = value_after("--module", &args, index)?;
            }
            "--pkg" => {
                index += 1;
                package_path = value_after("--pkg", &args, index)?;
            }
            "--manifest" => {
                index += 1;
                manifest_path = Some(PathBuf::from(value_after("--manifest", &args, index)?));
            }
            unknown => return Err(format!("unknown build option `{unknown}`")),
        }
        index += 1;
    }

    let manifest = match manifest_path {
        Some(path) => Some(read_manifest(path)?),
        None => None,
    };

    if let Some(manifest) = &manifest {
        module_name = manifest.module.clone();
        package_path = manifest.package.clone();
    }

    if let Some(parent) = out.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("failed to create `{}`: {error}", parent.display()))?;
    }

    let source = match &manifest {
        Some(manifest) => manifest_bootstrap_js(manifest)?,
        None => fallback_bootstrap_js(&module_name, &package_path),
    };

    fs::write(&out, source)
        .map_err(|error| format!("failed to write `{}`: {error}", out.display()))?;

    println!("Generated {}", out.display());
    Ok(())
}

fn value_after(flag: &str, args: &[String], index: usize) -> Result<String, String> {
    args.get(index)
        .cloned()
        .ok_or_else(|| format!("missing value after `{flag}`"))
}

fn read_manifest(path: PathBuf) -> Result<AngularTsManifest, String> {
    let source = fs::read_to_string(&path)
        .map_err(|error| format!("failed to read `{}`: {error}", path.display()))?;
    let base_dir = path.parent().unwrap_or_else(|| Path::new("."));

    let mut manifest: AngularTsManifest = serde_json::from_str(&source)
        .map_err(|error| format!("failed to parse `{}`: {error}", path.display()))?;
    manifest.resolve_template_paths(base_dir)?;

    Ok(manifest)
}

fn fallback_bootstrap_js(module_name: &str, package_path: &str) -> String {
    format!(
        r#"import {{ angular }} from "@angular-wave/angular.ts";
import init, * as app from "{package_path}";

await init();

if (typeof app.__ng_register !== "function") {{
  throw new Error("Rust AngularTS package does not export __ng_register.");
}}

app.__ng_register(angular.module("{module_name}"));
angular.bootstrap(document.body, ["{module_name}"]);
"#
    )
}

fn manifest_bootstrap_js(manifest: &AngularTsManifest) -> Result<String, String> {
    let module_name = js_string(&manifest.module)?;
    let package_path = js_string(&manifest.package)?;
    let requires = js_string_array(&manifest.requires)?;
    let mut registrations = String::new();

    for registration in &manifest.registrations {
        let name = js_string(&registration.name)?;
        let export_name = js_string(&registration.export)?;

        match registration.kind {
            RegistrationKind::Service => registrations.push_str(&format!(
                "module.service({name}, requireExport({export_name}));\n"
            )),
            RegistrationKind::Factory => registrations.push_str(&format!(
                "module.factory({name}, requireExport({export_name}));\n"
            )),
            RegistrationKind::Component => {
                let component = registration.component_config()?;
                registrations.push_str(&format!(
                    "module.component({name}, createComponent({export_name}, {component}));\n"
                ));
            }
        }
    }

    let bootstrap = if manifest.bootstrap {
        format!("angular.bootstrap(document.body, [{module_name}]);\n")
    } else {
        String::new()
    };

    Ok(format!(
        r#"import {{ angular }} from "@angular-wave/angular.ts";
import init, * as app from {package_path};

await init();

const requireExport = (name) => {{
  const value = app[name];
  if (value === undefined || value === null) {{
    throw new Error(`Rust AngularTS package does not export ${{name}}.`);
  }}
  return value;
}};

  const createComponent = (controllerName, options) => {{
  const controller = requireExport(controllerName);
  const {{ inject, syncProperties, methods, controllerAs, ...component }} = options;
  const angularController = createControllerBridge(
    controller,
    syncProperties,
    methods,
    {{ inject, controllerAs }},
  );
  if (inject.length > 0) {{
    angularController.$inject = inject;
  }}
  return {{
    ...component,
    ...(controllerAs ? {{ controllerAs }} : {{}}),
    controller: angularController,
  }};
}};

const createControllerBridge = (RustController, syncProperties, methods, bridgeConfig) => {{
  const {{ inject, controllerAs }} = bridgeConfig;
  const scopeExpressionPrefix = (controllerAs || "ctrl").replace(/\\.$/, "");
  const toApplyName = (property) => {{
    const head = property.charAt(0).toUpperCase();
    return "apply" + head + property.slice(1) + "FromScope";
  }};

  const toWasmScope = (scopeValue) => new app.WasmScope(scopeValue);

  class AngularTsRustController {{
    constructor(...deps) {{
      const hasScope = inject.indexOf("$scope") >= 0;
      const scopeIndex = inject.indexOf("$scope");
      const angularScope =
        scopeIndex >= 0 ? deps[scopeIndex] : undefined;

      if (hasScope) {{
        if (typeof app.WasmScope !== "function") {{
          throw new Error("Rust AngularTS package does not export WasmScope.");
        }}

        deps[scopeIndex] = toWasmScope(this);
      }}

      this.__inner = Reflect.construct(RustController, deps);
      this.__angularScope = angularScope;
      this.__syncRustProperties();
      this.__flushScope();
      this.__fromRust = false;
      this.__scopeWatchDisposers = [];

      if (angularScope && typeof angularScope.$watchCollection === "function") {{
        for (const property of syncProperties) {{
          const applyName = toApplyName(property);
          const applyMethod = this.__inner[applyName];
          const watchExpression = scopeExpressionPrefix
            ? `${{scopeExpressionPrefix}}.${{property}}`
            : property;

          if (typeof applyMethod !== "function") {{
            continue;
          }}

          const watcher = angularScope.$watchCollection(
            watchExpression,
            (nextValue) => {{
              if (this.__fromRust) {{
                return;
              }}

              this.__fromRust = true;
              try {{
                applyMethod.call(this.__inner, nextValue);
                this.__syncRustProperties();
                this.__flushScope();
              }} finally {{
                this.__fromRust = false;
              }}
            }},
          );

          this.__scopeWatchDisposers.push(watcher);
        }}
      }}
    }}

    $onDestroy() {{
      for (const dispose of this.__scopeWatchDisposers) {{
        if (typeof dispose === "function") {{
          dispose();
        }}
      }}
    }}

    __syncRustProperties() {{
      for (const property of syncProperties) {{
        const next = this.__inner[property];
        const value =
          Array.isArray(next) ? next.slice() : next;

        this[property] = value;
      }}
    }}

    __flushScope() {{
      const angularScope = this.__angularScope;

      if (angularScope && typeof angularScope.$flushQueue === "function") {{
        angularScope.$flushQueue();
      }}
    }}
  }}

  for (const method of methods) {{
    AngularTsRustController.prototype[method] = function (...args) {{
      this.__fromRust = true;
      const result = this.__inner[method](...args);
      try {{
        this.__syncRustProperties();
        this.__flushScope();
      }} finally {{
        this.__fromRust = false;
      }}
      return result;
    }};
  }}

  return AngularTsRustController;
}};

const module = angular.module({module_name}, {requires});
{registrations}{bootstrap}"#
    ))
}

fn js_string(value: &str) -> Result<String, String> {
    serde_json::to_string(value).map_err(|error| format!("failed to encode JS string: {error}"))
}

fn js_string_array(values: &[String]) -> Result<String, String> {
    serde_json::to_string(values).map_err(|error| format!("failed to encode JS array: {error}"))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AngularTsManifest {
    module: String,
    package: String,
    #[serde(default)]
    requires: Vec<String>,
    #[serde(default = "default_bootstrap")]
    bootstrap: bool,
    #[serde(default)]
    registrations: Vec<RegistrationManifest>,
}

impl AngularTsManifest {
    fn resolve_template_paths(&mut self, base_dir: &Path) -> Result<(), String> {
        for registration in &mut self.registrations {
            registration.resolve_template_path(base_dir)?;
        }

        Ok(())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RegistrationManifest {
    kind: RegistrationKind,
    name: String,
    export: String,
    #[serde(default)]
    template: Option<String>,
    #[serde(default)]
    template_path: Option<String>,
    #[serde(default)]
    template_url: Option<String>,
    #[serde(default)]
    controller_as: Option<String>,
    #[serde(default)]
    inject: Vec<String>,
    #[serde(default)]
    sync_properties: Vec<String>,
    #[serde(default)]
    methods: Vec<String>,
}

impl RegistrationManifest {
    fn component_config(&self) -> Result<String, String> {
        let mut config = ComponentConfig::default();
        config.inject = &self.inject;
        config.sync_properties = &self.sync_properties;
        config.methods = &self.methods;

        match (&self.template, &self.template_url) {
            (Some(template), None) => config.template = Some(template),
            (None, Some(template_url)) => config.template_url = Some(template_url),
            (Some(_), Some(_)) => {
                return Err(format!(
                    "component `{}` must not define both `template` and `templateUrl`",
                    self.name
                ));
            }
            (None, None) => {
                return Err(format!(
                    "component `{}` requires `template` or `templateUrl`",
                    self.name
                ));
            }
        }

        if let Some(controller_as) = &self.controller_as {
            config.controller_as = Some(controller_as);
        }

        serde_json::to_string(&config)
            .map_err(|error| format!("failed to encode component `{}`: {error}", self.name))
    }

    fn resolve_template_path(&mut self, base_dir: &Path) -> Result<(), String> {
        let Some(template_path) = &self.template_path else {
            return Ok(());
        };

        if self.template.is_some() || self.template_url.is_some() {
            return Err(format!(
                "component `{}` must not combine `templatePath` with `template` or `templateUrl`",
                self.name
            ));
        }

        let path = base_dir.join(template_path);
        let template = fs::read_to_string(&path)
            .map_err(|error| format!("failed to read `{}`: {error}", path.display()))?;
        self.template = Some(template);

        Ok(())
    }
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct ComponentConfig<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    template: Option<&'a String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    template_url: Option<&'a String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    controller_as: Option<&'a String>,
    inject: &'a [String],
    sync_properties: &'a [String],
    methods: &'a [String],
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum RegistrationKind {
    Service,
    Factory,
    Component,
}

fn default_bootstrap() -> bool {
    true
}

fn print_help() {
    println!(
        r#"angular-ts-rs

Commands:
  build   Generate the AngularTS bootstrap entrypoint.
  help    Print this help message.

Build options:
  --out <path>      Output path. Defaults to .angular-ts/bootstrap.js.
  --module <name>   AngularTS module name. Defaults to app.
  --pkg <path>      wasm-bindgen JS package import path. Defaults to ./pkg/app.js.
  --manifest <path> Read module, package, and registrations from a JSON manifest.
"#
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn manifest_bootstrap_registers_services_and_components() {
        let manifest = AngularTsManifest {
            module: "rustDemo".to_string(),
            package: "./pkg/basic_app.js".to_string(),
            requires: vec![],
            bootstrap: true,
            registrations: vec![
                RegistrationManifest {
                    kind: RegistrationKind::Factory,
                    name: "todoStore".to_string(),
                    export: "__ng_service_TodoStore".to_string(),
                    template: None,
                    template_path: None,
                    template_url: None,
                    controller_as: None,
                    inject: vec![],
                    sync_properties: vec![],
                    methods: vec![],
                },
                RegistrationManifest {
                    kind: RegistrationKind::Component,
                    name: "todoList".to_string(),
                    export: "__ng_component_TodoList".to_string(),
                    template: None,
                    template_path: None,
                    template_url: Some("templates/todo-list.html".to_string()),
                    controller_as: Some("ctrl".to_string()),
                    inject: vec!["todoStore".to_string(), "$scope".to_string()],
                    sync_properties: vec!["items".to_string()],
                    methods: vec![
                        "add".to_string(),
                        "setDone".to_string(),
                        "archive".to_string(),
                    ],
                },
            ],
        };

        let source = manifest_bootstrap_js(&manifest).unwrap();

        assert!(source.contains("const module = angular.module(\"rustDemo\", []);"));
        assert!(source
            .contains("module.factory(\"todoStore\", requireExport(\"__ng_service_TodoStore\"));"));
        assert!(source.contains("angularController.$inject = inject;"));
        assert!(source.contains("createControllerBridge("));
        assert!(source.contains(" { inject, controllerAs },"));
        assert!(source.contains("AngularTsRustController.prototype[method]"));
        assert!(source.contains("app.WasmScope"));
        assert!(source.contains("$watchCollection"));
        assert!(source.contains("angular.bootstrap(document.body, [\"rustDemo\"]);"));
    }
}
