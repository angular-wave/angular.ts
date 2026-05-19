package angular.ts

import angular.ts.generated.Scope as RawScope

public class Scope<TState : Any> internal constructor(
    internal val raw: RawScope,
) {
    public val state: TState
        get() = raw.unsafeCast<TState>()

    public val unsafe: dynamic
        get() = raw

    public fun watch(
        expression: String,
        lazy: Boolean = false,
        listener: (newValue: Any?, state: TState) -> Unit,
    ): (() -> Unit)? {
        val disposer = raw.`$watch`(
            expression,
            { newValue: dynamic, originalTarget: dynamic ->
                listener(newValue, originalTarget.unsafeCast<TState>())
            },
            lazy,
        )

        return disposer.unsafeCast<(() -> Unit)?>()
    }

    public fun on(
        name: String,
        listener: (event: Any?) -> Unit,
    ): () -> Unit =
        raw.`$on`(name, listener).unsafeCast<() -> Unit>()

    public fun emit(
        name: String,
        vararg args: Any?,
    ): Any? =
        raw.`$emit`(name, *args.unsafeCast<Array<dynamic>>())

    public fun broadcast(
        name: String,
        vararg args: Any?,
    ): Any? =
        raw.`$broadcast`(name, *args.unsafeCast<Array<dynamic>>())

    public fun child(): Scope<TState> =
        Scope(raw.`$new`().unsafeCast<RawScope>())

    public fun isolateChild(): Scope<TState> =
        Scope(raw.`$newIsolate`().unsafeCast<RawScope>())

    public fun merge(value: Any) {
        raw.`$merge`(value)
    }

    public fun destroy() {
        raw.`$destroy`()
    }
}
