import assert from "node:assert/strict";
import test from "node:test";
import { nativeLayoutFrame } from "../main/ets/layout/NativeLayout.ts";
import { nativeAccessibilityState } from "../main/ets/accessibility/NativeAccessibility.ts";

test("converts source pixels without cumulative rounding", () => {
  const environment = {
    density: 2.5,
    viewportOffsetX: 5,
    viewportOffsetY: 10,
    safeAreaTop: 25,
    safeAreaEnd: 0,
    safeAreaBottom: 50,
    safeAreaStart: 0,
    rightToLeft: true,
  };
  const source = { x: 30, y: 60, width: 101, height: -2 };
  assert.deepEqual(nativeLayoutFrame(source, environment), {
    x: 10,
    y: 20,
    width: 40.4,
    height: 0,
    safeArea: { top: 10, end: 0, bottom: 20, start: 0 },
    rightToLeft: true,
  });
  assert.deepEqual(nativeLayoutFrame(source, environment).width, 40.4);
  assert.throws(() => nativeLayoutFrame(source, { ...environment, density: 0 }), RangeError);
});

test("derives accessibility state from the shared catalog", () => {
  assert.deepEqual(nativeAccessibilityState("checkbox", {
    label: "Terms",
    value: true,
    enabled: false,
    required: true,
  }), {
    role: "checkbox",
    label: "Terms",
    enabled: false,
    required: true,
    selected: false,
    checked: true,
    value: null,
  });
});
