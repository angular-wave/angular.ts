import { ArkWebDestination } from "./ArkWebDestination.ets";
import type { ArkUISameLayerSurface } from "../nodes/ArkUISameLayerSurface.ets";

interface NativeEmbedValue {
  readonly domId: string;
  readonly embedId: string;
  readonly surfaceId: string;
  readonly width: number;
  readonly height: number;
}

@Component
export struct AngularNativeWeb {
  @Require @Prop destination: ArkWebDestination;
  @Require @Prop nativeSurface: ArkUISameLayerSurface;
  @State nativeComponentIds: Array<string> = [];

  aboutToAppear(): void {
    this.nativeSurface.surface.onChange(() => {
      this.nativeComponentIds = [...this.nativeSurface.surface.activeComponentIds()];
    });
  }

  aboutToDisappear(): void {
    this.destination.close();
  }

  build() {
    Stack() {
      ForEach(this.nativeComponentIds, (componentId: string) => {
        NodeContainer(this.nativeSurface.controller(componentId));
      }, (componentId: string) => componentId)
      Web({
        src: this.destination.source,
        controller: this.destination.controller,
      })
        .width("100%")
        .height("100%")
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .zoomAccess(false)
        .enableNativeEmbedMode(true)
        .javaScriptProxy({
          object: this.destination.proxy,
          name: "AngularNative",
          methodList: ["receive"],
          controller: this.destination.controller,
          permission: this.destination.permission,
        })
        .onLoadIntercept((event) => this.destination.intercept(event.data.getRequestUrl()))
        .onPageBegin((event) => {
          this.destination.pageStarted(event?.url ?? this.destination.location);
        })
        .onPageEnd((event) => {
          void this.destination.pageReady(event?.url ?? this.destination.location);
        })
        .onNativeEmbedLifecycleChange((embed) => {
          const domId = embed.info?.id?.toString() ?? "";
          if (!domId) return;
          const value: NativeEmbedValue = {
            domId,
            embedId: embed.embedId as string,
            surfaceId: embed.surfaceId as string,
            width: this.getUIContext().px2vp(embed.info?.width ?? 0),
            height: this.getUIContext().px2vp(embed.info?.height ?? 0),
          };
          if (embed.status === NativeEmbedStatus.CREATE) {
            this.nativeSurface.surface.embedCreated(value);
          } else if (embed.status === NativeEmbedStatus.UPDATE) {
            this.nativeSurface.surface.embedUpdated(value);
          } else {
            this.nativeSurface.surface.embedDestroyed(domId);
          }
        })
        .onNativeEmbedGestureEvent((touch) => {
          this.nativeSurface.surface.postTouchEvent(
            touch.embedId as string,
            touch.touchEvent,
          );
        });
    }
    .width("100%")
    .height("100%");
  }
}
