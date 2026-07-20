import assert from "node:assert/strict";
import test from "node:test";
import {
  generateWasmContractFiles,
  parseWasmContract,
} from "./generate-contract.mjs";

const valid = {
  name: "Player",
  fields: [
    { path: "position.x", type: "f64" },
    { path: "frame", type: "bytes", optional: true },
  ],
};

test("validates and normalizes one binding manifest", () => {
  const contract = parseWasmContract(valid);

  assert.equal(contract.name, "Player");
  assert.deepEqual(contract.fields[0], {
    path: "position.x",
    type: "f64",
    optional: false,
    symbol: "PositionX",
  });
  assert.equal(Object.isFrozen(contract), true);
});

test("rejects unsafe, duplicate, and unsupported fields", () => {
  assert.throws(
    () =>
      parseWasmContract({
        name: "Unsafe",
        fields: [{ path: "__proto__.value", type: "string" }],
      }),
    /Unsafe Wasm contract path/u,
  );
  assert.throws(
    () =>
      parseWasmContract({
        name: "Duplicate",
        fields: [
          { path: "value", type: "string" },
          { path: "value", type: "string" },
        ],
      }),
    /Duplicate Wasm contract path/u,
  );
  assert.throws(
    () =>
      parseWasmContract({
        name: "Unsupported",
        fields: [{ path: "value", type: "date" }],
      }),
    /Unsupported Wasm contract type/u,
  );
});

test("generates deterministic contracts for every maintained guest language", () => {
  const files = generateWasmContractFiles(valid);

  assert.deepEqual(Array.from(files.keys()), [
    "player.contract.ts",
    "player_contract.rs",
    "player_contract.go",
    "player_contract.h",
    "player_contract.hpp",
    "player_contract.zig",
    "player.contract.as.ts",
    "PlayerContract.cs",
  ]);
  assert.match(files.get("player.contract.ts"), /"position\.x": number/u);
  assert.match(
    files.get("player_contract.rs"),
    /pub const POSITION_X: Field<f64> = Field::new\("position\.x"\);/u,
  );
  assert.match(
    files.get("player_contract.rs"),
    /pub const FRAME: BinaryField = BinaryField::optional\("frame"\);/u,
  );
  assert.doesNotMatch(files.get("player_contract.rs"), /PositionXValue/u);
  assert.match(
    files.get("player_contract.h"),
    /static const ng_f64_field_t PLAYER_POSITION_X = NG_F64_FIELD\("position\.x"\);/u,
  );
  assert.match(
    files.get("player_contract.h"),
    /static const ng_binary_field_t PLAYER_FRAME = NG_OPTIONAL_BINARY_FIELD\("frame"\);/u,
  );
  assert.doesNotMatch(files.get("player_contract.h"), /_value_t|_PATH_/u);
  assert.match(files.get("PlayerContract.cs"), /Field<double> PositionX/u);
  assert.match(
    files.get("player_contract.zig"),
    /pub const positionX = angular\.Field\(f64\)\.init\("position\.x"\);/u,
  );
  assert.match(
    files.get("player_contract.zig"),
    /pub const frame = angular\.BinaryField\.optional\("frame"\);/u,
  );
  assert.doesNotMatch(files.get("player_contract.zig"), /PositionXValue|positionX_path/u);
});
