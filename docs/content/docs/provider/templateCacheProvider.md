---
title: "$templateCacheProvider"
description: "Configure the cache backing the $templateCache service."
---

`$templateCacheProvider` initializes the cache used by `$templateCache`. The
default cache is a `Map`, but applications can provide another implementation
that satisfies the `TemplateCache` contract.

Exact signatures live in TypeDoc:

- [`TemplateCacheProvider`](../../../typedoc/classes/TemplateCacheProvider.html)
- [`TemplateCache`](../../../typedoc/types/TemplateCache.html)

## Use A Custom Cache

```js
class LocalStorageTemplateCache {
  constructor(prefix = "tpl:") {
    this.prefix = prefix;
  }

  key(name) {
    return `${this.prefix}${name}`;
  }

  get(name) {
    const value = localStorage.getItem(this.key(name));
    return value === null ? undefined : value;
  }

  set(name, value) {
    localStorage.setItem(this.key(name), value);
    return this;
  }

  has(name) {
    return localStorage.getItem(this.key(name)) !== null;
  }

  delete(name) {
    localStorage.removeItem(this.key(name));
    return true;
  }

  clear() {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(this.prefix))
      .forEach((key) => localStorage.removeItem(key));
  }
}

angular.module("demo", []).config(($templateCacheProvider) => {
  $templateCacheProvider.cache = new LocalStorageTemplateCache();
});
```

Custom caches are useful when templates should survive reloads, be shared across
tabs, or be backed by another browser storage layer.

For service usage, see [$templateCache]({{< relref "/docs/service/templateCache" >}}).
