import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(scriptDir, "refine-generated-jsinterop-types.mjs");

function fixture(files) {
  const root = mkdtempSync(resolve(tmpdir(), "angular-ts-jsinterop-types-"));
  const packageDir = resolve(root, "org/angular/ts/ng");
  mkdirSync(packageDir, { recursive: true });

  for (const [name, source] of Object.entries(files)) {
    writeFileSync(resolve(packageDir, `${name}.java`), source);
  }

  return {
    read(name) {
      return readFileSync(resolve(packageDir, `${name}.java`), "utf8");
    },
    root,
  };
}

test("restores named callbacks and collection types erased by JsInterop", () => {
  const generated = fixture({
    Directive: [
      "package org.angular.ts.ng;",
      "public interface Directive<TController extends Object>{}",
    ].join("\n"),
    DirectiveFactoryFn: [
      "package org.angular.ts.ng;",
      "import jsinterop.annotations.JsFunction;",
      "@JsFunction",
      "public interface DirectiveFactoryFn{",
      "Directive onInvoke();",
      "}",
    ].join("\n"),
    Directive: [
      "package org.angular.ts.ng;",
      "public interface Directive<TController extends Object>{",
      "Object getCompile();",
      "void setCompile(Object compile);",
      "}",
    ].join("\n"),
    WebSocketConfig: [
      "package org.angular.ts.ng;",
      "public interface WebSocketConfig{",
      "Object getProtocols();",
      "void setProtocols(Object protocols);",
      "Object getOnOpen();",
      "void setOnOpen(Object onOpen);",
      "}",
    ].join("\n"),
  });

  try {
    execFileSync(process.execPath, [scriptPath, generated.root]);

    assert.match(
      generated.read("Directive"),
      /DirectiveCompileFn getCompile\(\)/,
    );
    assert.match(
      generated.read("DirectiveFactoryFn"),
      /Object onInvoke\(\)/,
    );
    assert.match(
      generated.read("DirectiveCompileFn"),
      /@JsFunction[\s\S]*HTMLElement templateElement/,
    );
    assert.match(
      generated.read("WebSocketConfig"),
      /elemental2\.core\.JsArray<String> getProtocols\(\)/,
    );
    assert.match(
      generated.read("WebSocketConfig"),
      /interface OnOpenCallback[\s\S]*elemental2\.dom\.Event event/,
    );
  } finally {
    rmSync(generated.root, { force: true, recursive: true });
  }
});

test("restores method listeners, subscriptions, records, and rest parameters", () => {
  const generated = fixture({
    CookieService: [
      "package org.angular.ts.ng;",
      "public interface CookieService{",
      "Object getAll();",
      "}",
    ].join("\n"),
    EventBusService: [
      "package org.angular.ts.ng;",
      "public class EventBusService{",
      "public native boolean publish(String topic,Object... var_args);",
      "public native Object subscribe(String topic,Object fn);",
      "public native boolean unsubscribe(String topic,Object fn);",
      "public final Object subscribe(String topic){",
      "return subscribe(topic,Js.uncheckedCast(null));",
      "}",
      "}",
    ].join("\n"),
  });

  try {
    execFileSync(process.execPath, [scriptPath, generated.root]);

    assert.match(
      generated.read("CookieService"),
      /jsinterop\.base\.JsPropertyMap<String> getAll\(\)/,
    );
    assert.match(
      generated.read("EventBusService"),
      /interface EventBusListener[\s\S]*Object onInvoke\(Object\.\.\. args\)/,
    );
    assert.match(
      generated.read("EventBusService"),
      /Subscription subscribe\(String topic,EventBusListener fn\)/,
    );
    assert.match(
      generated.read("EventBusService"),
      /publish\(String topic,Object\.\.\. var_args\)/,
    );
    assert.match(
      generated.read("EventBusService"),
      /return subscribe\(topic,Js\.uncheckedCast\(null\)\)/,
    );
  } finally {
    rmSync(generated.root, { force: true, recursive: true });
  }
});

test("refines partially typed promises, browser parameters, and public fields", () => {
  const generated = fixture({
    HttpService: [
      "package org.angular.ts.ng;",
      "public class HttpService{",
      "public Object pendingRequests;",
      "}",
    ].join("\n"),
    HttpRequestConfig: [
      "package org.angular.ts.ng;",
      "public interface HttpRequestConfig{}",
    ].join("\n"),
    ServiceWorkerService: [
      "package org.angular.ts.ng;",
      "public interface ServiceWorkerService{",
      "elemental2.promise.Promise<Object> ready();",
      "elemental2.promise.Promise<Object> update();",
      "elemental2.promise.Promise<Object> register(Object scriptOrOptions,Object options);",
      "}",
    ].join("\n"),
    ServiceWorkerMessageEvent: [
      "package org.angular.ts.ng;",
      "public interface ServiceWorkerMessageEvent<TData extends Object>{",
      "Object getEvent();",
      "void setEvent(Object event);",
      "}",
    ].join("\n"),
  });

  try {
    execFileSync(process.execPath, [scriptPath, generated.root]);

    assert.match(
      generated.read("ServiceWorkerService"),
      /Promise<elemental2\.dom\.ServiceWorkerRegistration> ready\(\)/,
    );
    assert.match(
      generated.read("ServiceWorkerService"),
      /register\(Object scriptOrOptions,elemental2\.dom\.RegistrationOptions options\)/,
    );
    assert.match(
      generated.read("HttpService"),
      /elemental2\.core\.JsArray<HttpRequestConfig> pendingRequests/,
    );
    assert.match(
      generated.read("ServiceWorkerMessageEvent"),
      /elemental2\.dom\.MessageEvent<TData> getEvent\(\)/,
    );
  } finally {
    rmSync(generated.root, { force: true, recursive: true });
  }
});
