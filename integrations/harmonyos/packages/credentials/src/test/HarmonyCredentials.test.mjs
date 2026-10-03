import assert from "node:assert/strict";
import test from "node:test";
import {
  CredentialFailure,
  HarmonyCredentials,
} from "../main/ets/HarmonyCredentials.ts";
import {
  credentialCreationOptions,
  credentialRequestOptions,
} from "../main/ets/WebAuthnJson.ts";

const encoded = (value) => Buffer.from(value).toString("base64url");

test("converts all WebAuthn creation binary fields without changing metadata", () => {
  const options = credentialCreationOptions(JSON.stringify({
    challenge: encoded("create"),
    rp: { id: "example.test", name: "Example" },
    user: { id: encoded("user-1"), name: "a@example.test", displayName: "A" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    excludeCredentials: [{ type: "public-key", id: encoded("old") }],
  }));
  assert.deepEqual([...options.publicKey.challenge], [...Buffer.from("create")]);
  assert.deepEqual([...options.publicKey.user.id], [...Buffer.from("user-1")]);
  assert.deepEqual([...options.publicKey.excludeCredentials[0].id], [...Buffer.from("old")]);
  assert.equal(options.publicKey.rp.id, "example.test");
});

test("converts wrapped WebAuthn authentication options", () => {
  const options = credentialRequestOptions(JSON.stringify({
    publicKey: {
      challenge: encoded("get"),
      rpId: "example.test",
      allowCredentials: [{ type: "public-key", id: encoded("key") }],
    },
  }));
  assert.deepEqual([...options.publicKey.challenge], [...Buffer.from("get")]);
  assert.deepEqual([...options.publicKey.allowCredentials[0].id], [...Buffer.from("key")]);
  assert.equal(options.publicKey.rpId, "example.test");
});

test("rejects malformed, oversized, and incomplete WebAuthn requests", () => {
  assert.throws(() => credentialRequestOptions("{"), /valid request JSON/u);
  assert.throws(() => credentialRequestOptions(JSON.stringify({ challenge: "*" })), /valid base64url/u);
  assert.throws(() => credentialCreationOptions(JSON.stringify({ challenge: "YQ" })), /publicKey[.]user/u);
  assert.throws(() => credentialRequestOptions(`{"value":"${"x".repeat(1024 * 1024)}"}`), /too large/u);
});

test("routes credential methods and preserves stable provider failures", async () => {
  const calls = [];
  const platform = {
    status: () => ({ available: true, passwords: false, passkeys: true }),
    get: (value) => calls.push(["get", value]),
    createPassword: (value) => calls.push(["create-password", value]),
    createPasskey: (value) => calls.push(["create-passkey", value]),
    clear: () => calls.push(["clear"]),
  };
  const credentials = new HarmonyCredentials(platform);
  assert.deepEqual(credentials.invoke("status", null), {
    available: true,
    passwords: false,
    passkeys: true,
  });
  await credentials.invoke("get", { passwords: false, passkeyRequestJson: "{}" });
  await credentials.invoke("create-password", { id: "a", password: "b" });
  await credentials.invoke("create-passkey", { requestJson: "{}" });
  await credentials.invoke("clear", null);
  assert.deepEqual(calls, [
    ["get", { passwords: false, passkeyRequestJson: "{}" }],
    ["create-password", { id: "a", password: "b" }],
    ["create-passkey", { requestJson: "{}" }],
    ["clear"],
  ]);
  assert.throws(() => credentials.invoke("missing", null), /Unsupported credentials method/u);
  assert.equal(new CredentialFailure("unavailable", "missing").code, "unavailable");
});
