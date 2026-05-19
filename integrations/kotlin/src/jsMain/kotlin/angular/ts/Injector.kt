package angular.ts

import angular.ts.generated.InjectorService

public class Injector internal constructor(
    internal val raw: InjectorService,
) {
    public fun <T> get(token: Token<T>): T =
        token.fromJs(raw.get(token.name))

    public fun has(token: Token<*>): Boolean =
        raw.has(token.name)
}
