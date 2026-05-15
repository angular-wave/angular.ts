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

export function call_method1(target, method, arg1) {
  return target[method](arg1);
}

export function call_method2(target, method, arg1, arg2) {
  return target[method](arg1, arg2);
}

export function call_method3(target, method, arg1, arg2, arg3) {
  return target[method](arg1, arg2, arg3);
}

export function annotated_array(tokens, factory) {
  return [...tokens, factory];
}

export function angular_module(name, requires) {
  return getAngular().module(name, requires);
}

export function angular_bootstrap(root, modules, config) {
  return getAngular().bootstrap(root, modules, config);
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
