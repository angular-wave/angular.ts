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

public class Injectable3<A, B, C, T> internal constructor(
    public val tokenA: Token<A>,
    public val tokenB: Token<B>,
    public val tokenC: Token<C>,
    public val factory: (A, B, C) -> T,
) : InjectableFactory<T> {
    override val tokens: List<Token<*>> = listOf(tokenA, tokenB, tokenC)
}

public class Injectable4<A, B, C, D, T> internal constructor(
    public val tokenA: Token<A>,
    public val tokenB: Token<B>,
    public val tokenC: Token<C>,
    public val tokenD: Token<D>,
    public val factory: (A, B, C, D) -> T,
) : InjectableFactory<T> {
    override val tokens: List<Token<*>> = listOf(tokenA, tokenB, tokenC, tokenD)
}

public class Injectable5<A, B, C, D, E, T> internal constructor(
    public val tokenA: Token<A>,
    public val tokenB: Token<B>,
    public val tokenC: Token<C>,
    public val tokenD: Token<D>,
    public val tokenE: Token<E>,
    public val factory: (A, B, C, D, E) -> T,
) : InjectableFactory<T> {
    override val tokens: List<Token<*>> = listOf(tokenA, tokenB, tokenC, tokenD, tokenE)
}

public class Injectable6<A, B, C, D, E, F, T> internal constructor(
    public val tokenA: Token<A>,
    public val tokenB: Token<B>,
    public val tokenC: Token<C>,
    public val tokenD: Token<D>,
    public val tokenE: Token<E>,
    public val tokenF: Token<F>,
    public val factory: (A, B, C, D, E, F) -> T,
) : InjectableFactory<T> {
    override val tokens: List<Token<*>> = listOf(tokenA, tokenB, tokenC, tokenD, tokenE, tokenF)
}

public class Injectable7<A, B, C, D, E, F, G, T> internal constructor(
    public val tokenA: Token<A>,
    public val tokenB: Token<B>,
    public val tokenC: Token<C>,
    public val tokenD: Token<D>,
    public val tokenE: Token<E>,
    public val tokenF: Token<F>,
    public val tokenG: Token<G>,
    public val factory: (A, B, C, D, E, F, G) -> T,
) : InjectableFactory<T> {
    override val tokens: List<Token<*>> = listOf(tokenA, tokenB, tokenC, tokenD, tokenE, tokenF, tokenG)
}

public class Injectable8<A, B, C, D, E, F, G, H, T> internal constructor(
    public val tokenA: Token<A>,
    public val tokenB: Token<B>,
    public val tokenC: Token<C>,
    public val tokenD: Token<D>,
    public val tokenE: Token<E>,
    public val tokenF: Token<F>,
    public val tokenG: Token<G>,
    public val tokenH: Token<H>,
    public val factory: (A, B, C, D, E, F, G, H) -> T,
) : InjectableFactory<T> {
    override val tokens: List<Token<*>> = listOf(tokenA, tokenB, tokenC, tokenD, tokenE, tokenF, tokenG, tokenH)
}

public class InjectableUnsafe<T> public constructor(
    override val tokens: List<Token<*>>,
    public val factory: dynamic,
) : InjectableFactory<T>

internal fun InjectableFactory<*>.toJs(): dynamic {
    val tokenNames = tokens.map { token -> token.name }.toTypedArray()

    return when (this) {
        is Injectable0<*> -> annotatedFactory(tokenNames, jsFactory0(factory))
        is Injectable1<*, *> -> {
            val factory = factory.unsafeCast<(dynamic) -> Any?>()

            annotatedFactory(tokenNames, jsFactory1 { a -> factory(tokenA.fromJsDynamic(a)) })
        }
        is Injectable2<*, *, *> -> {
            val factory = factory.unsafeCast<(dynamic, dynamic) -> Any?>()

            annotatedFactory(
                tokenNames,
                jsFactory2 { a, b -> factory(tokenA.fromJsDynamic(a), tokenB.fromJsDynamic(b)) },
            )
        }
        is Injectable3<*, *, *, *> -> {
            val factory = factory.unsafeCast<(dynamic, dynamic, dynamic) -> Any?>()

            annotatedFactory(
                tokenNames,
                jsFactory3 { a, b, c ->
                    factory(tokenA.fromJsDynamic(a), tokenB.fromJsDynamic(b), tokenC.fromJsDynamic(c))
                },
            )
        }
        is Injectable4<*, *, *, *, *> -> {
            val factory = factory.unsafeCast<(dynamic, dynamic, dynamic, dynamic) -> Any?>()

            annotatedFactory(
                tokenNames,
                jsFactory4 { a, b, c, d ->
                    factory(
                        tokenA.fromJsDynamic(a),
                        tokenB.fromJsDynamic(b),
                        tokenC.fromJsDynamic(c),
                        tokenD.fromJsDynamic(d),
                    )
                },
            )
        }
        is Injectable5<*, *, *, *, *, *> -> {
            val factory = factory.unsafeCast<(dynamic, dynamic, dynamic, dynamic, dynamic) -> Any?>()

            annotatedFactory(
                tokenNames,
                jsFactory5 { a, b, c, d, e ->
                    factory(
                        tokenA.fromJsDynamic(a),
                        tokenB.fromJsDynamic(b),
                        tokenC.fromJsDynamic(c),
                        tokenD.fromJsDynamic(d),
                        tokenE.fromJsDynamic(e),
                    )
                },
            )
        }
        is Injectable6<*, *, *, *, *, *, *> -> {
            val factory = factory.unsafeCast<(dynamic, dynamic, dynamic, dynamic, dynamic, dynamic) -> Any?>()

            annotatedFactory(
                tokenNames,
                jsFactory6 { a, b, c, d, e, f ->
                    factory(
                        tokenA.fromJsDynamic(a),
                        tokenB.fromJsDynamic(b),
                        tokenC.fromJsDynamic(c),
                        tokenD.fromJsDynamic(d),
                        tokenE.fromJsDynamic(e),
                        tokenF.fromJsDynamic(f),
                    )
                },
            )
        }
        is Injectable7<*, *, *, *, *, *, *, *> -> {
            val factory = factory.unsafeCast<(dynamic, dynamic, dynamic, dynamic, dynamic, dynamic, dynamic) -> Any?>()

            annotatedFactory(
                tokenNames,
                jsFactory7 { a, b, c, d, e, f, g ->
                    factory(
                        tokenA.fromJsDynamic(a),
                        tokenB.fromJsDynamic(b),
                        tokenC.fromJsDynamic(c),
                        tokenD.fromJsDynamic(d),
                        tokenE.fromJsDynamic(e),
                        tokenF.fromJsDynamic(f),
                        tokenG.fromJsDynamic(g),
                    )
                },
            )
        }
        is Injectable8<*, *, *, *, *, *, *, *, *> -> {
            val factory = factory.unsafeCast<(dynamic, dynamic, dynamic, dynamic, dynamic, dynamic, dynamic, dynamic) -> Any?>()

            annotatedFactory(
                tokenNames,
                jsFactory8 { a, b, c, d, e, f, g, h ->
                    factory(
                        tokenA.fromJsDynamic(a),
                        tokenB.fromJsDynamic(b),
                        tokenC.fromJsDynamic(c),
                        tokenD.fromJsDynamic(d),
                        tokenE.fromJsDynamic(e),
                        tokenF.fromJsDynamic(f),
                        tokenG.fromJsDynamic(g),
                        tokenH.fromJsDynamic(h),
                    )
                },
            )
        }
        is InjectableUnsafe<*> -> annotatedFactory(tokenNames, factory)
    }
}

private fun annotatedFactory(
    tokenNames: Array<String>,
    factory: dynamic,
): dynamic {
    val output = js("[]")

    for (index in tokenNames.indices) {
        output[index] = tokenNames[index]
    }

    output[tokenNames.size] = factory
    return output
}

private fun jsFactory0(factory: () -> Any?): dynamic =
    js("(function(factory) { return function() { return factory(); }; })")(factory)

private fun jsFactory1(factory: (dynamic) -> Any?): dynamic =
    js("(function(factory) { return function(a) { return factory(a); }; })")(factory)

private fun jsFactory2(factory: (dynamic, dynamic) -> Any?): dynamic =
    js("(function(factory) { return function(a, b) { return factory(a, b); }; })")(factory)

private fun jsFactory3(factory: (dynamic, dynamic, dynamic) -> Any?): dynamic =
    js("(function(factory) { return function(a, b, c) { return factory(a, b, c); }; })")(factory)

private fun jsFactory4(factory: (dynamic, dynamic, dynamic, dynamic) -> Any?): dynamic =
    js("(function(factory) { return function(a, b, c, d) { return factory(a, b, c, d); }; })")(factory)

private fun jsFactory5(factory: (dynamic, dynamic, dynamic, dynamic, dynamic) -> Any?): dynamic =
    js("(function(factory) { return function(a, b, c, d, e) { return factory(a, b, c, d, e); }; })")(factory)

private fun jsFactory6(factory: (dynamic, dynamic, dynamic, dynamic, dynamic, dynamic) -> Any?): dynamic =
    js("(function(factory) { return function(a, b, c, d, e, f) { return factory(a, b, c, d, e, f); }; })")(factory)

private fun jsFactory7(factory: (dynamic, dynamic, dynamic, dynamic, dynamic, dynamic, dynamic) -> Any?): dynamic =
    js("(function(factory) { return function(a, b, c, d, e, f, g) { return factory(a, b, c, d, e, f, g); }; })")(factory)

private fun jsFactory8(factory: (dynamic, dynamic, dynamic, dynamic, dynamic, dynamic, dynamic, dynamic) -> Any?): dynamic =
    js("(function(factory) { return function(a, b, c, d, e, f, g, h) { return factory(a, b, c, d, e, f, g, h); }; })")(factory)

private fun Token<*>.fromJsDynamic(value: dynamic): dynamic =
    unsafeCast<Token<dynamic>>().fromJs(value)
