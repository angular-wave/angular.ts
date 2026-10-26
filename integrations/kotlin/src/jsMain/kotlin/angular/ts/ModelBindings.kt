package angular.ts

import kotlin.js.Promise

/** A control with distinct model and view value domains. */
public typealias NgModelController<TModel, TView> = angular.ts.generated.NgModelController<TModel, TView>

/** A parser converts a view value into a model value or parse failure. */
public typealias ModelParser<TModel, TView> = (TView) -> TModel?

/** A formatter converts a possibly empty model value into a view value. */
public typealias ModelFormatter<TModel, TView> = (TModel?) -> TView

/** Native cancellation context shared by one asynchronous validation run. */
public typealias ModelValidationContext = angular.ts.generated.ModelValidationContext

/** Validator dictionaries preserve the controller's model and view domains. */
public typealias ModelValidators<TModel, TView> = angular.ts.generated.ModelValidators<TModel, TView>

/** Async validator dictionaries include a native cancellation context. */
public typealias AsyncModelValidators<TModel, TView> = angular.ts.generated.AsyncModelValidators<TModel, TView>

/** Adds a parser, converting a null result into AngularTS's undefined parse failure. */
public fun <TModel, TView> NgModelController<TModel, TView>.addParser(
    parser: ModelParser<TModel, TView>,
) {
    parsers += { value: TView -> parser(value) ?: js("undefined").unsafeCast<TModel?>() }
}

/** Registers a validator with the control's model and view domains. */
public operator fun <TModel, TView> ModelValidators<TModel, TView>.set(
    name: String,
    validator: (TModel?, TView?) -> Boolean,
) {
    asDynamic()[name] = validator
}

/** Reads a validator with the control's model and view domains. */
public operator fun <TModel, TView> ModelValidators<TModel, TView>.get(
    name: String,
): ((TModel?, TView?) -> Boolean)? = asDynamic()[name]

/** Registers an asynchronous validator and its native cancellation context. */
public operator fun <TModel, TView> AsyncModelValidators<TModel, TView>.set(
    name: String,
    validator: (TModel?, TView?, ModelValidationContext) -> Promise<dynamic>,
) {
    asDynamic()[name] = validator
}

/** Reads an asynchronous validator and its cancellation context. */
public operator fun <TModel, TView> AsyncModelValidators<TModel, TView>.get(
    name: String,
): ((TModel?, TView?, ModelValidationContext) -> Promise<dynamic>)? = asDynamic()[name]
