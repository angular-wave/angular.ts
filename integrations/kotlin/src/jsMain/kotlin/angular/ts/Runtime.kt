package angular.ts

import angular.ts.generated.Angular
import kotlin.js.JsModule
import kotlin.js.JsNonModule

@JsModule("@angular-wave/angular.ts")
@JsNonModule
private external object AngularTsPackage {
    val angular: Angular
}

internal val angularRuntime: Angular
    get() = AngularTsPackage.angular
