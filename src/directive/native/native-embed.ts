type NativeEnvironmentWindow = Window & {
  angularNativeEnvironment?: {
    platform?: string;
  };
};

/** @internal */
export class HarmonyNativeEmbedBinding {
  readonly id: string;

  private readonly element: Element;
  private readonly view: Window;
  private readonly onReady: () => void;
  private embed: HTMLEmbedElement | undefined;
  private disposed = false;

  constructor(
    element: Element,
    componentId: string,
    view: Window,
    onReady: () => void,
  ) {
    this.element = element;
    this.id = `${componentId}--harmony-native`;
    this.view = view;
    this.onReady = onReady;
    this.view.addEventListener("ng:native:environment", this.sync);
    this.sync();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.view.removeEventListener("ng:native:environment", this.sync);
    this.embed?.remove();
    this.embed = undefined;
  }

  private readonly sync = (): void => {
    if (this.disposed || this.embed || !this.isHarmonyOS()) return;

    const embed = this.element.ownerDocument.createElement("embed");
    embed.id = this.id;
    embed.type = "native/component";
    embed.src = "angular-native";
    embed.setAttribute("aria-hidden", "true");
    embed.dataset.angularNativeEmbed = this.element.id;
    embed.style.display = "block";
    embed.style.width = "100%";
    embed.style.height = "100%";
    embed.style.pointerEvents = "auto";
    this.element.append(embed);
    this.embed = embed;
    this.onReady();
  };

  private isHarmonyOS(): boolean {
    return (
      (this.view as NativeEnvironmentWindow).angularNativeEnvironment
        ?.platform === "harmonyos"
    );
  }
}
