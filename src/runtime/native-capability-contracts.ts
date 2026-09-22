/** JSON scalar accepted across a native bridge. */
export type NativeJsonPrimitive = boolean | number | string | null;

/** JSON-compatible value accepted across a native bridge. */
export type NativeJsonValue =
  | NativeJsonPrimitive
  | readonly NativeJsonValue[]
  | NativeJsonObject;

/** JSON-compatible object accepted across a native bridge. */
export interface NativeJsonObject {
  readonly [key: string]: NativeJsonValue | undefined;
}

/** Text currently available from the native clipboard. */
export interface NativeClipboardContent {
  readonly text: string | null;
}

/** Text and optional label written to the native clipboard. */
export interface NativeClipboardWriteParameters {
  readonly text: string;
  readonly label?: string;
}

/** Result of writing text to the native clipboard. */
export interface NativeClipboardWriteResult {
  readonly written: boolean;
}

/** Content passed to the native system share sheet. */
export interface NativeShareParameters {
  readonly text: string;
  readonly type?: string;
  readonly title?: string;
}

/** URL passed to a native application through an intent. */
export interface NativeIntentParameters {
  readonly url: string;
}

/** Result of opening native UI or another application. */
export interface NativeOpenResult {
  readonly opened: boolean;
}

/** Current availability and permission state for native notifications. */
export interface NativeNotificationStatus {
  readonly available: boolean;
  readonly granted: boolean;
  readonly permission: string | null;
}

/** Availability and enrollment state for native biometric authentication. */
export interface NativeBiometricStatus {
  readonly available: boolean;
  readonly enrolled: boolean;
  readonly permission: string | null;
}

/** Availability and permission state for the native camera. */
export interface NativeCameraStatus {
  readonly available: boolean;
  readonly granted: boolean;
  readonly permission: string | null;
}

/** Image captured by the native camera. */
export interface NativeCameraCaptureResult {
  readonly uri: string;
  readonly name: string;
  readonly size: number;
  readonly type: "image/jpeg";
}

/** Native file selection and upload support. */
export interface NativeFileStatus {
  readonly available: boolean;
  readonly contentUris: boolean;
  readonly upload: boolean;
}

/** File types and selection mode passed to the native file picker. */
export interface NativeFileOpenParameters {
  readonly accept?: readonly string[];
  readonly multiple?: boolean;
}

/** File returned by the native file picker. */
export interface NativeFileDescriptor {
  readonly uri: string;
  readonly name: string | null;
  readonly size: number | null;
  readonly type: string | null;
  readonly persisted: boolean;
}

/** Files selected through the native file picker. */
export interface NativeFileOpenResult {
  readonly files: readonly NativeFileDescriptor[];
}

/** Multipart upload sent by the native shell. */
export interface NativeFileUploadParameters {
  readonly uri: string;
  readonly url: string;
  readonly uploadId?: string;
  readonly field?: string;
  readonly name?: string;
  readonly type?: string;
  readonly fields?: Readonly<Record<string, string>>;
  readonly headers?: Readonly<Record<string, string>>;
}

/** Successful native multipart upload response. */
export interface NativeFileUploadResult {
  readonly status: number;
  readonly body: NativeJsonValue;
  readonly name: string;
  readonly type: string;
}

/** Progress emitted while the native shell uploads a file. */
export interface NativeFileUploadProgress {
  readonly uploadId: string;
  readonly sent: number;
  readonly total: number | null;
}

/** Native password and passkey provider support. */
export interface NativeCredentialStatus {
  readonly available: boolean;
  readonly passwords: boolean;
  readonly passkeys: boolean;
}

/** Credential kinds requested from the native credential manager. */
export interface NativeCredentialGetParameters {
  readonly passwords?: boolean;
  readonly passkeyRequestJson?: string;
}

/** Credential returned by the native credential manager. */
export type NativeCredentialResult =
  | {
      readonly type: "password";
      readonly id: string;
      readonly password: string;
    }
  | {
      readonly type: "public-key";
      readonly authenticationResponseJson: string;
    }
  | {
      readonly type: string;
    };

/** Password saved through the native credential manager. */
export interface NativeCredentialCreatePasswordParameters {
  readonly id: string;
  readonly password: string;
}

/** Result of saving a password through the native credential manager. */
export interface NativeCredentialCreatePasswordResult {
  readonly created: true;
  readonly type: "password";
}

/** Passkey creation request passed to the native credential manager. */
export interface NativeCredentialCreatePasskeyParameters {
  readonly requestJson: string;
}

/** Result of creating a passkey through the native credential manager. */
export interface NativeCredentialCreatePasskeyResult {
  readonly created: true;
  readonly type: "public-key";
}

/** Result of clearing native credential state. */
export interface NativeCredentialClearResult {
  readonly cleared: true;
}

/** Current state of the native media player. */
export interface NativeMediaStatus {
  readonly available: boolean;
  readonly loaded: boolean;
  readonly playing: boolean;
  readonly position: number;
  readonly duration: number | null;
  readonly state: "idle" | "buffering" | "ready" | "ended";
}

/** Media source loaded by the native player. */
export interface NativeMediaLoadParameters {
  readonly url: string;
  readonly autoplay?: boolean;
}

/** Position, in milliseconds, passed to the native media player. */
export interface NativeMediaSeekParameters {
  readonly position: number;
}

/** Named transition applied by native navigation when motion is enabled. */
export type NativeNavigationTransition =
  | "default"
  | "none"
  | "slide"
  | "fade"
  | "cover"
  | "dive"
  | "flip";

/** URL and optional transition passed to a native route operation. */
export interface NativeNavigationRouteParameters {
  readonly url: string;
  readonly transition?: NativeNavigationTransition;
}

/** Current native navigation stack state. */
export interface NativeNavigationStatus {
  readonly location: string | null;
  readonly previousLocation: string | null;
  readonly canPop: boolean;
  readonly modal: boolean;
}

/** Accepted push, replace, modal, or deep-link operation. */
export interface NativeNavigationRouteResult {
  readonly routed: true;
  readonly method: "push" | "replace" | "modal" | "deep-link";
  readonly phase: "accepted";
  readonly transaction: number;
  readonly url: string;
  readonly action: "advance" | "replace";
  readonly transition: NativeNavigationTransition;
}

/** Result of requesting native back navigation. */
export type NativeNavigationPopResult =
  | (NativeNavigationStatus & {
      readonly routed: false;
      readonly method: "pop";
    })
  | {
      readonly routed: true;
      readonly method: "pop";
      readonly phase: "accepted";
      readonly transaction: number;
      readonly from: string | null;
      readonly url: string | null;
    };

/** Completion or cancellation of navigation requested through the bridge. */
export type NativeNavigationBridgeChange =
  | {
      readonly transaction: number;
      readonly method: "push" | "replace" | "pop" | "modal" | "deep-link";
      readonly phase: "completed";
      readonly source: "bridge";
      readonly from: string | null;
      readonly url: string | null;
    }
  | {
      readonly transaction: number;
      readonly method: "push" | "replace" | "pop" | "modal" | "deep-link";
      readonly phase: "cancelled";
      readonly source: "bridge";
      readonly from: string | null;
      readonly url: string | null;
      readonly reason:
        | "closed"
        | "destination-changed"
        | "failed"
        | "interrupted";
    };

/** Navigation committed directly by Android rather than requested through the bridge. */
export interface NativeNavigationAndroidChange {
  readonly method: "pop" | "deep-link";
  readonly phase: "completed";
  readonly source: "android";
  readonly from: string | null;
  readonly url: string | null;
}

/** Committed or cancelled native navigation event. */
export type NativeNavigationChange =
  | NativeNavigationBridgeChange
  | NativeNavigationAndroidChange;

/** Runtime and application metadata reported by a native shell. */
export interface NativePlatformStatus {
  readonly platform: string;
  readonly sdk: number;
  readonly package: string;
  readonly darkMode: boolean;
}

/** Current native network reachability and cost state. */
export interface NativeConnectivityStatus {
  readonly connected: boolean;
  readonly validated: boolean;
  readonly metered: boolean;
}

/** Current lifecycle state of the native destination. */
export interface NativeLifecycleStatus {
  readonly state:
    | "created"
    | "destroyed"
    | "initialized"
    | "resumed"
    | "started";
  readonly active: boolean;
}

/** Insets, in density-independent pixels, that native content should avoid. */
export interface NativeWindowInsets {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Bounds, in density-independent pixels, of a native display feature. */
export interface NativeWindowBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Fold or hinge reported by a foldable native display. */
export interface NativeWindowDisplayFeature {
  readonly type: "fold" | "hinge";
  readonly state: "flat" | "half-opened";
  readonly orientation: "horizontal" | "vertical";
  readonly separating: boolean;
  readonly bounds: NativeWindowBounds;
}

/** Current native window metrics, adaptive classes, safe area, and display features. */
export interface NativeWindowStatus {
  readonly width: number;
  readonly height: number;
  readonly widthClass:
    | "compact"
    | "medium"
    | "expanded"
    | "large"
    | "extra-large";
  readonly heightClass: "compact" | "medium" | "expanded";
  readonly orientation: "landscape" | "portrait";
  readonly safeArea: NativeWindowInsets;
  readonly displayFeatures: readonly NativeWindowDisplayFeature[];
}

/** Parameters for permission status and request calls. */
export interface NativePermissionParameters {
  readonly permission: string;
}

/** Current state of one Android runtime permission. */
export interface NativePermissionStatus {
  readonly permission: string;
  readonly granted: boolean;
  readonly canRequest: boolean;
}

/** Current availability and granted accuracy for device location. */
export interface NativeGeolocationStatus {
  readonly available: boolean;
  readonly granted: boolean;
  readonly accuracy: "coarse" | "fine" | null;
  readonly permission: string;
}

/** Serializable current device location. */
export interface NativeGeolocationPosition {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy: number;
  readonly altitude: number | null;
  readonly altitudeAccuracy: number | null;
  readonly heading: number | null;
  readonly speed: number | null;
  readonly timestamp: number;
}

/** Parameters for native haptic feedback. */
export interface NativeHapticParameters {
  readonly style?: "click" | "keyboard" | "longPress";
}

/** Result of a native haptic feedback request. */
export interface NativeHapticResult {
  readonly performed: boolean;
}
