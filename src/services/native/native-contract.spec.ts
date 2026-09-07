import {
  createNativeService,
  type NativeEnvironment,
} from "./native.ts";

describe("native capability contract", () => {
  it("reports advertised targets and methods", () => {
    const nativeWindow = window as Window & {
      angularNativeEnvironment?: NativeEnvironment;
    };
    const previous = nativeWindow.angularNativeEnvironment;
    nativeWindow.angularNativeEnvironment = {
      platform: "android",
      capabilities: {
        connectivity: ["status", "watch", "unwatch"],
        media: ["status", "play"],
      },
    };
    const service = createNativeService(window, {
      bridge: { postMessage: () => undefined },
    });

    expect(service.capabilities).toEqual({
      connectivity: ["status", "watch", "unwatch"],
      media: ["status", "play"],
    });
    expect(service.supports("connectivity")).toBeTrue();
    expect(service.supports("connectivity", "watch")).toBeTrue();
    expect(service.supports("connectivity", "missing")).toBeFalse();
    expect(service.supports("credentials")).toBeFalse();

    service.dispose();
    nativeWindow.angularNativeEnvironment = previous;
  });
});
