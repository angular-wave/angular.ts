package angular.ts

public sealed interface InjectableFactory<T> {
    public val tokens: List<Token<*>>
}

public class Injectable0<T> internal constructor(
    public val factory: () -> T,
) : InjectableFactory<T> {
    override val tokens: List<Token<*>> = emptyList()
}

public class Injectable1<A, T> internal constructor(
    public val tokenA: Token<A>,
    public val factory: (A) -> T,
) : InjectableFactory<T> {
    override val tokens: List<Token<*>> = listOf(tokenA)
}

public class Injectable2<A, B, T> internal constructor(
    public val tokenA: Token<A>,
    public val tokenB: Token<B>,
    public val factory: (A, B) -> T,
) : InjectableFactory<T> {
    override val tokens: List<Token<*>> = listOf(tokenA, tokenB)
}
