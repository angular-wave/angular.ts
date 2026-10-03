import type { NavigationTransition } from "./HarmonyNavigation.ts";

export type NavigationMotionRole = "enter" | "exit";
export type NavigationMotionStage = "start" | "end";

export interface NavigationMotionFrame {
  readonly opacity: number;
  readonly rotationY: number;
  readonly scale: number;
  readonly translateX: string;
  readonly translateY: string;
}

const REST: NavigationMotionFrame = {
  opacity: 1,
  rotationY: 0,
  scale: 1,
  translateX: "0%",
  translateY: "0%",
};

export function navigationMotionFrame(
  transition: NavigationTransition,
  role: NavigationMotionRole,
  forward: boolean,
  stage: NavigationMotionStage,
): NavigationMotionFrame {
  const transformed = role === "enter" ? stage === "start" : stage === "end";
  if (!transformed || transition === "default" || transition === "none") return REST;

  switch (transition) {
    case "fade":
      return { ...REST, opacity: 0 };
    case "slide":
      return {
        ...REST,
        translateX: forward === (role === "enter") ? "100%" : "-28%",
      };
    case "cover":
      return role === (forward ? "enter" : "exit")
        ? { ...REST, translateY: "100%" }
        : REST;
    case "dive":
      return {
        ...REST,
        opacity: role === "enter" ? 0 : 0.4,
        scale: role === "enter" ? 1.04 : 0.94,
        translateY: role === (forward ? "enter" : "exit") ? "-12%" : "18%",
      };
    case "flip":
      return {
        ...REST,
        opacity: 0,
        rotationY: forward === (role === "enter") ? 90 : -90,
      };
  }
}

export function navigationMotionDuration(transition: NavigationTransition): number {
  switch (transition) {
    case "fade":
      return 180;
    case "slide":
      return 280;
    case "cover":
      return 320;
    case "dive":
      return 340;
    case "flip":
      return 380;
    default:
      return 0;
  }
}
