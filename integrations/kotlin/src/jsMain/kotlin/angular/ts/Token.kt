package angular.ts

public class Token<T> public constructor(
    public val name: String,
) {
    internal constructor(
        name: String,
        fromJs: (dynamic) -> T,
    ) : this(name) {
        this.fromJs = fromJs
    }

    internal var fromJs: (dynamic) -> T = { value -> value.unsafeCast<T>() }

    override fun equals(other: Any?): Boolean =
        other is Token<*> && name == other.name

    override fun hashCode(): Int = name.hashCode()

    override fun toString(): String = "Token(name=$name)"
}
