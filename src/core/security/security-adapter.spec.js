import { createInjector } from "../di/injector.ts";
import { getSecurityAdapter } from "./security-adapter.ts";

describe("security adapter", () => {
  it("uses pass-through behavior when no provider cache is available", () => {
    const adapter = getSecurityAdapter({});

    expect(adapter.getTrusted("url", "javascript:test()")).toBe(
      "javascript:test()",
    );
    expect(adapter.getTrustedMediaUrl("javascript:image()")).toBe(
      "javascript:image()",
    );
    expect(adapter.valueOf("value")).toBe("value");
  });

  it("uses pass-through behavior when $sce is not registered", () => {
    const adapter = getSecurityAdapter(createInjector([]));

    expect(adapter.getTrusted("html", "<b>controlled</b>")).toBe(
      "<b>controlled</b>",
    );
    expect(adapter.getTrustedMediaUrl("data:image/svg+xml;base64,test")).toBe(
      "data:image/svg+xml;base64,test",
    );
    expect(adapter.valueOf(undefined)).toBeUndefined();
  });

  it("uses the registered $sce service when available", () => {
    const service = {
      getTrusted: jasmine
        .createSpy("getTrusted")
        .and.callFake((context, value) => `${context}:${value}`),
      getTrustedMediaUrl: jasmine
        .createSpy("getTrustedMediaUrl")
        .and.callFake((value) => `media:${value}`),
      valueOf: jasmine.createSpy("valueOf").and.callFake((value) => value.raw),
    };

    class SceProvider {
      $get = () => service;
    }

    const injector = createInjector([
      [
        "$provide",
        ($provide) => {
          $provide.provider("$sce", SceProvider);
        },
      ],
    ]);
    const adapter = getSecurityAdapter(injector);

    expect(adapter.getTrusted("url", "safe")).toBe("url:safe");
    expect(adapter.getTrustedMediaUrl("image")).toBe("media:image");
    expect(adapter.valueOf({ raw: "unwrapped" })).toBe("unwrapped");
    expect(service.getTrusted).toHaveBeenCalledWith("url", "safe");
    expect(service.getTrustedMediaUrl).toHaveBeenCalledWith("image");
    expect(service.valueOf).toHaveBeenCalledWith({ raw: "unwrapped" });
  });

  it("uses a constant $sce service when registered directly", () => {
    const service = {
      getTrusted: (_context, value) => `trusted:${value}`,
      getTrustedMediaUrl: (value) => `media:${value}`,
      valueOf: (value) => value,
    };
    const injector = createInjector([
      [
        "$provide",
        ($provide) => {
          $provide.constant("$sce", service);
        },
      ],
    ]);
    const adapter = getSecurityAdapter(injector);

    expect(adapter.getTrusted("html", "value")).toBe("trusted:value");
    expect(adapter.getTrustedMediaUrl("image")).toBe("media:image");
    expect(adapter.valueOf("raw")).toBe("raw");
  });
});
