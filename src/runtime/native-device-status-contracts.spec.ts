import type {
  NativeBiometricStatus,
  NativeCameraStatus,
  NativeCredentialStatus,
  NativeFileStatus,
  NativeMediaStatus,
} from "./native-capability-contracts";

describe("native device status contracts", () => {
  it("model biometric, camera, file, credential, and media state", () => {
    const biometrics: NativeBiometricStatus = {
      available: true,
      enrolled: true,
      permission: null,
    };
    const camera: NativeCameraStatus = {
      available: true,
      granted: false,
      permission: "camera",
    };
    const files: NativeFileStatus = {
      available: true,
      contentUris: true,
      upload: true,
    };
    const credentials: NativeCredentialStatus = {
      available: true,
      passwords: true,
      passkeys: true,
    };
    const media: NativeMediaStatus = {
      available: true,
      loaded: true,
      playing: false,
      position: 100,
      duration: null,
      state: "buffering",
    };

    expect(biometrics.enrolled).toBeTrue();
    expect(camera.granted).toBeFalse();
    expect(files.upload).toBeTrue();
    expect(credentials.passkeys).toBeTrue();
    expect(media.state).toBe("buffering");
  });
});
