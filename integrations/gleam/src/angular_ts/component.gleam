import angular_ts/injectable.{type Injectable}
import angular_ts/unsafe
import gleam/dynamic.{type Dynamic}
import gleam/list
import gleam/option.{type Option, None, Some}

pub type BindingMode {
  Text
  OneWay
  TwoWay
  Expression
}

pub opaque type Binding {
  Binding(mode: BindingMode, optional: Bool)
}

pub type BindingEntry {
  BindingEntry(name: String, binding: Binding)
}

pub type RequireEntry {
  RequireEntry(property: String, controller: String)
}

pub type Transclusion {
  NoTransclusion
  ContentTransclusion
  SlotTransclusion(List(TransclusionSlot))
}

pub type TransclusionSlot {
  TransclusionSlot(name: String, selector: String)
}

pub opaque type Component(controller) {
  Component(
    template: Option(String),
    template_url: Option(String),
    controller: Injectable(controller),
    controller_as: Option(String),
    bindings: List(BindingEntry),
    transclusion: Transclusion,
    require: List(RequireEntry),
  )
}

pub fn new(
  template: String,
  controller: Injectable(controller),
) -> Component(controller) {
  Component(
    template: Some(template),
    template_url: None,
    controller: controller,
    controller_as: None,
    bindings: [],
    transclusion: NoTransclusion,
    require: [],
  )
}

pub fn with_template_url(
  template_url: String,
  controller: Injectable(controller),
) -> Component(controller) {
  Component(
    template: None,
    template_url: Some(template_url),
    controller: controller,
    controller_as: None,
    bindings: [],
    transclusion: NoTransclusion,
    require: [],
  )
}

pub fn controller_as(
  component: Component(controller),
  alias: String,
) -> Component(controller) {
  Component(..component, controller_as: Some(alias))
}

pub fn binding(
  component: Component(controller),
  name: String,
  binding: Binding,
) -> Component(controller) {
  Component(..component, bindings: [
    BindingEntry(name, binding),
    ..component.bindings
  ])
}

pub fn require(
  component: Component(controller),
  property: String,
  controller_name: String,
) -> Component(controller) {
  Component(..component, require: [
    RequireEntry(property, controller_name),
    ..component.require
  ])
}

pub fn transclude_content(
  component: Component(controller),
) -> Component(controller) {
  Component(..component, transclusion: ContentTransclusion)
}

pub fn transclude_slot(
  component: Component(controller),
  name: String,
  selector: String,
) -> Component(controller) {
  let slots = case component.transclusion {
    SlotTransclusion(slots) -> slots
    NoTransclusion | ContentTransclusion -> []
  }

  Component(
    ..component,
    transclusion: SlotTransclusion([TransclusionSlot(name, selector), ..slots]),
  )
}

pub fn text_binding(optional: Bool) -> Binding {
  Binding(Text, optional)
}

pub fn one_way_binding(optional: Bool) -> Binding {
  Binding(OneWay, optional)
}

pub fn two_way_binding(optional: Bool) -> Binding {
  Binding(TwoWay, optional)
}

pub fn expression_binding(optional: Bool) -> Binding {
  Binding(Expression, optional)
}

pub fn binding_symbol(binding: Binding) -> String {
  let base = case binding.mode {
    Text -> "@"
    OneWay -> "<"
    TwoWay -> "="
    Expression -> "&"
  }

  case binding.optional {
    True -> base <> "?"
    False -> base
  }
}

pub fn to_js_object(definition: Component(controller)) -> Dynamic {
  let object = unsafe.empty_object()

  case definition.template {
    Some(template) -> unsafe.set_string(object, "template", template)
    None -> object
  }

  case definition.template_url {
    Some(template_url) -> unsafe.set_string(object, "templateUrl", template_url)
    None -> object
  }

  unsafe.set_property(
    object,
    "controller",
    injectable.to_annotated_array(definition.controller),
  )

  case definition.controller_as {
    Some(alias) -> unsafe.set_string(object, "controllerAs", alias)
    None -> object
  }

  case definition.bindings {
    [] -> object
    bindings ->
      unsafe.set_property(object, "bindings", bindings_to_js(bindings))
  }

  case definition.transclusion {
    NoTransclusion -> object
    ContentTransclusion -> unsafe.set_bool(object, "transclude", True)
    SlotTransclusion(slots) ->
      unsafe.set_property(object, "transclude", transclusion_slots_to_js(slots))
  }

  case definition.require {
    [] -> object
    require -> unsafe.set_property(object, "require", require_to_js(require))
  }
}

fn bindings_to_js(bindings: List(BindingEntry)) -> Dynamic {
  list.fold(bindings, unsafe.empty_object(), fn(object, entry) {
    let BindingEntry(name, binding) = entry
    unsafe.set_string(object, name, binding_symbol(binding))
  })
}

fn transclusion_slots_to_js(slots: List(TransclusionSlot)) -> Dynamic {
  list.fold(slots, unsafe.empty_object(), fn(object, slot) {
    let TransclusionSlot(name, selector) = slot
    unsafe.set_string(object, name, selector)
  })
}

fn require_to_js(require: List(RequireEntry)) -> Dynamic {
  list.fold(require, unsafe.empty_object(), fn(object, entry) {
    let RequireEntry(property, controller) = entry
    unsafe.set_string(object, property, controller)
  })
}
