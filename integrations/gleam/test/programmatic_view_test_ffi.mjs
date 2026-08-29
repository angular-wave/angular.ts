function marker(kind, values = {}) {
  return { kind, ...values };
}

export function install_programmatic_runtime() {
  globalThis.angular = {
    view: {
      attrs: (values) => marker("attrs", { values }),
      each: (read, key, render) => marker("each", { key, read, render }),
      event: (listener, options) => marker("event", { listener, options }),
      props: (values) => marker("props", { values }),
      tag: (name, properties, ...children) =>
        marker("view-tag", { children, name, properties }),
      tagNS: (namespaceUri, name, properties, ...children) =>
        marker("view-tag-ns", { children, name, namespaceUri, properties }),
    },
  };
}
