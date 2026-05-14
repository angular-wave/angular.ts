package org.angular.ts;

import jsinterop.annotations.JsPackage;
import jsinterop.annotations.JsType;

/** Browser-native JavaScript Promise used by generated AngularTS bindings. */
@JsType(isNative = true, namespace = JsPackage.GLOBAL, name = "Promise")
public interface Promise<T> {}
