import { Angular } from "../../angular.js";
import { dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("$templateCache", () => {
  let templateCache, templateCacheProvider, el, $compile, $scope;

  beforeEach(() => {
    el = document.getElementById("app");
    el.innerHTML = "";
    let angular = new Angular();
    angular.module("default", []).config(($templateCacheProvider) => {
      templateCacheProvider = $templateCacheProvider;
      templateCacheProvider.cache.set("test", "hello");
    });
    angular
      .bootstrap(el, ["default"])
      .invoke((_$templateCache_, _$compile_, _$rootScope_) => {
        templateCache = _$templateCache_;
        $compile = _$compile_;
        $scope = _$rootScope_;
      });
  });

  afterEach(() => {
    dealoc(el);
  });

  it("should be available as provider", () => {
    expect(templateCacheProvider).toBeDefined();
  });

  it("should be available as a service", () => {
    expect(templateCache).toBeDefined();
    expect(templateCache).toEqual(templateCacheProvider.cache);
    expect(templateCache instanceof Map).toBeTrue();
    expect(templateCache.get("test")).toEqual("hello");
  });

  it("should can be accessed via `ng-include`", async () => {
    el.innerHTML = `
        <div ng-include="'test'">test</div>
    `;
    expect(el.innerText).toEqual("test");
    $compile(el)($scope);
    await wait();
    expect(el.innerText).toEqual("hello");
  });

  it("can be leader via `text/ng-template`", async () => {
    el.innerHTML = `
      <script type="text/ng-template" id="templateId.html">
        <p>This is the content of the template</p>
      </script>
    `;
    $compile(el)($scope);
    await wait();
    expect(templateCache.get("templateId.html").trim()).toEqual(
      "<p>This is the content of the template</p>",
    );
  });

  it("can be swapped for localStorage", async () => {
    dealoc(el);
    angular = new Angular();
    angular.module("customStorage", []).config(($templateCacheProvider) => {
      templateCacheProvider = $templateCacheProvider;
      templateCacheProvider.cache = new LocalStorageMap();
      templateCacheProvider.cache.set("test", "hello");
    });
    angular
      .bootstrap(el, ["customStorage"])
      .invoke((_$templateCache_, _$compile_, _$rootScope_) => {
        templateCache = _$templateCache_;
        $compile = _$compile_;
        $scope = _$rootScope_;
      });

    expect(templateCache instanceof LocalStorageMap).toBeTrue();
    el.innerHTML = `
        <div ng-include="'test'">test</div>
      `;
    expect(el.innerText).toEqual("test");
    $compile(el)($scope);
    await wait();
    expect(el.innerText).toEqual("hello");
    expect(window.localStorage.getItem("test")).toEqual("hello");
  });
});

class LocalStorageMap {
  constructor(prefix = "") {
    this.prefix = prefix;
  }

  _key(key) {
    return `${this.prefix}${key}`;
  }

  get(key) {
    const raw = localStorage.getItem(this._key(key));
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  set(key, value) {
    localStorage.setItem(this._key(key), value);
    return this;
  }

  has(key) {
    return localStorage.getItem(this._key(key)) !== null;
  }

  delete(key) {
    localStorage.removeItem(this._key(key));
    return true;
  }

  clear() {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  }
}
