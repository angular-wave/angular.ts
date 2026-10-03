import assert from "node:assert/strict";
import test from "node:test";
import { HarmonyBrowserRoute } from "../main/ets/HarmonyBrowserRoute.ts";

test("intercepts only external HTTP and HTTPS origins", async () => {
  const opened = [];
  const route = new HarmonyBrowserRoute(
    "https://app.example.test/feed",
    { open: (location) => opened.push(location) },
  );
  assert.equal(route.matches("https://app.example.test/profile"), false);
  assert.equal(route.matches("https://APP.example.test:443/profile"), false);
  assert.equal(route.matches("https://external.example/path"), true);
  assert.equal(route.matches("http://external.example/path"), true);
  assert.equal(route.matches("mailto:test@example.test"), false);
  assert.equal(route.matches("https://user:secret@external.example/path"), false);
  assert.equal(route.intercept("https://app.example.test/profile"), false);
  assert.equal(route.intercept("https://external.example/path"), true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(opened, ["https://external.example/path"]);
});

test("normalizes safe external locations and rejects malformed locations", async () => {
  const opened = [];
  const route = new HarmonyBrowserRoute(
    "http://[2001:db8::1]:8080/feed",
    { open: (location) => opened.push(location) },
  );
  assert.equal(route.matches("http://[2001:DB8::1]:8080/profile"), false);
  assert.equal(route.matches("https://external.example"), true);
  assert.equal(route.intercept("HTTPS://EXTERNAL.example:443?from=app"), true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(opened, ["https://external.example/?from=app"]);

  for (const location of [
    "",
    " https://external.example",
    "https:///path",
    "://external.example/path",
    "1https://external.example/path",
    "https://user@external.example/path",
    "ftp://external.example/path",
    "resource://rawfile/page.html",
    "https://external..example/path",
    "https://-external.example/path",
    "https://external.example:/path",
    "https://external.example:0/path",
    "https://external.example:65536/path",
    "https://external.example:port/path",
    "https://external.example\\@attacker.example/path",
    "https://[/path",
    "https://[127.0.0.1]/path",
    "https://[::1]suffix/path",
  ]) {
    assert.equal(route.matches(location), false, location);
  }
});

test("treats every web URL as external to a packaged application", () => {
  const route = new HarmonyBrowserRoute(
    "resource://rawfile/proof.html",
    { open() {} },
  );
  assert.equal(route.matches("resource://rawfile/other.html"), false);
  assert.equal(route.matches("https://example.test/"), true);
});

test("reports asynchronous platform failures without releasing the request to ArkWeb", async () => {
  const failures = [];
  const route = new HarmonyBrowserRoute(
    "https://app.example.test/",
    { open: async () => { throw new Error("resolver failed"); } },
    (error) => failures.push(error.message),
  );
  assert.equal(route.intercept("https://external.example/"), true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(failures, ["resolver failed"]);
  assert.throws(
    () => new HarmonyBrowserRoute("file:///app.html", { open() {} }),
    /applicationLocation/u,
  );
  assert.throws(
    () => new HarmonyBrowserRoute("resource://media/app.html", { open() {} }),
    /applicationLocation/u,
  );
  assert.throws(
    () => new HarmonyBrowserRoute("https://user@app.example/", { open() {} }),
    /applicationLocation/u,
  );
});
