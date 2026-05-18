package angular.ts

public object ng {
    public const val packageName: String = "angular.ts"

    public fun marker(): String = packageName

    public fun <T> token(name: String): Token<T> = Token(name)

    public fun <T> inject0(factory: () -> T): Injectable0<T> =
        Injectable0(factory)

    public fun <A, T> inject1(
        tokenA: Token<A>,
        factory: (A) -> T,
    ): Injectable1<A, T> =
        Injectable1(tokenA, factory)

    public fun <A, B, T> inject2(
        tokenA: Token<A>,
        tokenB: Token<B>,
        factory: (A, B) -> T,
    ): Injectable2<A, B, T> =
        Injectable2(tokenA, tokenB, factory)
}
