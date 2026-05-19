package angular.ts

@Suppress("UNUSED_PARAMETER")
internal fun callJsFunction(
    fn: dynamic,
    thisArg: dynamic,
    args: Array<out Any?>,
): dynamic =
    js("fn.apply(thisArg, args)")
