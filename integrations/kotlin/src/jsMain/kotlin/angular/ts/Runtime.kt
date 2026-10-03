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

/** Lazily retrieves the shared reactive model from the initialized runtime. */
public fun <T> ng.getModel(token: Token<T>): T =
    token.fromJs(angularRuntime.getModel(token.name))

/** Retrieves a reactive model by name for dynamic JavaScript interoperability. */
public fun ng.getModel(name: String): dynamic = angularRuntime.getModel(name)
