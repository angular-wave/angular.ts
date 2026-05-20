package angular.ts.unsafe

public object UnsafeInterop {
    public fun objectLiteral(): dynamic =
        js("{}")

    public fun get(
        target: Any?,
        name: String,
    ): Any? =
        target.asDynamic()[name]

    public fun set(
        target: Any?,
        name: String,
        value: Any?,
    ) {
        target.asDynamic()[name] = value
    }

    public fun call(
        target: Any?,
        name: String,
        vararg args: Any?,
    ): Any? =
        target.asDynamic()[name].apply(target, args)

    public fun <T> cast(value: Any?): T =
        value.unsafeCast<T>()
}
