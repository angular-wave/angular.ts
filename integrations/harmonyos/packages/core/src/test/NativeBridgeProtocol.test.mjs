import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  NATIVE_BRIDGE_MAX_MESSAGE_BYTES,
  parseNativeBridgeRequest,
  utf8ByteLength,
} from "../main/ets/bridge/NativeBridgeProtocol.ts";

test("parses every shared request fixture", async () => {
  const fixtures = JSON.parse(
    await readFile(
      new URL("../../../../../native/protocol/native-bridge-fixtures.json", import.meta.url),
      "utf8",
    ),
  );
  for (const request of [fixtures.request, fixtures.cancelRequest]) {
    assert.deepEqual(parseNativeBridgeRequest(JSON.stringify(request)), {
      ok: true,
      request: {
        id: request.id,
        target: request.target,
        method: request.method,
        params: request.params,
        session: request.session,
      },
    });
  }
});

test("rejects malformed and incomplete requests with stable errors", () => {
  const cases = [
    [null, "invalid_message"],
    [undefined, "invalid_message"],
    ["", "invalid_message"],
    ["not-json", "invalid_message"],
    ["[]", "invalid_message"],
    ["{}", "invalid_message"],
    ['{"id":"1","target":"x","method":"y"}', "protocol_mismatch"],
    ['{"protocol":1,"id":"1","method":"y"}', "invalid_message"],
    ['{"protocol":1,"id":"1","target":"x"}', "invalid_message"],
    ['{"protocol":1,"id":"1","target":"x","method":"y","params":[]}', "invalid_params"],
    ['{"protocol":1,"id":"1","target":"x","method":"y","session":""}', "invalid_message"],
  ];
  for (const [message, code] of cases) {
    const result = parseNativeBridgeRequest(message);
    assert.equal(result.ok, false);
    assert.equal(result.code, code);
  }
});

test("normalizes omitted and null optional request fields", () => {
  const base = { protocol: 1, id: "optional", target: "platform", method: "status" };
  assert.deepEqual(parseNativeBridgeRequest(JSON.stringify(base)), {
    ok: true,
    request: { id: "optional", target: "platform", method: "status", params: null, session: null },
  });
  assert.deepEqual(parseNativeBridgeRequest(JSON.stringify({ ...base, params: null })), {
    ok: true,
    request: { id: "optional", target: "platform", method: "status", params: null, session: null },
  });
});

test("enforces the message limit in UTF-8 bytes before parsing", () => {
  assert.equal(utf8ByteLength("a"), 1);
  assert.equal(utf8ByteLength("é"), 2);
  assert.equal(utf8ByteLength("€"), 3);
  assert.equal(utf8ByteLength("😀"), 4);
  assert.equal(utf8ByteLength("\uD800"), 3);
  const result = parseNativeBridgeRequest("é".repeat(NATIVE_BRIDGE_MAX_MESSAGE_BYTES / 2 + 1));
  assert.equal(result.ok, false);
  assert.equal(result.code, "payload_too_large");
  assert.equal(result.id, null);
});
