package angular.ts

import angular.ts.generated.Angular as RawAngular
import kotlin.js.JsModule
import kotlin.js.JsNonModule

@JsModule("@angular-wave/angular.ts")
@JsNonModule
private external object AngularTsPackage {
    val angular: RawAngular
}

internal val angularRuntime: RawAngular
    get() = AngularTsPackage.angular
