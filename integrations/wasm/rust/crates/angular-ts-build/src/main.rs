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

    if let Some(manifest) = &manifest {
        write_scope_abi_module(&out)?;
        patch_wasm_bindgen_import(&out, &manifest.package)?;
    }

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
    let mut registration_overrides = String::new();

    for registration in manifest.build_registration_overrides() {
        let name = js_string(&registration.name)?;
        let registration = registration.registration_config(manifest.app_template.as_deref())?;

        registration_overrides.push_str(&format!(
            "buildRegistrationOverrides.set({name}, {registration});\n",
        ));
    }

    let bootstrap = if manifest.bootstrap {
        format!("angular.bootstrap(document.body, [{module_name}]);\n")
    } else {
        String::new()
    };

    Ok(format!(
        r#"import {{ angular, WasmScopeAbi }} from "@angular-wave/angular.ts";
import init, * as app from {package_path};

const scopeAbi = new WasmScopeAbi();
globalThis.__angularTsWasmScopeAbi = scopeAbi;
const wasmExports = await init();
scopeAbi.attach(wasmExports);

const requireExport = (name) => {{
  const value = app[name];
  if (value === undefined || value === null) {{
    throw new Error(`Rust AngularTS package does not export ${{name}}.`);
  }}
  return value;
}};

const readRustManifest = () => {{
  if (typeof app.__ng_manifest !== "function") {{
    return {{}};
  }}

  const manifest = app.__ng_manifest();

  if (typeof manifest === "string") {{
    return JSON.parse(manifest);
  }}

  return manifest || {{}};
}};

const readBridgeMetadataValue = (read) => {{
  if (typeof read !== "function") {{
    return {{}};
  }}

  const metadata = read();

  if (typeof metadata === "string") {{
    return JSON.parse(metadata);
  }}

  return metadata || {{}};
}};

const uniqueStrings = (...values) => {{
  const output = [];

  for (const value of values.flat()) {{
    if (typeof value === "string" && !output.includes(value)) {{
      output.push(value);
    }}
  }}

  return output;
}};

const mergeBridgeMetadata = (...metadataList) => {{
  const merged = {{}};

  for (const metadata of metadataList) {{
    if (!metadata || typeof metadata !== "object") {{
      continue;
    }}

    merged.scopeUpdateBind ??= metadata.scopeUpdateBind;
    merged.scopeUpdateUnbind ??= metadata.scopeUpdateUnbind;
  }}

  merged.syncProperties = uniqueStrings(
    ...metadataList.map((metadata) => metadata?.syncProperties || []),
  );
  merged.methods = uniqueStrings(
    ...metadataList.map((metadata) => metadata?.methods || []),
  );
  merged.scopeUpdateRoutes = [
    ...metadataList.flatMap((metadata) => metadata?.scopeUpdateRoutes || []),
  ];

  return merged;
}};

const readBridgeMetadata = (registration) => {{
  const exportName = registration.export;

  if (!exportName) {{
    return {{}};
  }}

  return mergeBridgeMetadata(
    readBridgeMetadataValue(app[`${{exportName}}_fieldBridgeMetadata`]),
    readBridgeMetadataValue(app[`${{exportName}}_bridgeMetadata`]),
  );
}};

const runtimeRegistrations = new Map(
  (readRustManifest().registrations || []).map((registration) => [
    registration.name,
    registration,
  ]),
);

const buildRegistrationOverrides = new Map();
{registration_overrides}

const mergeRegistration = (runtime, registration = {{}}) => {{
  const merged = {{
    ...runtime,
    ...registration,
    export: registration.export || runtime.export,
  }};
  const bridgeMetadata = readBridgeMetadata(merged);

  merged.inject = registration.inject || runtime.inject || [];
  merged.syncProperties =
    registration.syncProperties ||
    runtime.syncProperties ||
    bridgeMetadata.syncProperties ||
    [];
  merged.methods =
    registration.methods ||
    runtime.methods ||
    bridgeMetadata.methods ||
    [];
  merged.scopeUpdateBind =
    registration.scopeUpdateBind ||
    runtime.scopeUpdateBind ||
    bridgeMetadata.scopeUpdateBind;
  merged.scopeUpdateUnbind =
    registration.scopeUpdateUnbind ||
    runtime.scopeUpdateUnbind ||
    bridgeMetadata.scopeUpdateUnbind;
  merged.scopeUpdateRoutes =
    registration.scopeUpdateRoutes ||
    runtime.scopeUpdateRoutes ||
    bridgeMetadata.scopeUpdateRoutes ||
    [];

  if (merged.template) {{
    delete merged.templateUrl;
  }}

  return merged;
}};

let nextWasmScopeId = 0;

const createComponent = (controllerName, options) => {{
  const controller = requireExport(controllerName);
  const {{ inject, syncProperties, methods, controllerAs, kind, name, export: exportName, ...component }} = options;
  const angularController = createController(controllerName, {{
    inject,
    syncProperties,
    methods,
    controllerAs,
    scopeUpdateBind: options.scopeUpdateBind,
    scopeUpdateUnbind: options.scopeUpdateUnbind,
    scopeUpdateRoutes: options.scopeUpdateRoutes,
  }});
  if (inject.length > 0) {{
    angularController.$inject = inject;
  }}
  return {{
    ...component,
    ...(controllerAs ? {{ controllerAs }} : {{}}),
    controller: angularController,
  }};
}};

const createController = (controllerName, options) => {{
  const controller = requireExport(controllerName);
  const {{ inject, syncProperties, methods, controllerAs, scopeUpdateBind, scopeUpdateUnbind, scopeUpdateRoutes }} = options;
  const angularController = createControllerBridge(
    controller,
    syncProperties,
    methods,
    {{ inject, controllerAs, controllerName, scopeUpdateBind, scopeUpdateUnbind, scopeUpdateRoutes }},
  );
  if (inject.length > 0) {{
    angularController.$inject = inject;
  }}
  return angularController;
}};

const createControllerBridge = (RustController, syncProperties, methods, bridgeConfig) => {{
  const {{ inject, controllerAs, controllerName, scopeUpdateBind, scopeUpdateUnbind, scopeUpdateRoutes }} = bridgeConfig;
  const scopeExpressionPrefix = (controllerAs || "ctrl").replace(/\\.$/, "");

  const toWasmScope = (scopeValue) => {{
    const name = `${{controllerName}}:${{++nextWasmScopeId}}`;
    const hostScope = scopeAbi.createScope(scopeValue, {{ name }});

    return {{
      hostScope,
      rustScope: new app.WasmScope(hostScope.handle, scopeExpressionPrefix),
    }};
  }};

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

        const wasmScope = toWasmScope(angularScope);

        this.__wasmScope = wasmScope.hostScope;
        deps[scopeIndex] = wasmScope.rustScope;
      }}

      this.__inner = Reflect.construct(RustController, deps);
      this.__angularScope = angularScope;
      this.__scopeUpdateDisposers = [];
      this.__controllerProxy = this;
      this.__fromRust = false;
      this.__publishControllerAlias();
      this.__bindGeneratedRefresh();
      this.__bindScopeUpdates();
      this.__bindScopeUpdateRoutes();
      this.__syncRustProperties();
      this.__flushScope();
    }}

    $onInit() {{
      const inner = this.__inner;

      if (inner && typeof inner.onInit === "function") {{
        inner.onInit();
        this.__syncRustProperties();
        this.__flushScope();
      }}
    }}

    $onDestroy() {{
      const inner = this.__inner;

      if (inner && typeof inner.onDestroy === "function") {{
        inner.onDestroy();
        this.__syncRustProperties();
        this.__flushScope();
      }}

      if (
        scopeUpdateUnbind &&
        inner &&
        typeof inner[scopeUpdateUnbind] === "function"
      ) {{
        inner[scopeUpdateUnbind]();
      }}

      for (const dispose of this.__scopeUpdateDisposers.splice(0)) {{
        dispose();
      }}

      this.__wasmScope?.dispose();
    }}

    __bindGeneratedRefresh() {{
      const hostScope = this.__wasmScope;

      if (!hostScope || typeof hostScope.onFlush !== "function") {{
        return;
      }}

      this.__scopeUpdateDisposers.push(
        hostScope.onFlush(() => {{
          this.__syncRustProperties();
        }}),
      );
    }}

    __bindScopeUpdates() {{
      const inner = this.__inner;

      if (
        scopeUpdateBind &&
        inner &&
        typeof inner[scopeUpdateBind] === "function"
      ) {{
        inner[scopeUpdateBind]();
      }}
    }}

    __bindScopeUpdateRoutes() {{
      const inner = this.__inner;
      const hostScope = this.__wasmScope;

      if (!hostScope || !Array.isArray(scopeUpdateRoutes)) {{
        return;
      }}

      for (const route of scopeUpdateRoutes) {{
        if (
          !route ||
          !route.path ||
          !route.method ||
          !inner ||
          typeof inner[route.method] !== "function"
        ) {{
          continue;
        }}

        const path = scopeExpressionPrefix
          ? `${{scopeExpressionPrefix}}.${{route.path}}`
          : route.path;
        const dispose = hostScope.watch(path, (update) => {{
          if (this.__fromRust) {{
            return;
          }}

          inner[route.method](update.value);
          queueMicrotask(() => {{
            this.__syncRustProperties();
            this.__flushScope();
          }});
        }});

        this.__scopeUpdateDisposers.push(dispose);
      }}
    }}

    __syncRustProperties() {{
      const target = this.__controllerProxy || this.$proxy || this;

      for (const property of syncProperties) {{
        const next = this.__inner[property];
        const value =
          Array.isArray(next) ? next.slice() : next;

        target[property] = value;
      }}
    }}

    __flushScope() {{
      // Scope flushing is a bridge callback boundary. AngularTS schedules DOM
      // updates through the normal scope microtask pipeline.
    }}

    __publishControllerAlias() {{
      const angularScope = this.__angularScope;

      if (!angularScope || !scopeExpressionPrefix || scopeExpressionPrefix.includes(".")) {{
        return;
      }}

      angularScope[scopeExpressionPrefix] = this;
      this.__controllerProxy = angularScope[scopeExpressionPrefix] || this;
    }}
  }}

  for (const method of methods) {{
    AngularTsRustController.prototype[method] = function (...args) {{
      this.__fromRust = true;
      let result;

      try {{
        result = this.__inner[method](...args);
      }} catch (error) {{
        this.__fromRust = false;
        throw error;
      }}

      if (result && typeof result.then === "function") {{
        this.__fromRust = false;

        return result.then(
          (value) => {{
            this.__fromRust = true;
            try {{
              this.__syncRustProperties();
              this.__flushScope();
              return value;
            }} finally {{
              this.__fromRust = false;
            }}
          }},
          (error) => {{
            this.__fromRust = true;
            try {{
              this.__syncRustProperties();
              this.__flushScope();
            }} finally {{
              this.__fromRust = false;
            }}
            throw error;
          }},
        );
      }}

      try {{
        this.__syncRustProperties();
        this.__flushScope();
        return result;
      }} finally {{
        this.__fromRust = false;
      }}
    }};
  }}

  return AngularTsRustController;
}};

const registerRegistration = (registration) => {{
  const name = registration.name;
  const exportName = registration.export;

  switch (registration.kind) {{
    case "service":
      module.service(name, requireExport(exportName));
      break;
    case "factory":
      module.factory(name, requireExport(exportName));
      break;
    case "value":
      module.value(name, requireExport(exportName)());
      break;
    case "controller":
      module.controller(name, createController(exportName, registration));
      break;
    case "component":
      module.component(name, createComponent(exportName, registration));
      break;
    default:
      throw new Error(`Unsupported Rust AngularTS registration kind: ${{registration.kind}}`);
  }}
}};

const module = angular.module({module_name}, {requires});
const registeredRegistrationNames = new Set();

for (const runtimeRegistration of runtimeRegistrations.values()) {{
  const buildRegistration = buildRegistrationOverrides.get(runtimeRegistration.name) || {{}};
  registerRegistration(mergeRegistration(runtimeRegistration, buildRegistration));
  registeredRegistrationNames.add(runtimeRegistration.name);
}}

for (const buildRegistration of buildRegistrationOverrides.values()) {{
  if (!registeredRegistrationNames.has(buildRegistration.name)) {{
    registerRegistration(mergeRegistration({{}}, buildRegistration));
  }}
}}

{bootstrap}"#
    ))
}

fn write_scope_abi_module(bootstrap_path: &Path) -> Result<(), String> {
    let Some(out_dir) = bootstrap_path.parent() else {
        return Ok(());
    };

    let abi_path = out_dir.join("abi.js");
    let source = r#"const imports = () => {
  const abi = globalThis.__angularTsWasmScopeAbi;

  if (!abi?.imports?.angular_ts) {
    throw new Error("AngularTS Wasm scope ABI is not initialized.");
  }

  return abi.imports.angular_ts;
};

export const scope_resolve = (namePtr, nameLen) =>
  imports().scope_resolve(namePtr, nameLen);
export const scope_get = (scopeHandle, pathPtr, pathLen) =>
  imports().scope_get(scopeHandle, pathPtr, pathLen);
export const scope_get_named = (namePtr, nameLen, pathPtr, pathLen) =>
  imports().scope_get_named(namePtr, nameLen, pathPtr, pathLen);
export const scope_set = (scopeHandle, pathPtr, pathLen, valuePtr, valueLen) =>
  imports().scope_set(scopeHandle, pathPtr, pathLen, valuePtr, valueLen);
export const scope_set_named = (
  namePtr,
  nameLen,
  pathPtr,
  pathLen,
  valuePtr,
  valueLen,
) => imports().scope_set_named(namePtr, nameLen, pathPtr, pathLen, valuePtr, valueLen);
export const scope_delete = (scopeHandle, pathPtr, pathLen) =>
  imports().scope_delete(scopeHandle, pathPtr, pathLen);
export const scope_delete_named = (namePtr, nameLen, pathPtr, pathLen) =>
  imports().scope_delete_named(namePtr, nameLen, pathPtr, pathLen);
export const scope_flush = (scopeHandle) => imports().scope_flush(scopeHandle);
export const scope_flush_named = (namePtr, nameLen) =>
  imports().scope_flush_named(namePtr, nameLen);
export const scope_watch = (scopeHandle, pathPtr, pathLen) =>
  imports().scope_watch(scopeHandle, pathPtr, pathLen);
export const scope_watch_named = (namePtr, nameLen, pathPtr, pathLen) =>
  imports().scope_watch_named(namePtr, nameLen, pathPtr, pathLen);
export const scope_unwatch = (watchHandle) => imports().scope_unwatch(watchHandle);
export const scope_unbind = (scopeHandle) => imports().scope_unbind(scopeHandle);
export const scope_unbind_named = (namePtr, nameLen) =>
  imports().scope_unbind_named(namePtr, nameLen);
export const buffer_ptr = (bufferHandle) => imports().buffer_ptr(bufferHandle);
export const buffer_len = (bufferHandle) => imports().buffer_len(bufferHandle);
export const buffer_free = (bufferHandle) => imports().buffer_free(bufferHandle);
"#;

    fs::write(&abi_path, source)
        .map_err(|error| format!("failed to write `{}`: {error}", abi_path.display()))
}

fn patch_wasm_bindgen_import(bootstrap_path: &Path, package_path: &str) -> Result<(), String> {
    let Some(out_dir) = bootstrap_path.parent() else {
        return Ok(());
    };

    let package_file = out_dir.join(package_path);

    if !package_file.exists() {
        return Ok(());
    }

    let Some(package_dir) = package_file.parent() else {
        return Ok(());
    };

    let abi_file = out_dir.join("abi.js");
    let package_dir = fs::canonicalize(package_dir)
        .map_err(|error| format!("failed to resolve `{}`: {error}", package_dir.display()))?;
    let abi_file = fs::canonicalize(&abi_file)
        .map_err(|error| format!("failed to resolve `{}`: {error}", abi_file.display()))?;
    let abi_import = relative_module_specifier(&package_dir, &abi_file);
    let source = fs::read_to_string(&package_file)
        .map_err(|error| format!("failed to read `{}`: {error}", package_file.display()))?;
    let patched = source
        .replace("from 'angular_ts';", &format!("from '{abi_import}';"))
        .replace("from \"angular_ts\";", &format!("from \"{abi_import}\";"));

    if patched != source {
        fs::write(&package_file, patched)
            .map_err(|error| format!("failed to write `{}`: {error}", package_file.display()))?;
    }

    Ok(())
}

fn relative_module_specifier(from_dir: &Path, to_file: &Path) -> String {
    let from = normalize_components(from_dir);
    let to = normalize_components(to_file);
    let mut common = 0;

    while common < from.len() && common < to.len() && from[common] == to[common] {
        common += 1;
    }

    let mut parts = Vec::new();

    for _ in common..from.len() {
        parts.push("..".to_string());
    }

    parts.extend(to[common..].iter().cloned());

    let relative = parts.join("/");

    if relative.starts_with('.') {
        relative
    } else {
        format!("./{relative}")
    }
}

fn normalize_components(path: &Path) -> Vec<String> {
    path.components()
        .filter_map(|component| match component {
            std::path::Component::CurDir => None,
            std::path::Component::Normal(value) => Some(value.to_string_lossy().to_string()),
            std::path::Component::ParentDir => Some("..".to_string()),
            std::path::Component::RootDir => Some(String::new()),
            std::path::Component::Prefix(prefix) => {
                Some(prefix.as_os_str().to_string_lossy().to_string())
            }
        })
        .collect()
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
    app_template: Option<String>,
    #[serde(default)]
    app_template_path: Option<String>,
    #[serde(default)]
    registrations: Vec<RegistrationManifest>,
}

impl AngularTsManifest {
    fn build_registration_overrides(&self) -> Vec<RegistrationManifest> {
        let mut registrations = self.registrations.clone();

        if let Some(app_template) = &self.app_template {
            for (controller, alias) in infer_app_controllers(app_template) {
                if registrations.iter().any(|registration| {
                    registration.name == controller
                        && registration.kind == RegistrationKind::Controller
                }) {
                    continue;
                }

                registrations.push(RegistrationManifest {
                    kind: RegistrationKind::Controller,
                    name: controller,
                    export: None,
                    template: None,
                    template_path: None,
                    template_url: None,
                    controller_as: Some(alias),
                    inject: Vec::new(),
                    sync_properties: None,
                    methods: None,
                    scope_update_bind: None,
                    scope_update_unbind: None,
                    scope_update_routes: None,
                });
            }
        }

        registrations
    }

    fn resolve_template_paths(&mut self, base_dir: &Path) -> Result<(), String> {
        if let Some(app_template_path) = &self.app_template_path {
            if self.app_template.is_some() {
                return Err(
                    "manifest must not combine `appTemplate` and `appTemplatePath`".to_string(),
                );
            }

            let path = base_dir.join(app_template_path);
            let template = fs::read_to_string(&path)
                .map_err(|error| format!("failed to read `{}`: {error}", path.display()))?;
            self.app_template = Some(template);
        }

        for registration in &mut self.registrations {
            registration.resolve_template_path(base_dir)?;
        }

        Ok(())
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RegistrationManifest {
    kind: RegistrationKind,
    name: String,
    #[serde(default)]
    export: Option<String>,
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
    sync_properties: Option<Vec<String>>,
    #[serde(default)]
    methods: Option<Vec<String>>,
    #[serde(default)]
    scope_update_bind: Option<String>,
    #[serde(default)]
    scope_update_unbind: Option<String>,
    #[serde(default)]
    scope_update_routes: Option<Vec<ScopeUpdateRoute>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScopeUpdateRoute {
    path: String,
    method: String,
}

impl RegistrationManifest {
    fn registration_config(&self, _app_template: Option<&str>) -> Result<String, String> {
        let config = RegistrationConfig {
            kind: self.kind.as_str(),
            name: &self.name,
            export: self.export_name(),
            template: self.template.as_ref(),
            template_url: self.template_url.as_ref(),
            controller_as: self.component_controller_as(),
            inject: non_empty(self.inject.clone()),
            sync_properties: self.sync_properties.clone(),
            methods: self.methods.clone(),
            scope_update_bind: self.scope_update_bind.clone(),
            scope_update_unbind: self.scope_update_unbind.clone(),
            scope_update_routes: self.scope_update_routes.clone(),
        };

        serde_json::to_string(&config)
            .map_err(|error| format!("failed to encode registration `{}`: {error}", self.name))
    }

    fn export_name(&self) -> String {
        self.export.clone().unwrap_or_else(|| {
            let rust_name = upper_camel(&self.name);
            let prefix = match self.kind {
                RegistrationKind::Service | RegistrationKind::Factory => "service",
                RegistrationKind::Value => "value",
                RegistrationKind::Controller => "controller",
                RegistrationKind::Component => "component",
            };

            format!("__ng_{prefix}_{rust_name}")
        })
    }

    #[cfg(test)]
    fn controller_bridge_metadata(&self, app_template: Option<&str>) -> InferredBridgeMetadata {
        let alias = self.controller_as.clone().or_else(|| {
            app_template.and_then(|template| infer_controller_alias(template, &self.name))
        });
        let inferred = app_template
            .zip(alias.as_deref())
            .map(|(template, alias)| infer_bridge_metadata(template, alias))
            .unwrap_or_default();

        InferredBridgeMetadata {
            sync_properties: self
                .sync_properties
                .clone()
                .unwrap_or(inferred.sync_properties),
            methods: self.methods.clone().unwrap_or(inferred.methods),
        }
    }

    #[cfg(test)]
    fn component_bridge_metadata(&self) -> InferredBridgeMetadata {
        let controller_as = self
            .component_controller_as()
            .unwrap_or_else(|| "ctrl".to_string());
        let inferred = self
            .template
            .as_deref()
            .map(|template| infer_bridge_metadata(template, &controller_as))
            .unwrap_or_default();

        InferredBridgeMetadata {
            sync_properties: self
                .sync_properties
                .clone()
                .unwrap_or(inferred.sync_properties),
            methods: self.methods.clone().unwrap_or(inferred.methods),
        }
    }

    fn component_controller_as(&self) -> Option<String> {
        self.controller_as
            .clone()
            .or_else(|| self.template.as_deref().and_then(infer_template_alias))
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

#[cfg(test)]
#[derive(Debug, Default, PartialEq, Eq)]
struct InferredBridgeMetadata {
    sync_properties: Vec<String>,
    methods: Vec<String>,
}

#[cfg(test)]
fn infer_bridge_metadata(template: &str, controller_as: &str) -> InferredBridgeMetadata {
    let mut sync_properties = Vec::new();
    let mut methods = Vec::new();
    let pattern = format!("{controller_as}.");
    let mut offset = 0;

    while let Some(relative_index) = template[offset..].find(&pattern) {
        let start = offset + relative_index + pattern.len();
        let Some((identifier, end)) = read_identifier(template, start) else {
            offset = start;
            continue;
        };

        if is_method_call(template, end) {
            push_unique(&mut methods, identifier);
        } else {
            push_unique(&mut sync_properties, identifier);
        }

        offset = end;
    }

    InferredBridgeMetadata {
        sync_properties,
        methods,
    }
}

fn read_identifier(template: &str, start: usize) -> Option<(String, usize)> {
    let mut end = start;

    for (index, ch) in template[start..].char_indices() {
        let valid = if index == 0 {
            ch == '_' || ch.is_ascii_alphabetic()
        } else {
            ch == '_' || ch.is_ascii_alphanumeric()
        };

        if !valid {
            break;
        }

        end = start + index + ch.len_utf8();
    }

    (end > start).then(|| (template[start..end].to_string(), end))
}

#[cfg(test)]
fn is_method_call(template: &str, mut index: usize) -> bool {
    while let Some(ch) = template[index..].chars().next() {
        if !ch.is_whitespace() {
            return ch == '(';
        }

        index += ch.len_utf8();
    }

    false
}

#[cfg(test)]
fn push_unique(values: &mut Vec<String>, value: String) {
    if !values.iter().any(|existing| existing == &value) {
        values.push(value);
    }
}

#[cfg(test)]
fn infer_controller_alias(template: &str, controller_name: &str) -> Option<String> {
    let pattern = format!("{controller_name} as ");
    let start = template.find(&pattern)? + pattern.len();
    read_identifier(template, start).map(|(alias, _)| alias)
}

fn infer_app_controllers(template: &str) -> Vec<(String, String)> {
    let mut controllers = Vec::new();
    let mut offset = 0;

    while let Some(relative_index) = template[offset..].find("ng-controller=\"") {
        let start = offset + relative_index + "ng-controller=\"".len();
        let end = template[start..]
            .find('"')
            .map(|end| start + end)
            .unwrap_or(template.len());
        let expression = &template[start..end];

        if let Some((controller, alias)) = expression.split_once(" as ") {
            let controller = controller.trim();
            let alias = alias.trim();

            if !controller.is_empty()
                && !alias.is_empty()
                && !controllers
                    .iter()
                    .any(|(existing, _)| existing == controller)
            {
                controllers.push((controller.to_string(), alias.to_string()));
            }
        }

        offset = end;
    }

    controllers
}

fn infer_template_alias(template: &str) -> Option<String> {
    let mut offset = 0;

    while let Some(dot) = template[offset..].find('.') {
        let dot = offset + dot;
        let start = template[..dot]
            .char_indices()
            .rev()
            .find_map(|(index, ch)| {
                let valid = ch == '_' || ch.is_ascii_alphanumeric();
                (!valid).then_some(index + ch.len_utf8())
            })
            .unwrap_or(0);

        if let Some((alias, end)) = read_identifier(template, start) {
            if end == dot {
                return Some(alias);
            }
        }

        offset = dot + 1;
    }

    None
}

fn upper_camel(value: &str) -> String {
    let mut output = String::new();
    let mut uppercase_next = true;

    for ch in value.chars() {
        if ch == '_' || ch == '-' || ch == '.' || ch == ':' {
            uppercase_next = true;
        } else if uppercase_next {
            output.extend(ch.to_uppercase());
            uppercase_next = false;
        } else {
            output.push(ch);
        }
    }

    output
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum RegistrationKind {
    Service,
    Factory,
    Value,
    Controller,
    Component,
}

impl RegistrationKind {
    const fn as_str(self) -> &'static str {
        match self {
            RegistrationKind::Service => "service",
            RegistrationKind::Factory => "factory",
            RegistrationKind::Value => "value",
            RegistrationKind::Controller => "controller",
            RegistrationKind::Component => "component",
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RegistrationConfig<'a> {
    kind: &'static str,
    name: &'a str,
    export: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    template: Option<&'a String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    template_url: Option<&'a String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    controller_as: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    inject: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    sync_properties: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    methods: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    scope_update_bind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    scope_update_unbind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    scope_update_routes: Option<Vec<ScopeUpdateRoute>>,
}

fn non_empty(values: Vec<String>) -> Option<Vec<String>> {
    (!values.is_empty()).then_some(values)
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

    fn snapshot_manifest() -> AngularTsManifest {
        AngularTsManifest {
            module: "rustDemo".to_string(),
            package: "./pkg/basic_app.js".to_string(),
            requires: vec![],
            bootstrap: true,
            app_template: Some(
                r#"<section ng-controller="demoInfo as info">
  <p>{{ info.title }}</p>
</section>"#
                    .to_string(),
            ),
            app_template_path: None,
            registrations: vec![
                RegistrationManifest {
                    kind: RegistrationKind::Factory,
                    name: "todoStore".to_string(),
                    export: None,
                    template: None,
                    template_path: None,
                    template_url: None,
                    controller_as: None,
                    inject: vec![],
                    sync_properties: None,
                    methods: None,
                    scope_update_bind: None,
                    scope_update_unbind: None,
                    scope_update_routes: None,
                },
                RegistrationManifest {
                    kind: RegistrationKind::Value,
                    name: "appTitle".to_string(),
                    export: None,
                    template: None,
                    template_path: None,
                    template_url: None,
                    controller_as: None,
                    inject: vec![],
                    sync_properties: None,
                    methods: None,
                    scope_update_bind: None,
                    scope_update_unbind: None,
                    scope_update_routes: None,
                },
                RegistrationManifest {
                    kind: RegistrationKind::Controller,
                    name: "demoInfo".to_string(),
                    export: None,
                    template: None,
                    template_path: None,
                    template_url: None,
                    controller_as: Some("info".to_string()),
                    inject: vec!["appTitle".to_string()],
                    sync_properties: None,
                    methods: None,
                    scope_update_bind: None,
                    scope_update_unbind: None,
                    scope_update_routes: None,
                },
                RegistrationManifest {
                    kind: RegistrationKind::Component,
                    name: "todoList".to_string(),
                    export: None,
                    template: Some(
                        r#"<p>{{ ctrl.remainingCount }} of {{ ctrl.items.length }}</p>
<form ng-submit="ctrl.add(newTodo)"></form>
<button ng-click="ctrl.archive()"></button>
<li ng-repeat="todo in ctrl.items" ng-click="ctrl.toggle($index)"></li>"#
                            .to_string(),
                    ),
                    template_path: None,
                    template_url: None,
                    controller_as: None,
                    inject: vec!["todoStore".to_string(), "$scope".to_string()],
                    sync_properties: None,
                    methods: None,
                    scope_update_bind: None,
                    scope_update_unbind: None,
                    scope_update_routes: None,
                },
            ],
        }
    }

    fn assert_snapshot(name: &str, actual: &str) {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("snapshots")
            .join(name);
        let expected = fs::read_to_string(&path)
            .unwrap_or_else(|error| panic!("failed to read `{}`: {error}", path.display()));

        assert_eq!(expected.trim_end(), actual.trim_end());
    }

    fn controller_bridge_snapshot(source: &str) -> &str {
        let start = source
            .find("let nextWasmScopeId = 0;")
            .expect("bootstrap should define Wasm scope ids");
        let end = source
            .find("const module = angular.module")
            .expect("bootstrap should register an AngularTS module");

        source[start..end].trim_end()
    }

    fn registrations_snapshot(source: &str) -> &str {
        let start = source
            .find("const module = angular.module")
            .expect("bootstrap should register an AngularTS module");

        source[start..].trim_end()
    }

    #[test]
    fn manifest_bootstrap_matches_snapshots() {
        let manifest = snapshot_manifest();

        let source = manifest_bootstrap_js(&manifest).unwrap();

        assert!(source.contains("import { angular, WasmScopeAbi }"));
        assert!(source.contains("globalThis.__angularTsWasmScopeAbi = scopeAbi;"));
        assert!(source.contains("const readBridgeMetadata = (registration) =>"));
        assert!(source.contains("app[`${exportName}_bridgeMetadata`]"));
        assert!(!source.contains("angularScope.$watch("));
        assert!(!source.contains("$watchCollection"));
        assert_snapshot(
            "controller_bridge.snapshot.js",
            controller_bridge_snapshot(&source),
        );
        assert_snapshot("registrations.snapshot.js", registrations_snapshot(&source));
    }

    #[test]
    fn bridge_metadata_is_inferred_from_component_template() {
        let metadata = infer_bridge_metadata(
            r#"
              <p>{{ ctrl.remainingCount }} of {{ ctrl.items.length }}</p>
              <form ng-submit="ctrl.add(newTodo)"></form>
              <button ng-click="ctrl.archive()"></button>
              <li ng-repeat="todo in ctrl.items">
                <input ng-click="ctrl.toggle($index)" />
              </li>
            "#,
            "ctrl",
        );

        assert_eq!(metadata.sync_properties, vec!["remainingCount", "items"]);
        assert_eq!(metadata.methods, vec!["add", "archive", "toggle"]);
    }

    #[test]
    fn controller_metadata_is_inferred_from_app_template_alias() {
        let registration = RegistrationManifest {
            kind: RegistrationKind::Controller,
            name: "demoInfo".to_string(),
            export: None,
            template: None,
            template_path: None,
            template_url: None,
            controller_as: None,
            inject: vec!["appTitle".to_string()],
            sync_properties: None,
            methods: None,
            scope_update_bind: None,
            scope_update_unbind: None,
            scope_update_routes: None,
        };
        let metadata = registration.controller_bridge_metadata(Some(
            r#"<section ng-controller="demoInfo as info">
              <p>{{ info.title }}</p>
            </section>"#,
        ));

        assert_eq!(metadata.sync_properties, vec!["title"]);
        assert_eq!(metadata.methods, Vec::<String>::new());
    }

    #[test]
    fn component_controller_alias_is_inferred_from_template() {
        let registration = RegistrationManifest {
            kind: RegistrationKind::Component,
            name: "todoList".to_string(),
            export: None,
            template: Some(
                r#"<p>{{ ctrl.remainingCount }}</p>
<button ng-click="ctrl.archive()"></button>"#
                    .to_string(),
            ),
            template_path: None,
            template_url: None,
            controller_as: None,
            inject: vec![],
            sync_properties: None,
            methods: None,
            scope_update_bind: None,
            scope_update_unbind: None,
            scope_update_routes: None,
        };

        assert_eq!(
            registration.component_controller_as().as_deref(),
            Some("ctrl")
        );
        assert_eq!(
            registration.component_bridge_metadata().sync_properties,
            vec!["remainingCount"]
        );
    }

    #[test]
    fn export_names_are_inferred_from_registration_names() {
        let registrations = snapshot_manifest().registrations;

        assert_eq!(registrations[0].export_name(), "__ng_service_TodoStore");
        assert_eq!(registrations[1].export_name(), "__ng_value_AppTitle");
        assert_eq!(registrations[2].export_name(), "__ng_controller_DemoInfo");
        assert_eq!(registrations[3].export_name(), "__ng_component_TodoList");
    }

    #[test]
    fn relative_module_specifier_targets_generated_abi_adapter() {
        let from = Path::new("examples/basic_app/pkg");
        let to = Path::new("examples/basic_app/.angular-ts/abi.js");

        assert_eq!(relative_module_specifier(from, to), "../.angular-ts/abi.js");
    }
}
