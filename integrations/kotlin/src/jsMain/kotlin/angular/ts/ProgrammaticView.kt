package angular.ts

import angular.ts.generated.Angular as RawAngular
import angular.ts.generated.ProgrammaticViewContext as RawProgrammaticViewContext
import angular.ts.generated.ProgrammaticViewTags as RawProgrammaticViewTags
import angular.ts.generated.Scope as RawScope
import org.w3c.dom.Element
import org.w3c.dom.HTMLElement

public class ProgrammaticViewContext<TController, TRequired> internal constructor(
    internal val raw: RawProgrammaticViewContext<TController, TRequired, RawScope, HTMLElement>,
) {
    public val controller: TController?
        get() = raw.controller.unsafeCast<TController?>()

    public val required: TRequired?
        get() = raw.required.unsafeCast<TRequired?>()

    public val scope: Scope<Any>
        get() = Scope(raw.scope.unsafeCast<RawScope>())

    public val host: HTMLElement
        get() = raw.asDynamic().host.unsafeCast<HTMLElement>()

    public val transclude: dynamic
        get() = raw.asDynamic().transclude

    public fun onDestroy(cleanup: () -> Unit): () -> Unit =
        raw.onDestroy(cleanup)
}

public typealias ProgrammaticView<TController, TRequired> =
    (ProgrammaticViewContext<TController, TRequired>) -> dynamic

internal fun <TController, TRequired> ProgrammaticView<TController, TRequired>.toJs(): dynamic =
    { context: dynamic ->
        this(
            ProgrammaticViewContext(
                context.unsafeCast<
                    RawProgrammaticViewContext<TController, TRequired, RawScope, HTMLElement>,
                >(),
            ),
        )
    }

public class ProgrammaticTags internal constructor(
    internal val raw: RawProgrammaticViewTags,
) {
    public fun namespace(namespaceUri: String): ProgrammaticTags =
        ProgrammaticTags(raw(namespaceUri).unsafeCast<RawProgrammaticViewTags>())

    public fun tag(
        name: String,
        properties: Map<String, Any?> = emptyMap(),
        vararg children: Any?,
    ): Element {
        val arguments = arrayOf(properties.toJsRecord(), *children)

        return callJsFunction(raw.asDynamic()[name], null, arguments).unsafeCast<Element>()
    }
}

public class ProgrammaticViewApi internal constructor(
    internal val raw: RawAngular,
) {
    public val tags: ProgrammaticTags
        get() = ProgrammaticTags(raw.view.tags)

    public fun event(
        listener: (dynamic) -> Unit,
        options: dynamic = undefined,
    ): dynamic = callJsFunction(raw.view.event, null, arrayOf(listener, options))

    public fun attrs(values: Map<String, Any?>): dynamic =
        callJsFunction(raw.view.attrs, null, arrayOf(values.toJsRecord()))

    public fun props(values: Map<String, Any?>): dynamic =
        callJsFunction(raw.view.props, null, arrayOf(values.toJsRecord()))

    public fun <T> each(
        read: () -> Array<T>?,
        key: (T) -> Any,
        render: (() -> T) -> Any?,
    ): dynamic = callJsFunction(raw.view.each, null, arrayOf(read, key, render))

    public fun tag(
        name: String,
        properties: Map<String, Any?> = emptyMap(),
        vararg children: Any?,
    ): Element = callJsFunction(
        raw.view.tag,
        null,
        arrayOf(name, properties.toJsRecord(), *children),
    ).unsafeCast<Element>()

    public fun tagNS(
        namespaceUri: String,
        name: String,
        properties: Map<String, Any?> = emptyMap(),
        vararg children: Any?,
    ): Element = callJsFunction(
        raw.view.tagNS,
        null,
        arrayOf(namespaceUri, name, properties.toJsRecord(), *children),
    ).unsafeCast<Element>()
}
