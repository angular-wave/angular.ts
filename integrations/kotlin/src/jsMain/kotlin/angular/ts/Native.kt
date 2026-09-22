package angular.ts

import angular.ts.generated.NativeBridgeAdapter as RawNativeBridgeAdapter
import angular.ts.generated.NativeBiometricStatus as RawNativeBiometricStatus
import angular.ts.generated.NativeCameraCaptureResult as RawNativeCameraCaptureResult
import angular.ts.generated.NativeCameraStatus as RawNativeCameraStatus
import angular.ts.generated.NativeCapabilityEventMap as RawNativeCapabilityEventMap
import angular.ts.generated.NativeCapabilityEventName as RawNativeCapabilityEventName
import angular.ts.generated.NativeCapabilityEventPayload as RawNativeCapabilityEventPayload
import angular.ts.generated.NativeCapabilityMethodContract as RawNativeCapabilityMethodContract
import angular.ts.generated.NativeCapabilityMethodMap as RawNativeCapabilityMethodMap
import angular.ts.generated.NativeCapabilityMethodName as RawNativeCapabilityMethodName
import angular.ts.generated.NativeCapabilityName as RawNativeCapabilityName
import angular.ts.generated.NativeCapabilityParameters as RawNativeCapabilityParameters
import angular.ts.generated.NativeCapabilityResult as RawNativeCapabilityResult
import angular.ts.generated.NativeCallMessage as RawNativeCallMessage
import angular.ts.generated.NativeCallOptions as RawNativeCallOptions
import angular.ts.generated.NativeClipboardContent as RawNativeClipboardContent
import angular.ts.generated.NativeClipboardWriteParameters as RawNativeClipboardWriteParameters
import angular.ts.generated.NativeClipboardWriteResult as RawNativeClipboardWriteResult
import angular.ts.generated.NativeConfig as RawNativeConfig
import angular.ts.generated.NativeConnectivityStatus as RawNativeConnectivityStatus
import angular.ts.generated.NativeCredentialClearResult as RawNativeCredentialClearResult
import angular.ts.generated.NativeCredentialCreatePasskeyParameters as RawNativeCredentialCreatePasskeyParameters
import angular.ts.generated.NativeCredentialCreatePasskeyResult as RawNativeCredentialCreatePasskeyResult
import angular.ts.generated.NativeCredentialCreatePasswordParameters as RawNativeCredentialCreatePasswordParameters
import angular.ts.generated.NativeCredentialCreatePasswordResult as RawNativeCredentialCreatePasswordResult
import angular.ts.generated.NativeCredentialGetParameters as RawNativeCredentialGetParameters
import angular.ts.generated.NativeCredentialResult as RawNativeCredentialResult
import angular.ts.generated.NativeCredentialStatus as RawNativeCredentialStatus
import angular.ts.generated.NativeEventHandler as RawNativeEventHandler
import angular.ts.generated.NativeEventMessage as RawNativeEventMessage
import angular.ts.generated.NativeFileDescriptor as RawNativeFileDescriptor
import angular.ts.generated.NativeFileOpenParameters as RawNativeFileOpenParameters
import angular.ts.generated.NativeFileOpenResult as RawNativeFileOpenResult
import angular.ts.generated.NativeFileStatus as RawNativeFileStatus
import angular.ts.generated.NativeFileUploadParameters as RawNativeFileUploadParameters
import angular.ts.generated.NativeFileUploadProgress as RawNativeFileUploadProgress
import angular.ts.generated.NativeFileUploadResult as RawNativeFileUploadResult
import angular.ts.generated.NativeGeolocationPosition as RawNativeGeolocationPosition
import angular.ts.generated.NativeGeolocationStatus as RawNativeGeolocationStatus
import angular.ts.generated.NativeHapticParameters as RawNativeHapticParameters
import angular.ts.generated.NativeHapticResult as RawNativeHapticResult
import angular.ts.generated.NativeIntentParameters as RawNativeIntentParameters
import angular.ts.generated.NativeJsonObject as RawNativeJsonObject
import angular.ts.generated.NativeJsonPrimitive as RawNativeJsonPrimitive
import angular.ts.generated.NativeJsonValue as RawNativeJsonValue
import angular.ts.generated.NativeLifecycleStatus as RawNativeLifecycleStatus
import angular.ts.generated.NativeMediaLoadParameters as RawNativeMediaLoadParameters
import angular.ts.generated.NativeMediaSeekParameters as RawNativeMediaSeekParameters
import angular.ts.generated.NativeMediaStatus as RawNativeMediaStatus
import angular.ts.generated.NativeNavigationAndroidChange as RawNativeNavigationAndroidChange
import angular.ts.generated.NativeNavigationBridgeChange as RawNativeNavigationBridgeChange
import angular.ts.generated.NativeNavigationChange as RawNativeNavigationChange
import angular.ts.generated.NativeNavigationPopResult as RawNativeNavigationPopResult
import angular.ts.generated.NativeNavigationRouteParameters as RawNativeNavigationRouteParameters
import angular.ts.generated.NativeNavigationRouteResult as RawNativeNavigationRouteResult
import angular.ts.generated.NativeNavigationStatus as RawNativeNavigationStatus
import angular.ts.generated.NativeNavigationTransition as RawNativeNavigationTransition
import angular.ts.generated.NativeNotificationStatus as RawNativeNotificationStatus
import angular.ts.generated.NativeOpenResult as RawNativeOpenResult
import angular.ts.generated.NativePermissionParameters as RawNativePermissionParameters
import angular.ts.generated.NativePermissionStatus as RawNativePermissionStatus
import angular.ts.generated.NativePlatformStatus as RawNativePlatformStatus
import angular.ts.generated.NativeShareParameters as RawNativeShareParameters
import angular.ts.generated.NativeReplyMessage as RawNativeReplyMessage
import angular.ts.generated.NativeService as RawNativeService
import angular.ts.generated.NativeWindowBounds as RawNativeWindowBounds
import angular.ts.generated.NativeWindowDisplayFeature as RawNativeWindowDisplayFeature
import angular.ts.generated.NativeWindowInsets as RawNativeWindowInsets
import angular.ts.generated.NativeWindowStatus as RawNativeWindowStatus

public typealias NativeBridgeAdapter =
    RawNativeBridgeAdapter
public typealias NativeBiometricStatus =
    RawNativeBiometricStatus
public typealias NativeCameraCaptureResult =
    RawNativeCameraCaptureResult
public typealias NativeCameraStatus =
    RawNativeCameraStatus
public typealias NativeCapabilityEventMap =
    RawNativeCapabilityEventMap
public typealias NativeCapabilityEventName<Name> =
    RawNativeCapabilityEventName<Name>
public typealias NativeCapabilityEventPayload<Name, Event> =
    RawNativeCapabilityEventPayload<Name, Event>
public typealias NativeCapabilityMethodContract<Name, Method> =
    RawNativeCapabilityMethodContract<Name, Method>
public typealias NativeCapabilityMethodMap =
    RawNativeCapabilityMethodMap
public typealias NativeCapabilityMethodName<Name> =
    RawNativeCapabilityMethodName<Name>
public typealias NativeCapabilityName =
    RawNativeCapabilityName
public typealias NativeCapabilityParameters<Name, Method> =
    RawNativeCapabilityParameters<Name, Method>
public typealias NativeCapabilityResult<Name, Method> =
    RawNativeCapabilityResult<Name, Method>
public typealias NativeCallMessage<TParams> =
    RawNativeCallMessage<TParams>
public typealias NativeCallOptions =
    RawNativeCallOptions
public typealias NativeClipboardContent =
    RawNativeClipboardContent
public typealias NativeClipboardWriteParameters =
    RawNativeClipboardWriteParameters
public typealias NativeClipboardWriteResult =
    RawNativeClipboardWriteResult
public typealias NativeConfig =
    RawNativeConfig
public typealias NativeConnectivityStatus =
    RawNativeConnectivityStatus
public typealias NativeCredentialClearResult =
    RawNativeCredentialClearResult
public typealias NativeCredentialCreatePasskeyParameters =
    RawNativeCredentialCreatePasskeyParameters
public typealias NativeCredentialCreatePasskeyResult =
    RawNativeCredentialCreatePasskeyResult
public typealias NativeCredentialCreatePasswordParameters =
    RawNativeCredentialCreatePasswordParameters
public typealias NativeCredentialCreatePasswordResult =
    RawNativeCredentialCreatePasswordResult
public typealias NativeCredentialGetParameters =
    RawNativeCredentialGetParameters
public typealias NativeCredentialResult =
    RawNativeCredentialResult
public typealias NativeCredentialStatus =
    RawNativeCredentialStatus
public typealias NativeEventHandler<TData> =
    RawNativeEventHandler<TData>
public typealias NativeEventMessage<TData> =
    RawNativeEventMessage<TData>
public typealias NativeFileDescriptor =
    RawNativeFileDescriptor
public typealias NativeFileOpenParameters =
    RawNativeFileOpenParameters
public typealias NativeFileOpenResult =
    RawNativeFileOpenResult
public typealias NativeFileStatus =
    RawNativeFileStatus
public typealias NativeFileUploadParameters =
    RawNativeFileUploadParameters
public typealias NativeFileUploadProgress =
    RawNativeFileUploadProgress
public typealias NativeFileUploadResult =
    RawNativeFileUploadResult
public typealias NativeGeolocationPosition =
    RawNativeGeolocationPosition
public typealias NativeGeolocationStatus =
    RawNativeGeolocationStatus
public typealias NativeHapticParameters =
    RawNativeHapticParameters
public typealias NativeHapticResult =
    RawNativeHapticResult
public typealias NativeIntentParameters =
    RawNativeIntentParameters
public typealias NativeJsonObject =
    RawNativeJsonObject
public typealias NativeJsonPrimitive =
    RawNativeJsonPrimitive
public typealias NativeJsonValue =
    RawNativeJsonValue
public typealias NativeLifecycleStatus =
    RawNativeLifecycleStatus
public typealias NativeMediaLoadParameters =
    RawNativeMediaLoadParameters
public typealias NativeMediaSeekParameters =
    RawNativeMediaSeekParameters
public typealias NativeMediaStatus =
    RawNativeMediaStatus
public typealias NativeNavigationAndroidChange =
    RawNativeNavigationAndroidChange
public typealias NativeNavigationBridgeChange =
    RawNativeNavigationBridgeChange
public typealias NativeNavigationChange =
    RawNativeNavigationChange
public typealias NativeNavigationPopResult =
    RawNativeNavigationPopResult
public typealias NativeNavigationRouteParameters =
    RawNativeNavigationRouteParameters
public typealias NativeNavigationRouteResult =
    RawNativeNavigationRouteResult
public typealias NativeNavigationStatus =
    RawNativeNavigationStatus
public typealias NativeNavigationTransition =
    RawNativeNavigationTransition
public typealias NativeNotificationStatus =
    RawNativeNotificationStatus
public typealias NativeOpenResult =
    RawNativeOpenResult
public typealias NativePermissionParameters =
    RawNativePermissionParameters
public typealias NativePermissionStatus =
    RawNativePermissionStatus
public typealias NativePlatformStatus =
    RawNativePlatformStatus
public typealias NativeShareParameters =
    RawNativeShareParameters
public typealias NativeReplyMessage<TResult> =
    RawNativeReplyMessage<TResult>
public typealias NativeService =
    RawNativeService
public typealias NativeWindowBounds =
    RawNativeWindowBounds
public typealias NativeWindowDisplayFeature =
    RawNativeWindowDisplayFeature
public typealias NativeWindowInsets =
    RawNativeWindowInsets
public typealias NativeWindowStatus =
    RawNativeWindowStatus
