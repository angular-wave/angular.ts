/// <reference types="jasmine" />
import { passThroughSecurityAdapter } from "./security-adapter.ts";

describe("security adapter", () => {
  it("provides explicit pass-through behavior for runtimes without SCE", () => {
    const adapter = passThroughSecurityAdapter;

    expect(adapter.getTrusted("url", "javascript:test()")).toBe(
      "javascript:test()",
    );
    expect(adapter.getTrustedMediaUrl("javascript:image()")).toBe(
      "javascript:image()",
    );
    expect(adapter.valueOf("value")).toBe("value");
    expect(adapter.valueOf(undefined)).toBeUndefined();
  });
});
