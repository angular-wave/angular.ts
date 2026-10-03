import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);

test("maps use the optional Map Kit same-layer provider", async () => {
  const [provider, destination, sample, metadata] = await Promise.all([
    readFile(new URL("packages/maps/src/main/ets/HarmonyMapNode.ets", root), "utf8"),
    readFile(new URL("packages/core/src/main/ets/web/AngularNativeDestination.ets", root), "utf8"),
    readFile(new URL("samples/kitchen-sink/entry/src/main/ets/pages/Index.ets", root), "utf8"),
    readFile(new URL("samples/kitchen-sink/entry/oh-package.json5", root), "utf8"),
  ]);
  assert.match(provider, /MapComponent/u);
  assert.match(provider, /snapshot\.name === "map"/u);
  assert.match(provider, /moveCamera/u);
  assert.match(provider, /animateCamera/u);
  assert.match(provider, /addMarker/u);
  assert.match(destination, /nativeControllerFactory/u);
  assert.match(sample, /harmonyMapControllerFactory/u);
  assert.match(metadata, /angular-native-harmony-maps/u);
});

test("the generic core renderer cannot silently claim map support", async () => {
  const source = await readFile(
    new URL("packages/core/src/main/ets/nodes/ArkUISameLayerSurface.ets", root),
    "utf8",
  );
  assert.doesNotMatch(source, /snapshot\.name === "map"/u);
});
