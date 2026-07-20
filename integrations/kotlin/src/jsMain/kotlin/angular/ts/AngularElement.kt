package angular.ts

import angular.ts.generated.Angular as RawAngular
import angular.ts.generated.AngularElementDefinition as RawAngularElementDefinition
import angular.ts.generated.InjectorService as RawInjectorService
import angular.ts.generated.NgModule as RawNgModule
import kotlin.js.JsModule
import kotlin.js.JsNonModule

@JsModule("@angular-wave/angular.ts/runtime")
@JsNonModule
private external object AngularElementRuntime {
    fun defineAngularElement(
        name: String,
        options: dynamic,
    ): RawAngularElementDefinition

    fun createAngularElement(
        name: String,
        options: dynamic,
    ): RawAngularElementDefinition
}

public typealias AngularElementConfigure = (NgModule, Angular) -> Unit

public data class AngularElementModuleOptions public constructor(
    public val name: String? = null,
    public val requires: List<String> = emptyList(),
    public val configure: AngularElementConfigure? = null,
)

public data class AngularElementOptions<TState : Any> public constructor(
    public val component: AppComponent<TState>,
    public val ngModule: Any? = null,
    public val elementModule: AngularElementModuleOptions = AngularElementModuleOptions(),
    public val subapp: Boolean? = null,
    public val registerBuiltins: Boolean? = null,
    public val extra: Map<String, Any?> = emptyMap(),
)

public class AngularElementDefinition internal constructor(
    internal val raw: RawAngularElementDefinition,
) {
    public val angular: Angular
        get() = Angular(raw.angular.unsafeCast<RawAngular>())

    public val ngModule: NgModule
        get() = NgModule(raw.ngModule.unsafeCast<RawNgModule>())

    public val elementModule: NgModule
        get() = NgModule(raw.elementModule.unsafeCast<RawNgModule>())

    public val injector: Injector
        get() = Injector(raw.injector.unsafeCast<RawInjectorService<Any?>>())

    public val element: Any?
        get() = raw.element

    public val name: String
        get() = raw.name

    public companion object {
        public fun unsafe(raw: Any): AngularElementDefinition =
            AngularElementDefinition(raw.unsafeCast<RawAngularElementDefinition>())
    }
}

public fun <TState : Any> defineAngularElement(
    name: String,
    options: AngularElementOptions<TState>,
): AngularElementDefinition =
    AngularElementDefinition(AngularElementRuntime.defineAngularElement(name, options.toJs()))

public fun <TState : Any> createAngularElement(
    name: String,
    options: AngularElementOptions<TState>,
): AngularElementDefinition =
    AngularElementDefinition(AngularElementRuntime.createAngularElement(name, options.toJs()))

internal fun AngularElementModuleOptions.toJs(): dynamic {
    val raw = js("{}")

    if (name != null) raw.name = name
    if (requires.isNotEmpty()) raw.requires = requires.toTypedArray()
    if (configure != null) {
        raw.configure = { module: dynamic, angular: dynamic ->
            configure.invoke(
                NgModule(module.unsafeCast<RawNgModule>()),
                Angular(angular.unsafeCast<RawAngular>()),
            )
        }
    }

    return raw
}

internal fun <TState : Any> AngularElementOptions<TState>.toJs(): dynamic {
    val raw = extra.toJsRecord()

    if (ngModule != null) raw.ngModule = ngModule
    if (subapp != null) raw.subapp = subapp
    if (registerBuiltins != null) raw.registerBuiltins = registerBuiltins
    raw.elementModule = elementModule.toJs()
    raw.component = component.toJs()

    return raw
}
