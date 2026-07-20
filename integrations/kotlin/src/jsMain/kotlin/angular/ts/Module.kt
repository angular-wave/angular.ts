package angular.ts

import angular.ts.generated.NgModule as RawNgModule

public typealias FilterFactory = () -> (Any?) -> Any?

public class NgModule internal constructor(
    internal val raw: RawNgModule,
) {
    public val name: String
        get() = raw.name

    public fun <T> value(
        token: Token<T>,
        value: T,
    ): NgModule {
        raw.value(token.name, value)
        return this
    }

    public fun <T> factory(
        token: Token<T>,
        factory: InjectableFactory<T>,
    ): NgModule {
        raw.factory(token.name, factory.toJs())
        return this
    }

    public fun <T> service(
        token: Token<T>,
        service: InjectableFactory<T>,
    ): NgModule {
        raw.service(token.name, service.toJs())
        return this
    }

    public fun <TController> controller(
        name: String,
        controller: InjectableFactory<TController>,
    ): NgModule {
        raw.controller(name, controller.toJs())
        return this
    }

    public fun <TController> component(
        name: String,
        options: Component<TController>,
    ): NgModule {
        raw.component(name, options.toJs())
        return this
    }

    public fun <TController> directive(
        name: String,
        options: Directive<TController>,
    ): NgModule {
        raw.directive(name, Injectable0<dynamic> { options.toJs() }.toJs())
        return this
    }

    public fun <TState : Any> appComponent(
        name: String,
        options: AppComponent<TState>,
    ): NgModule {
        raw.appComponent(name, options.toJs())
        return this
    }

    public fun <TState : Any> webComponent(
        name: String,
        elementClass: ScopeElementConstructor<TState>,
    ): NgModule {
        raw.webComponent(name, elementClass.raw)
        return this
    }

    public fun filter(
        name: String,
        factory: FilterFactory,
    ): NgModule {
        raw.filter(name, factory)
        return this
    }

    public fun router(declaration: StateDeclaration): NgModule {
        raw.router(declaration.toJs())
        return this
    }

    public fun router(declarations: List<StateDeclaration>): NgModule {
        raw.router(declarations.map(StateDeclaration::toJs).toTypedArray())
        return this
    }

    public fun animation(
        name: String,
        preset: AnimationPreset,
    ): NgModule {
        raw.animation(name, preset.toJs())
        return this
    }

    public fun <TConnection> sse(
        token: Token<TConnection>,
        registration: SseRegistration,
    ): NgModule {
        raw.sse(token.name, registration.url, registration.config.toJs())
        return this
    }

    public fun <TConnection> websocket(
        token: Token<TConnection>,
        registration: WebSocketRegistration,
    ): NgModule {
        raw.websocket(
            token.name,
            registration.url,
            registration.config.toJs(),
        )
        return this
    }

    public fun <TConnection> webTransport(
        token: Token<TConnection>,
        registration: WebTransportRegistration,
    ): NgModule {
        raw.webTransport(token.name, registration.url, registration.config.toJs())
        return this
    }

    public fun <TValue> wasm(
        token: Token<TValue>,
        config: WasmLoadOptions,
    ): NgModule {
        raw.wasm(token.name, config.toJs())
        return this
    }

    public fun <TConnection> worker(
        token: Token<TConnection>,
        registration: WorkerRegistration,
    ): NgModule {
        raw.worker(token.name, registration.scriptPath, registration.config.toJs())
        return this
    }
}

public fun ng.module(
    name: String,
    requires: List<String> = emptyList(),
): NgModule =
    NgModule(angularRuntime.module(name, requires.toTypedArray()).unsafeCast<RawNgModule>())
