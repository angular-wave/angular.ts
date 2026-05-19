package angular.ts.unsafe

import angular.ts.InjectableUnsafe
import angular.ts.Token

public fun <T> injectUnsafe(
    tokens: List<Token<*>>,
    factory: dynamic,
): InjectableUnsafe<T> =
    InjectableUnsafe(tokens, factory)
