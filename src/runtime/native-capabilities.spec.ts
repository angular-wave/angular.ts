import {
  nativeCapabilities,
  type NativeCapabilityParameters,
  type NativeCapabilityResult,
} from "./native-capabilities.ts";

describe("native capability catalog", () => {
  it("exposes the generated invocation contract with literal types", () => {
    const threading: "main" = nativeCapabilities.connectivity.threading;
    const lifecycle: "destination" = nativeCapabilities.connectivity.lifecycle;
    const errorProtocol: "native-bridge-v1" =
      nativeCapabilities.connectivity.errorProtocol;

    expect({ threading, lifecycle, errorProtocol }).toEqual({
      threading: "main",
      lifecycle: "destination",
      errorProtocol: "native-bridge-v1",
    });
  });

  it("applies the invocation contract to every generated capability", () => {
    for (const capability of Object.values(nativeCapabilities)) {
      expect(capability.threading).toBe("main");
      expect(capability.lifecycle).toBe("destination");
      expect(capability.errorProtocol).toBe("native-bridge-v1");
    }
  });

  it("types permission location and haptic payloads", () => {
    const permission: NativeCapabilityParameters<"permissions", "request"> = {
      permission: "android.permission.CAMERA",
    };
    const location: NativeCapabilityResult<"geolocation", "status"> = {
      available: true,
      granted: true,
      accuracy: "coarse",
      permission: "android.permission.ACCESS_FINE_LOCATION",
    };
    const haptic: NativeCapabilityParameters<"haptics", "perform"> = {
      style: "longPress",
    };

    expect({ permission, location, haptic }).toEqual({
      permission: { permission: "android.permission.CAMERA" },
      location: {
        available: true,
        granted: true,
        accuracy: "coarse",
        permission: "android.permission.ACCESS_FINE_LOCATION",
      },
      haptic: { style: "longPress" },
    });
  });

  it("types clipboard sharing intent and notification payloads", () => {
    const clipboardWrite: NativeCapabilityParameters<"clipboard", "write"> = {
      text: "Copied",
      label: "Status",
    };
    const clipboardContent: NativeCapabilityResult<"clipboard", "read"> = {
      text: null,
    };
    const clipboardResult: NativeCapabilityResult<"clipboard", "write"> = {
      written: true,
    };
    const share: NativeCapabilityParameters<"sharing", "share"> = {
      text: "Shared",
      type: "text/plain",
      title: "Share status",
    };
    const intent: NativeCapabilityParameters<"intents", "open"> = {
      url: "https://example.com",
    };
    const notifications: NativeCapabilityResult<"notifications", "status"> = {
      available: true,
      granted: false,
      permission: "android.permission.POST_NOTIFICATIONS",
    };
    const opened: NativeCapabilityResult<"notifications", "open-settings"> = {
      opened: true,
    };

    expect({
      clipboardWrite,
      clipboardContent,
      clipboardResult,
      share,
      intent,
      notifications,
      opened,
    }).toEqual({
      clipboardWrite: { text: "Copied", label: "Status" },
      clipboardContent: { text: null },
      clipboardResult: { written: true },
      share: { text: "Shared", type: "text/plain", title: "Share status" },
      intent: { url: "https://example.com" },
      notifications: {
        available: true,
        granted: false,
        permission: "android.permission.POST_NOTIFICATIONS",
      },
      opened: { opened: true },
    });
  });
});
