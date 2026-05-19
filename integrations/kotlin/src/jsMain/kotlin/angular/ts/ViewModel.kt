package angular.ts

public class ViewModelBuilder internal constructor() {
    private val raw: dynamic = js("{}")

    public fun property(
        name: String,
        value: Any?,
    ): ViewModelBuilder {
        raw[name] = value
        return this
    }

    public fun method(
        name: String,
        callback: () -> Any?,
    ): ViewModelBuilder {
        raw[name] = callback
        return this
    }

    public fun onInit(callback: () -> Unit): ViewModelBuilder {
        raw.`$onInit` = callback
        return this
    }

    public fun onChanges(callback: (changes: dynamic) -> Unit): ViewModelBuilder {
        raw.`$onChanges` = callback
        return this
    }

    public fun onDestroy(callback: () -> Unit): ViewModelBuilder {
        raw.`$onDestroy` = callback
        return this
    }

    public fun postLink(callback: () -> Unit): ViewModelBuilder {
        raw.`$postLink` = callback
        return this
    }

    internal fun build(): dynamic = raw
}

public fun ng.viewModel(configure: ViewModelBuilder.() -> Unit): dynamic {
    val builder = ViewModelBuilder()

    builder.configure()
    return builder.build()
}
