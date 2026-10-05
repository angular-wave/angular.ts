/** @internal */
class HarmonyNativeEmbedBinding {
    constructor(element, componentId, view, onReady) {
        this.disposed = false;
        this.sync = () => {
            if (this.disposed || this.embed || !this._isHarmonyOS())
                return;
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
        this.element = element;
        this.id = `${componentId}--harmony-native`;
        this.view = view;
        this.onReady = onReady;
        this.view.addEventListener("ng:native:environment", this.sync);
        this.sync();
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.view.removeEventListener("ng:native:environment", this.sync);
        this.embed?.remove();
        this.embed = undefined;
    }
    /** @internal */
    _isHarmonyOS() {
        return (this.view.angularNativeEnvironment
            ?.platform === "harmonyos");
    }
}

export { HarmonyNativeEmbedBinding };
