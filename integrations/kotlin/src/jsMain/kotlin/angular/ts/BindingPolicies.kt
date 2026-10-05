package angular.ts

/** Synchronous sanitizer or validator. Throw to reject the input. */
public typealias BindingPolicy = (String) -> String

public typealias HtmlPolicy = BindingPolicy
public typealias UrlPolicy = BindingPolicy
public typealias ScriptPolicy = BindingPolicy
public typealias ScriptUrlPolicy = BindingPolicy

public enum class BindingContext(public val raw: String) {
    Html("html"),
    Url("url"),
    MediaUrl("mediaUrl"),
    ResourceUrl("resourceUrl"),
    Script("script"),
    ScriptUrl("scriptUrl"),
}

/** Destination-specific compiler callbacks. Omitted policies keep framework defaults. */
public data class BindingPolicyConfig(
    public val htmlPolicy: BindingPolicy? = null,
    public val urlPolicy: BindingPolicy? = null,
    public val mediaUrlPolicy: BindingPolicy? = null,
    public val resourceUrlPolicy: BindingPolicy? = null,
    public val scriptPolicy: BindingPolicy? = null,
    public val scriptUrlPolicy: BindingPolicy? = null,
) {
    internal fun toJs(): dynamic =
        mapOf(
            "htmlPolicy" to htmlPolicy,
            "urlPolicy" to urlPolicy,
            "mediaUrlPolicy" to mediaUrlPolicy,
            "resourceUrlPolicy" to resourceUrlPolicy,
            "scriptPolicy" to scriptPolicy,
            "scriptUrlPolicy" to scriptUrlPolicy,
        ).filterValues { it != null }.toJsRecord()
}
