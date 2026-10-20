import { BusinessError } from "@kit.BasicServicesKit";
import { window } from "@kit.ArkUI";

export type AngularNativePageLoadFailureHandler = (message: string) => void;

export interface AngularNativePageLoadOptions {
  onFailure?: AngularNativePageLoadFailureHandler;
  onLoaded?: () => void;
}

/** Loads an ArkUI page without leaking WindowStage exceptions from an ability lifecycle. */
export function loadAngularNativePage(
  windowStage: window.WindowStage,
  page: string,
  options: AngularNativePageLoadOptions = {},
): void {
  const onFailure = options.onFailure ?? ((message: string): void => {
    console.error(message);
  });
  try {
    windowStage.loadContent(page, (error: BusinessError): void => {
      if (error.code !== 0) {
        onFailure(`HarmonyOS could not load ${page}: ${error.code}`);
        return;
      }
      options.onLoaded?.();
    });
  } catch {
    onFailure(`HarmonyOS could not load ${page}`);
  }
}
