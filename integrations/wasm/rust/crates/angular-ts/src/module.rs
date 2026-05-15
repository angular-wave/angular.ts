use crate::{ComponentController, InjectionMetadata, Service, TemplateSource};

/// AngularTS module facade used by Rust-authored applications.
#[derive(Debug, Clone)]
pub struct NgModule {
    name: &'static str,
    registrations: Vec<Registration>,
}

impl NgModule {
    /// Creates a module metadata collector.
    pub fn new(name: &'static str) -> Self {
        Self {
            name,
            registrations: Vec::new(),
        }
    }

    /// Returns the AngularTS module name.
    pub const fn name(&self) -> &'static str {
        self.name
    }

    /// Returns the registrations collected for generated glue.
    pub fn registrations(&self) -> &[Registration] {
        &self.registrations
    }

    /// Registers a Rust service type.
    pub fn service<T: Service + 'static>(&mut self) -> &mut Self {
        self.push_basic(
            RegistrationKind::Service,
            T::TOKEN_NAME,
            T::EXPORT_NAME,
            std::any::type_name::<T>(),
        )
    }

    /// Registers a Rust factory type.
    pub fn factory<T: Factory + 'static>(&mut self) -> &mut Self {
        self.push_basic(
            RegistrationKind::Factory,
            T::TOKEN_NAME,
            T::EXPORT_NAME,
            std::any::type_name::<T>(),
        )
    }

    /// Registers a Rust value type.
    pub fn value<T: Value + 'static>(&mut self) -> &mut Self {
        self.push_basic(
            RegistrationKind::Value,
            T::TOKEN_NAME,
            T::EXPORT_NAME,
            std::any::type_name::<T>(),
        )
    }

    /// Registers a Rust standalone controller type.
    pub fn controller<T: Controller + 'static>(&mut self) -> &mut Self {
        self.push(
            RegistrationKind::Controller,
            T::NAME,
            T::EXPORT_NAME,
            std::any::type_name::<T>(),
            None,
            None,
            T::INJECTIONS.to_vec(),
        )
    }

    /// Registers a Rust component controller type.
    pub fn component<T: ComponentController + 'static>(&mut self) -> &mut Self {
        let metadata = T::METADATA;
        let (template, template_url) = match metadata.template() {
            TemplateSource::Inline(template) => (Some(template), None),
            TemplateSource::Url(template_url) => (None, Some(template_url)),
        };

        self.push(
            RegistrationKind::Component,
            T::NAME,
            T::EXPORT_NAME,
            std::any::type_name::<T>(),
            template,
            template_url,
            metadata.injections().to_vec(),
        )
    }

    fn push_basic(
        &mut self,
        kind: RegistrationKind,
        angular_name: &'static str,
        export_name: &'static str,
        rust_type: &'static str,
    ) -> &mut Self {
        self.push(
            kind,
            angular_name,
            export_name,
            rust_type,
            None,
            None,
            Vec::new(),
        )
    }

    fn push(
        &mut self,
        kind: RegistrationKind,
        angular_name: &'static str,
        export_name: &'static str,
        rust_type: &'static str,
        template: Option<&'static str>,
        template_url: Option<&'static str>,
        injections: Vec<InjectionMetadata>,
    ) -> &mut Self {
        self.registrations.push(Registration {
            kind,
            angular_name,
            export_name,
            rust_type,
            template,
            template_url,
            injections,
        });
        self
    }
}

/// Registration captured for generated AngularTS glue.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Registration {
    pub kind: RegistrationKind,
    pub angular_name: &'static str,
    pub export_name: &'static str,
    pub rust_type: &'static str,
    pub template: Option<&'static str>,
    pub template_url: Option<&'static str>,
    pub injections: Vec<InjectionMetadata>,
}

/// AngularTS registration kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RegistrationKind {
    Service,
    Factory,
    Value,
    Controller,
    Component,
}

/// Marker trait for Rust factories exposed through AngularTS DI.
pub trait Factory {
    const TOKEN_NAME: &'static str;
    const EXPORT_NAME: &'static str;
}

/// Marker trait for Rust values exposed through AngularTS DI.
pub trait Value {
    const TOKEN_NAME: &'static str;
    const EXPORT_NAME: &'static str;
}

/// Marker trait for Rust standalone controllers.
pub trait Controller {
    const NAME: &'static str;
    const EXPORT_NAME: &'static str;
    const INJECTIONS: &'static [InjectionMetadata] = &[];
}

/// Serializes module registration metadata for generated JavaScript glue.
pub fn module_manifest_json(module: &NgModule) -> String {
    let mut output = String::from("{\"registrations\":[");

    for (index, registration) in module.registrations().iter().enumerate() {
        if index > 0 {
            output.push(',');
        }

        output.push('{');
        push_json_property(&mut output, "kind", registration.kind.as_str());
        output.push(',');
        push_json_property(&mut output, "name", registration.angular_name);
        output.push(',');
        push_json_property(&mut output, "export", registration.export_name);

        if let Some(template) = registration.template {
            output.push(',');
            push_json_property(&mut output, "template", template);
        }

        if let Some(template_url) = registration.template_url {
            output.push(',');
            push_json_property(&mut output, "templateUrl", template_url);
        }

        if !registration.injections.is_empty() {
            output.push_str(",\"inject\":[");
            for (index, injection) in registration.injections.iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                push_json_string(&mut output, injection.token());
            }
            output.push(']');
        }

        output.push('}');
    }

    output.push_str("]}");
    output
}

impl RegistrationKind {
    fn as_str(self) -> &'static str {
        match self {
            RegistrationKind::Service => "service",
            RegistrationKind::Factory => "factory",
            RegistrationKind::Value => "value",
            RegistrationKind::Controller => "controller",
            RegistrationKind::Component => "component",
        }
    }
}

fn push_json_property(output: &mut String, key: &str, value: &str) {
    push_json_string(output, key);
    output.push(':');
    push_json_string(output, value);
}

fn push_json_string(output: &mut String, value: &str) {
    output.push('"');

    for ch in value.chars() {
        match ch {
            '"' => output.push_str("\\\""),
            '\\' => output.push_str("\\\\"),
            '\n' => output.push_str("\\n"),
            '\r' => output.push_str("\\r"),
            '\t' => output.push_str("\\t"),
            ch if ch.is_control() => {
                output.push_str(&format!("\\u{:04x}", ch as u32));
            }
            ch => output.push(ch),
        }
    }

    output.push('"');
}
