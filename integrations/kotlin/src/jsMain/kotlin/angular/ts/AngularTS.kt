package angular.ts

public object ng {
    public const val packageName: String = "angular.ts"

    public fun marker(): String = packageName

    public fun <T> token(name: String): Token<T> = Token(name)

    public fun injector(
        modules: List<String>,
        strictDi: Boolean = false,
    ): Injector =
        Injector(angularRuntime.injector(modules.toTypedArray(), strictDi))

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

    public fun <A, B, C, T> inject3(
        tokenA: Token<A>,
        tokenB: Token<B>,
        tokenC: Token<C>,
        factory: (A, B, C) -> T,
    ): Injectable3<A, B, C, T> =
        Injectable3(tokenA, tokenB, tokenC, factory)

    public fun <A, B, C, D, T> inject4(
        tokenA: Token<A>,
        tokenB: Token<B>,
        tokenC: Token<C>,
        tokenD: Token<D>,
        factory: (A, B, C, D) -> T,
    ): Injectable4<A, B, C, D, T> =
        Injectable4(tokenA, tokenB, tokenC, tokenD, factory)

    public fun <A, B, C, D, E, T> inject5(
        tokenA: Token<A>,
        tokenB: Token<B>,
        tokenC: Token<C>,
        tokenD: Token<D>,
        tokenE: Token<E>,
        factory: (A, B, C, D, E) -> T,
    ): Injectable5<A, B, C, D, E, T> =
        Injectable5(tokenA, tokenB, tokenC, tokenD, tokenE, factory)

    public fun <A, B, C, D, E, F, T> inject6(
        tokenA: Token<A>,
        tokenB: Token<B>,
        tokenC: Token<C>,
        tokenD: Token<D>,
        tokenE: Token<E>,
        tokenF: Token<F>,
        factory: (A, B, C, D, E, F) -> T,
    ): Injectable6<A, B, C, D, E, F, T> =
        Injectable6(tokenA, tokenB, tokenC, tokenD, tokenE, tokenF, factory)

    public fun <A, B, C, D, E, F, G, T> inject7(
        tokenA: Token<A>,
        tokenB: Token<B>,
        tokenC: Token<C>,
        tokenD: Token<D>,
        tokenE: Token<E>,
        tokenF: Token<F>,
        tokenG: Token<G>,
        factory: (A, B, C, D, E, F, G) -> T,
    ): Injectable7<A, B, C, D, E, F, G, T> =
        Injectable7(tokenA, tokenB, tokenC, tokenD, tokenE, tokenF, tokenG, factory)

    public fun <A, B, C, D, E, F, G, H, T> inject8(
        tokenA: Token<A>,
        tokenB: Token<B>,
        tokenC: Token<C>,
        tokenD: Token<D>,
        tokenE: Token<E>,
        tokenF: Token<F>,
        tokenG: Token<G>,
        tokenH: Token<H>,
        factory: (A, B, C, D, E, F, G, H) -> T,
    ): Injectable8<A, B, C, D, E, F, G, H, T> =
        Injectable8(tokenA, tokenB, tokenC, tokenD, tokenE, tokenF, tokenG, tokenH, factory)
}
