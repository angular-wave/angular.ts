package angular.ts

internal fun Map<String, *>.toJsRecord(): dynamic {
    val raw = js("{}")

    for ((key, value) in this) {
        raw[key] = value
    }

    return raw
}
