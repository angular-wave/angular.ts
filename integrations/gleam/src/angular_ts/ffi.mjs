function getAngular() {
  const angular = globalThis.angular;
  if (!angular) {
    throw new Error("AngularTS runtime is not available on globalThis.angular");
  }

  return angular;
}

export function identity(value) {
  return value;
}

export function empty_object() {
  return {};
}

export function set_property(target, key, value) {
  target[key] = value;
  return target;
}

export function set_string(target, key, value) {
  target[key] = value;
  return target;
}

export function set_bool(target, key, value) {
  target[key] = value;
  return target;
}

export function get_property(target, key) {
  return target[key];
}

export function programmatic_event(listener) {
  return getAngular().view.event(listener);
}

export function programmatic_event_with_options(listener, options) {
  return getAngular().view.event(listener, options);
}

export function programmatic_attrs(properties) {
  return getAngular().view.attrs(Object.fromEntries(properties));
}

export function programmatic_props(properties) {
  return getAngular().view.props(Object.fromEntries(properties));
}

export function programmatic_each(read, key, render) {
  return getAngular().view.each(read, key, render);
}

export function programmatic_view_tag(name, properties, children) {
  return getAngular().view.tag(name, Object.fromEntries(properties), ...children);
}

export function programmatic_view_tag_ns(namespaceUri, name, properties, children) {
  return getAngular().view.tagNS(
    namespaceUri,
    name,
    Object.fromEntries(properties),
    ...children,
  );
}

export function call_method1(target, method, arg1) {
  return target[method](arg1);
}

export function call_method0(target, method) {
  return target[method]();
}

export function call_method2(target, method, arg1, arg2) {
  return target[method](arg1, arg2);
}

export function call_method3(target, method, arg1, arg2, arg3) {
  return target[method](arg1, arg2, arg3);
}

export function call_function0(target) {
  return target();
}

export function call_function2(target, arg1, arg2) {
  return target(arg1, arg2);
}

export function annotated_array(tokens, factory) {
  return [...tokens, factory];
}

export function wrap_factory_property(factory, key, value) {
  return (...args) => {
    const definition = factory(...args);
    definition[key] = value;
    return definition;
  };
}

export function angular_module(name, requires) {
  return getAngular().module(name, requires);
}

export function angular_bootstrap(root, modules) {
  return getAngular().bootstrap(root, modules);
}

export function document_body() {
  if (!globalThis.document || !globalThis.document.body) {
    throw new Error("document.body is not available");
  }

  return globalThis.document.body;
}

export function string_constructor() {
  return String;
}

export function number_constructor() {
  return Number;
}

export function boolean_constructor() {
  return Boolean;
}
