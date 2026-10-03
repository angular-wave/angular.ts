import { HarmonyNativeEmbedBinding } from "./native-embed.ts";

type TestWindow = Window & {
  angularNativeEnvironment?: {
    platform: string;
  };
};

describe("Harmony native embed", () => {
  const testWindow = window as TestWindow;

  afterEach(() => {
    delete testWindow.angularNativeEnvironment;
    document
      .querySelectorAll("[data-harmony-embed-test]")
      .forEach((element) => element.remove());
  });

  it("creates one same-layer embed when HarmonyOS becomes available", () => {
    const host = document.createElement("ng-native-text");
    host.dataset.harmonyEmbedTest = "";
    host.id = "title";
    document.body.append(host);
    const onReady = jasmine.createSpy("onReady");
    const binding = new HarmonyNativeEmbedBinding(
      host,
      "native-title",
      window,
      onReady,
    );

    expect(host.querySelector("embed")).toBeNull();
    testWindow.angularNativeEnvironment = { platform: "harmonyos" };
    window.dispatchEvent(new Event("ng:native:environment"));
    window.dispatchEvent(new Event("ng:native:environment"));

    const embeds = host.querySelectorAll("embed");
    expect(embeds.length).toBe(1);
    expect(embeds[0].id).toBe("native-title--harmony-native");
    expect(embeds[0].type).toBe("native/component");
    expect(embeds[0].getAttribute("src")).toBe("angular-native");
    expect(embeds[0].dataset.angularNativeEmbed).toBe("title");
    expect(onReady).toHaveBeenCalledTimes(1);

    binding.dispose();
    binding.dispose();
    expect(host.querySelector("embed")).toBeNull();
  });

  it("does not create an embed for web or Android", () => {
    const host = document.createElement("ng-native-text");
    host.dataset.harmonyEmbedTest = "";
    document.body.append(host);
    const binding = new HarmonyNativeEmbedBinding(
      host,
      "native-title",
      window,
      () => undefined,
    );

    testWindow.angularNativeEnvironment = { platform: "android" };
    window.dispatchEvent(new Event("ng:native:environment"));

    expect(host.querySelector("embed")).toBeNull();
    binding.dispose();
  });

  it("stops listening after disposal", () => {
    const host = document.createElement("ng-native-text");
    host.dataset.harmonyEmbedTest = "";
    document.body.append(host);
    const binding = new HarmonyNativeEmbedBinding(
      host,
      "native-title",
      window,
      () => undefined,
    );

    binding.dispose();
    testWindow.angularNativeEnvironment = { platform: "harmonyos" };
    window.dispatchEvent(new Event("ng:native:environment"));

    expect(host.querySelector("embed")).toBeNull();
  });
});
