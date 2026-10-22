import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { AngularNativeWebHost } from "../main/ets/web/AngularNativeWebHost.ts";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function call(id, session = "session-1") {
  return JSON.stringify({
    protocol: 1,
    id,
    target: "platform",
    method: "status",
    session,
  });
}

function fixture(session = "session-1") {
  const scripts = [];
  const runtime = {
    currentLocation: "https://example.com/dashboard",
    async runJavaScript(source) {
      scripts.push(source);
    },
  };
  const host = new AngularNativeWebHost(
    "https://example.com/app",
    runtime,
    {
      platform: {
        invoke: () => ({ platform: "harmonyos" }),
      },
    },
    session,
  );
  return { host, runtime, scripts };
}

test("injects the complete environment after the page is ready", async () => {
  const { host, scripts } = fixture();
  await host.pageReady();
  assert.equal(scripts.length, 1);
  assert.match(scripts[0], /platform-harmonyos/u);
  assert.match(scripts[0], /ng:native:environment/u);
  assert.match(scripts[0], /session-1/u);
  assert.match(scripts[0], /component/u);
  assert.match(scripts[0], /text-field/u);
});

test("queues replies until environment injection completes", async () => {
  const { host, scripts } = fixture();
  host.receive(call("before-ready"));
  await tick();
  assert.equal(scripts.length, 0);
  await host.pageReady();
  assert.equal(scripts.length, 2);
  assert.match(scripts[1], /before-ready/u);
  assert.match(scripts[1], /harmonyos/u);
});

test("uses the current page origin for every request", async () => {
  const { host, runtime, scripts } = fixture();
  await host.pageReady();
  runtime.currentLocation = "https://other.example/page";
  host.receive(call("wrong-origin"));
  await tick();
  assert.match(scripts.at(-1), /unauthorized/u);
});

test("disposes handlers and ignores later proxy calls", async () => {
  let closed = 0;
  const scripts = [];
  const runtime = {
    currentLocation: "https://example.com/app",
    async runJavaScript(source) { scripts.push(source); },
  };
  const host = new AngularNativeWebHost(
    "https://example.com/app",
    runtime,
    {
      platform: {
        invoke: () => ({ platform: "harmonyos" }),
        close: () => { closed += 1; },
      },
    },
    "session-1",
  );
  await host.pageReady();
  host.close();
  host.close();
  host.receive(call("late"));
  await tick();
  assert.equal(closed, 1);
  assert.equal(scripts.length, 1);
});

test("preserves hostile data without emitting HTML delimiters or executable source", async () => {
  const payload = '</script><script>throw new Error("injected")</script>&\\\"\u2028\u2029';
  const { host, scripts } = fixture(payload);
  await host.pageReady();
  host.emitEvent("target", "event", { payload });
  const received = [];
  const environmentEvents = [];
  const context = {
    document: { documentElement: {
      classList: { remove() {}, add() {} },
      style: { setProperty() {} },
    } },
    window: {
      angularNative: { receive(message) { received.push(message); } },
      dispatchEvent(event) { environmentEvents.push(event); },
    },
    CustomEvent: class { constructor(name, options) { this.name = name; this.detail = options.detail; } },
  };
  for (const source of scripts) {
    assert.doesNotMatch(source, /[<>\u2028\u2029]/u);
    runInNewContext(source, context);
  }
  assert.equal(received.length, 1);
  assert.equal(received[0].data.payload, payload);
  assert.equal(environmentEvents[0].detail.session, payload);
});
