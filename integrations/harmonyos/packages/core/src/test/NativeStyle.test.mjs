import assert from "node:assert/strict";
import test from "node:test";
import { nativeStyle } from "../main/ets/styles/NativeStyle.ts";

test("normalizes CSS-derived native style without mutating source", () => {
  const source = {
    color: "#112233",
    backgroundColor: "not-a-color",
    opacity: 2,
    padding: -4,
    margin: -8,
    fontSize: 16,
    zIndex: 3,
    overflow: "hidden",
    display: "block",
  };
  const result = nativeStyle(source, { darkMode: false, reducedMotion: false, fontScale: 1.5 });
  assert.deepEqual(result, {
    color: "#112233",
    opacity: 1,
    padding: 0,
    margin: -8,
    fontSize: 24,
    visible: true,
    clip: true,
    zIndex: 3,
    animate: true,
  });
  assert.equal(source.padding, -4);
});

test("respects reduced motion and rejects invalid font scale", () => {
  assert.equal(nativeStyle({}, { darkMode: true, reducedMotion: true, fontScale: 1 }).animate, false);
  assert.throws(() => nativeStyle({}, { darkMode: false, reducedMotion: false, fontScale: 0 }), RangeError);
});
