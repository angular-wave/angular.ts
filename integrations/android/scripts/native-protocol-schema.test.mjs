import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const protocolDirectory = new URL("../protocol/", import.meta.url);
const readJson = async (name) =>
  JSON.parse(await readFile(new URL(name, protocolDirectory), "utf8"));

describe("native bridge protocol", () => {
  it("publishes closed versioned schemas", async () => {
    for (const name of ["request", "reply", "event", "error"]) {
      const schema = await readJson(`${name}.schema.json`);

      assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
      assert.equal(schema.type, "object");
      assert.equal(schema.additionalProperties, false);
    }
  });

  it("keeps portable fixtures on protocol version one", async () => {
    const fixtures = await readJson("native-bridge-fixtures.json");

    for (const value of Object.values(fixtures)) assert.equal(value.protocol, 1);
    assert.equal(fixtures.cancelRequest.params.id, fixtures.request.id);
    assert.equal(fixtures.reply.id, fixtures.request.id);
  });
});
