import type {
  NativeNavigationAndroidChange,
  NativeNavigationBridgeChange,
  NativeNavigationChange,
  NativeNavigationPopResult,
  NativeNavigationRouteParameters,
  NativeNavigationRouteResult,
  NativeNavigationStatus,
} from "./native-capability-contracts";

describe("native navigation contracts", () => {
  it("model status, requests, results, and every event source", () => {
    const status: NativeNavigationStatus = {
      location: null,
      previousLocation: null,
      canPop: false,
      modal: false,
    };
    const parameters: NativeNavigationRouteParameters = {
      url: "/profile",
      transition: "cover",
    };
    const route: NativeNavigationRouteResult = {
      routed: true,
      method: "push",
      phase: "accepted",
      transaction: 1,
      url: "/profile",
      action: "advance",
      transition: "cover",
    };
    const root: NativeNavigationPopResult = {
      ...status,
      routed: false,
      method: "pop",
    };
    const acceptedPop: NativeNavigationPopResult = {
      routed: true,
      method: "pop",
      phase: "accepted",
      transaction: 2,
      from: "/profile",
      url: null,
    };
    const completed: NativeNavigationBridgeChange = {
      transaction: 1,
      method: "push",
      phase: "completed",
      source: "bridge",
      from: null,
      url: "/profile",
    };
    const cancelled: NativeNavigationBridgeChange = {
      transaction: 2,
      method: "pop",
      phase: "cancelled",
      source: "bridge",
      from: "/profile",
      url: null,
      reason: "interrupted",
    };
    const android: NativeNavigationAndroidChange = {
      method: "deep-link",
      phase: "completed",
      source: "android",
      from: "/profile",
      url: "/shared",
    };
    const changes: readonly NativeNavigationChange[] = [
      completed,
      cancelled,
      android,
    ];

    expect(parameters.transition).toBe("cover");
    expect(route.transaction).toBe(1);
    expect(root.routed).toBeFalse();
    expect(acceptedPop.routed).toBeTrue();
    expect(changes.map((change) => change.source)).toEqual([
      "bridge",
      "bridge",
      "android",
    ]);
  });
});
