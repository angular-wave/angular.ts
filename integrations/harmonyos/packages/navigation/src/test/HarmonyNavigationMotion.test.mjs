import assert from "node:assert/strict";
import test from "node:test";

import {
  navigationMotionDuration,
  navigationMotionFrame,
} from "../main/ets/HarmonyNavigationMotion.ts";

const REST = {
  opacity: 1,
  rotationY: 0,
  scale: 1,
  translateX: "0%",
  translateY: "0%",
};

test("keeps inactive and system transition frames at rest", () => {
  for (const transition of ["default", "none", "fade", "slide", "cover", "dive", "flip"]) {
    for (const role of ["enter", "exit"]) {
      const inactiveStage = role === "enter" ? "end" : "start";
      assert.deepEqual(navigationMotionFrame(transition, role, true, inactiveStage), REST);
    }
  }
  assert.deepEqual(navigationMotionFrame("default", "enter", true, "start"), REST);
  assert.deepEqual(navigationMotionFrame("none", "exit", false, "end"), REST);
});

test("plans distinct forward and backward navigation motion", () => {
  const frames = new Map();
  for (const transition of ["fade", "slide", "cover", "dive", "flip"]) {
    for (const role of ["enter", "exit"]) {
      for (const forward of [true, false]) {
        const stage = role === "enter" ? "start" : "end";
        frames.set(`${transition}:${role}:${forward}`, navigationMotionFrame(
          transition,
          role,
          forward,
          stage,
        ));
      }
    }
  }

  assert.equal(frames.get("fade:enter:true").opacity, 0);
  assert.equal(frames.get("slide:enter:true").translateX, "100%");
  assert.equal(frames.get("slide:exit:true").translateX, "-28%");
  assert.equal(frames.get("slide:enter:false").translateX, "-28%");
  assert.equal(frames.get("cover:enter:true").translateY, "100%");
  assert.deepEqual(frames.get("cover:exit:true"), REST);
  assert.deepEqual(frames.get("cover:enter:false"), REST);
  assert.equal(frames.get("cover:exit:false").translateY, "100%");
  assert.equal(frames.get("dive:enter:true").scale, 1.04);
  assert.equal(frames.get("dive:exit:true").scale, 0.94);
  assert.equal(frames.get("flip:enter:true").rotationY, 90);
  assert.equal(frames.get("flip:exit:true").rotationY, -90);
  assert.equal(frames.get("flip:enter:false").rotationY, -90);
});

test("uses a deliberate duration for every custom transition", () => {
  assert.deepEqual(
    ["default", "none", "fade", "slide", "cover", "dive", "flip"].map(navigationMotionDuration),
    [0, 0, 180, 280, 320, 340, 380],
  );
});
