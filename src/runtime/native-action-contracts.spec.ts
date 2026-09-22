import type {
  NativeCameraCaptureResult,
  NativeCredentialClearResult,
  NativeCredentialCreatePasskeyParameters,
  NativeCredentialCreatePasskeyResult,
  NativeCredentialCreatePasswordParameters,
  NativeCredentialCreatePasswordResult,
  NativeCredentialGetParameters,
  NativeCredentialResult,
  NativeFileOpenParameters,
  NativeFileOpenResult,
  NativeFileUploadParameters,
  NativeFileUploadProgress,
  NativeFileUploadResult,
  NativeMediaLoadParameters,
  NativeMediaSeekParameters,
} from "./native-capability-contracts";

describe("native action contracts", () => {
  it("model camera, file, and media operations", () => {
    const capture: NativeCameraCaptureResult = {
      uri: "content://app/capture.jpg",
      name: "capture.jpg",
      size: 42,
      type: "image/jpeg",
    };
    const open: NativeFileOpenParameters = {
      accept: ["image/jpeg", "image/png"],
      multiple: true,
    };
    const selected: NativeFileOpenResult = {
      files: [
        {
          uri: capture.uri,
          name: capture.name,
          size: capture.size,
          type: capture.type,
          persisted: true,
        },
      ],
    };
    const upload: NativeFileUploadParameters = {
      uri: capture.uri,
      url: "/uploads",
      uploadId: "avatar",
      fields: { caption: "Morning" },
      headers: { "X-Request-Id": "request-1" },
    };
    const progress: NativeFileUploadProgress = {
      uploadId: "avatar",
      sent: 21,
      total: 42,
    };
    const response: NativeFileUploadResult = {
      status: 201,
      body: { id: "photo-1" },
      name: "capture.jpg",
      type: "image/jpeg",
    };
    const load: NativeMediaLoadParameters = {
      url: "https://example.test/audio.mp3",
      autoplay: true,
    };
    const seek: NativeMediaSeekParameters = { position: 1_000 };

    expect(open.accept).toHaveSize(2);
    expect(selected.files[0]?.persisted).toBeTrue();
    expect(upload.fields?.caption).toBe("Morning");
    expect(progress.total).toBe(42);
    expect(response.status).toBe(201);
    expect(load.autoplay).toBeTrue();
    expect(seek.position).toBe(1_000);
  });

  it("model password, passkey, custom, and clear credential results", () => {
    const get: NativeCredentialGetParameters = {
      passwords: true,
      passkeyRequestJson: "{}",
    };
    const passwordParameters: NativeCredentialCreatePasswordParameters = {
      id: "reader@example.test",
      password: "secret",
    };
    const passwordCreated: NativeCredentialCreatePasswordResult = {
      created: true,
      type: "password",
    };
    const passkeyParameters: NativeCredentialCreatePasskeyParameters = {
      requestJson: "{}",
    };
    const passkeyCreated: NativeCredentialCreatePasskeyResult = {
      created: true,
      type: "public-key",
    };
    const results: readonly NativeCredentialResult[] = [
      {
        type: "password",
        id: passwordParameters.id,
        password: passwordParameters.password,
      },
      {
        type: "public-key",
        authenticationResponseJson: passkeyParameters.requestJson,
      },
      { type: "vendor" },
    ];
    const cleared: NativeCredentialClearResult = { cleared: true };

    expect(get.passwords).toBeTrue();
    expect(passwordCreated.type).toBe("password");
    expect(passkeyCreated.type).toBe("public-key");
    expect(results.map(({ type }) => type)).toEqual([
      "password",
      "public-key",
      "vendor",
    ]);
    expect(cleared.cleared).toBeTrue();
  });
});
