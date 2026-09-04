//! Real-DOM view helpers for Rust/Wasm components.

#![cfg(target_arch = "wasm32")]

use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::{JsCast, JsValue};

/// DOM value returned by a programmatic component view.
pub type ProgrammaticViewChild = JsValue;

/// Primitive text value accepted as a programmatic view child.
pub type ProgrammaticViewPrimitive = JsValue;

/// JavaScript callback registered as a programmatic component view.
pub type ProgrammaticView = Function;

/// Component registration definition accepted by AngularTS.
pub type ComponentDefinition = Object;

/// Property bag passed to a programmatic tag factory.
pub type ProgrammaticViewProperties = Object;

/// Property value accepted by a programmatic tag factory.
pub type ProgrammaticViewPropertyValue = JsValue;

/// JavaScript function that creates one real DOM element.
pub type ProgrammaticViewTag = Function;

/// Typed wrapper around the context supplied to a component view export.
#[derive(Clone)]
pub struct ProgrammaticViewContext {
    raw: JsValue,
}

impl ProgrammaticViewContext {
    /// Wraps the JavaScript context supplied by AngularTS.
    pub fn new(raw: JsValue) -> Self {
        Self { raw }
    }

    /// Returns the component controller.
    pub fn controller(&self) -> Result<JsValue, JsValue> {
        self.property("controller")
    }

    /// Returns the scope that owns the generated DOM.
    pub fn scope(&self) -> Result<JsValue, JsValue> {
        self.property("scope")
    }

    /// Returns the component host element.
    pub fn host(&self) -> Result<JsValue, JsValue> {
        self.property("host")
    }

    /// Returns the component transclusion callback.
    pub fn transclude(&self) -> Result<Function, JsValue> {
        self.property("transclude")?.dyn_into::<Function>()
    }

    /// Returns the unwrapped JavaScript context.
    pub fn raw(&self) -> &JsValue {
        &self.raw
    }

    fn property(&self, name: &str) -> Result<JsValue, JsValue> {
        Reflect::get(&self.raw, &JsValue::from_str(name))
    }
}

/// Wrapper around `angular.tags` and namespaced tag collections.
#[derive(Clone)]
pub struct ProgrammaticViewTags {
    raw: JsValue,
}

impl ProgrammaticViewTags {
    /// Resolves the global AngularTS tag collection.
    pub fn global() -> Result<Self, JsValue> {
        let angular = Reflect::get(&js_sys::global(), &JsValue::from_str("angular"))?;
        let raw = Reflect::get(&angular, &JsValue::from_str("tags"))?;

        Ok(Self { raw })
    }

    /// Resolves a namespaced tag collection, such as SVG or MathML.
    pub fn namespace(&self, namespace_uri: &str) -> Result<Self, JsValue> {
        let factory = self.raw.clone().dyn_into::<Function>()?;
        let raw = factory.call1(&JsValue::UNDEFINED, &JsValue::from_str(namespace_uri))?;

        Ok(Self { raw })
    }

    /// Creates one real DOM element through `angular.tags[name]`.
    pub fn tag(
        &self,
        name: &str,
        properties: &ProgrammaticViewProperties,
        children: &[ProgrammaticViewChild],
    ) -> Result<ProgrammaticViewChild, JsValue> {
        let factory =
            Reflect::get(&self.raw, &JsValue::from_str(name))?.dyn_into::<ProgrammaticViewTag>()?;
        let arguments = Array::new();
        arguments.push(properties);
        for child in children {
            arguments.push(child);
        }

        Reflect::apply(&factory, &JsValue::UNDEFINED, &arguments)
    }

    /// Returns the raw JavaScript tag collection.
    pub fn raw(&self) -> &JsValue {
        &self.raw
    }
}
