/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("$templateCache", () => {
  let templateCache: any,
    templateCacheProvider: any,
    el: any,
    $compile: any,
    $scope: any;

  beforeEach(() => {
    el = document.getElementById("app");
    el.innerHTML = "";
    const angular = new Angular();

    angular.module("default", []).config(($templateCacheProvider) => {
      templateCacheProvider = $templateCacheProvider;
      templateCacheProvider.cache.set("test", "hello");
    });
    angular
      .bootstrap(el, ["default"])
      .invoke((_$templateCache_: any, _$compile_: any, _$rootScope_: any) => {
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
    window.angular = new Angular();
    window.angular
      .module("customStorage", [])
      .config(($templateCacheProvider) => {
        templateCacheProvider = $templateCacheProvider;
        templateCacheProvider.cache = new LocalStorageMap();
        templateCacheProvider.cache.set("test", "hello");
      });
    window.angular
      .bootstrap(el, ["customStorage"])
      .invoke((_$templateCache_: any, _$compile_: any, _$rootScope_: any) => {
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
  prefix: string;

  constructor(prefix = "") {
    this.prefix = prefix;
  }

  _key(key: any) {
    return `${this.prefix}${key}`;
  }

  get(key: any) {
    const raw = localStorage.getItem(this._key(key));

    if (raw === null) return undefined;

    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  set(key: any, value: any) {
    localStorage.setItem(this._key(key), value);

    return this;
  }

  has(key: any) {
    return localStorage.getItem(this._key(key)) !== null;
  }

  delete(key: any) {
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
