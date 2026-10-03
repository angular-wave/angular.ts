import assert from "node:assert/strict";
import test from "node:test";
import { NativeBridgeSecurity } from "../main/ets/bridge/NativeBridgeSecurity.ts";

const security = new NativeBridgeSecurity(
  "https://example.com/dashboard",
  "session-1",
);

test("accepts the active session on the normalized destination origin", () => {
  assert.equal(
    security.accepts("session-1", "https://EXAMPLE.com:443/settings?q=1"),
    true,
  );
});

test("rejects missing or mismatched sessions", () => {
  assert.equal(security.accepts(null, "https://example.com/settings"), false);
  assert.equal(security.accepts(undefined, "https://example.com/settings"), false);
  assert.equal(security.accepts("session-1", null), false);
  assert.equal(security.accepts("session-1", undefined), false);
  assert.equal(security.accepts("wrong", "https://example.com/settings"), false);
  assert.equal(security.accepts("session-1-extra", "https://example.com/settings"), false);
});

test("rejects different and unsafe origins", () => {
  for (const location of [
    "",
    "http://example.com/settings",
    "https://example.com:8443/settings",
    "https://other.example/settings",
    "https://user@example.com/settings",
    "https://user:password@example.com/settings",
    "https://:password@example.com/settings",
    "https://example.com:0/settings",
    "https://example.com:65536/settings",
    "https://example.com:port/settings",
    "https://example.com:/settings",
    "https://example..com/settings",
    "https://-example.com/settings",
    "https://example.com./settings",
    "https://example.com\\@other.example/settings",
    "https://exam ple.com/settings",
    "https:///settings",
    "https://::1/settings",
    "https://[/settings",
    "https://[127.0.0.1]/settings",
    "https://[::1]suffix/settings",
    "ftp://example.com/settings",
    "file:///data/index.html",
    "://example.com/settings",
    "not a url",
  ]) {
    assert.equal(security.accepts("session-1", location), false);
  }
});

test("rejects every call when the configured destination is invalid", () => {
  const invalid = new NativeBridgeSecurity("file:///data/index.html", "session-1");
  assert.equal(invalid.accepts("session-1", "file:///data/index.html"), false);
});

test("accepts only packaged rawfile pages within the packaged resource origin", () => {
  const packaged = new NativeBridgeSecurity("resource://rawfile/proof.html", "session-2");
  assert.equal(packaged.accepts("session-2", "resource://rawfile/routes/feed.html"), true);
  assert.equal(packaged.accepts("session-2", "resource://media/proof.html"), false);
  assert.equal(packaged.accepts("session-2", "resource://user@rawfile/proof.html"), false);
  assert.equal(packaged.accepts("session-2", "resource://:password@rawfile/proof.html"), false);
  assert.equal(packaged.accepts("session-2", "resource://rawfile:81/proof.html"), false);
  assert.equal(packaged.accepts("session-2", "file:///rawfile/proof.html"), false);
});

test("normalizes explicit ports and IPv6 origins", () => {
  const http = new NativeBridgeSecurity("http://localhost:8080/app", "session-3");
  assert.equal(http.accepts("session-3", "http://LOCALHOST:8080/other"), true);

  const ipv6 = new NativeBridgeSecurity("https://[2001:db8::1]/app", "session-4");
  assert.equal(ipv6.accepts("session-4", "https://[2001:DB8::1]:443/other"), true);
});
