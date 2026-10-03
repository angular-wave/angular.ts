import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PULSE_LOCATION,
  pulseLocation,
} from "../main/ets/PulseLocation.ts";

test("accepts reachable HTTP and HTTPS Pulse locations", () => {
  assert.equal(pulseLocation("http://192.0.2.1:4175/feed#ignored"), "http://192.0.2.1:4175/feed");
  assert.equal(pulseLocation("https://pulse.example.test"), "https://pulse.example.test/");
  assert.equal(
    pulseLocation("HTTP://[2001:DB8::1]?tab=feed#ignored"),
    "http://[2001:db8::1]/?tab=feed",
  );
});

test("falls back for missing, malformed, credentialed, and unsafe locations", () => {
  for (const value of [
    undefined,
    "",
    "not a URL",
    "file:///tmp/pulse",
    "https://user@pulse.example.test",
    "https://user:secret@pulse.example.test",
    "https://pulse.example.test:65536/",
  ]) {
    assert.equal(pulseLocation(value), DEFAULT_PULSE_LOCATION);
  }
});
