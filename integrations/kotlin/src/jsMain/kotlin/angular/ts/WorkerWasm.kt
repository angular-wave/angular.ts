package angular.ts

import angular.ts.generated.Scope as RawScope
import angular.ts.generated.WorkerHandle as RawWorkerHandle
import angular.ts.generated.WasmBinding as RawWasmBinding
import angular.ts.generated.WasmError as RawWasmError
import angular.ts.generated.WasmResource as RawWasmResource
import angular.ts.generated.WasmService as RawWasmService
import kotlin.js.Promise

public data class WorkerConfig public constructor(
    public val type: String? = null,
    public val name: String? = null,
    public val credentials: String? = null,
    public val restart: Boolean? = null,
    public val restartDelay: Double? = null,
    public val maxRestarts: Int? = null,
    public val decode: ((Any?) -> Any?)? = null,
)

public class WorkerHandle internal constructor(
    internal val raw: RawWorkerHandle<Any?, Any?>,
) {
    public val status: String
        get() = raw.status.unsafeCast<String>()

    public val error: Any?
        get() = raw.error

    public val restartCount: Int
        get() = raw.restartCount.toInt()

    public fun post(data: Any?, transfer: Array<Any?> = emptyArray()) {
        raw.post(data, transfer)
    }

    public fun request(
        data: Any?,
        timeout: Double? = null,
    ): Promise<Any?> {
        val options = js("({})")

        if (timeout != null) options.timeout = timeout
        return raw.asDynamic().request(data, options).unsafeCast<Promise<Any?>>()
    }

    public fun model(channel: String = "default"): dynamic = raw.asDynamic().model(channel)

    public fun onMessage(listener: (Any?, Any?) -> Unit): () -> Unit =
        raw.asDynamic().onMessage(listener).unsafeCast<() -> Unit>()

    public fun onError(listener: (Any?) -> Unit): () -> Unit =
        raw.asDynamic().onError(listener).unsafeCast<() -> Unit>()

    public fun terminate() {
        raw.terminate()
    }

    public fun restart() {
        raw.restart()
    }
}

public class WorkerService internal constructor(
    internal val raw: dynamic,
) {
    public operator fun invoke(
        scriptPath: String,
        config: WorkerConfig = WorkerConfig(),
    ): WorkerHandle =
        WorkerHandle(
            callJsFunction(raw, null, arrayOf(scriptPath, config.toJs()))
                .unsafeCast<RawWorkerHandle<Any?, Any?>>(),
        )
}

public data class WorkerRegistration public constructor(
    public val scriptPath: String,
    public val config: WorkerConfig = WorkerConfig(),
)

public data class WasmLoadOptions public constructor(
    public val source: String,
    public val imports: Map<String, Any?> = emptyMap(),
    public val compile: WasmCompileOptions? = null,
    public val diagnostics: Boolean = false,
)

public data class WasmCompileOptions public constructor(
    public val builtins: List<String> = emptyList(),
    public val importedStringConstants: String? = null,
)

public data class WasmBindingOptions public constructor(
    public val name: String? = null,
    public val watch: List<String> = emptyList(),
    public val initial: Boolean? = null,
)

public enum class WasmErrorCode(
    public val raw: String,
) {
    Load("load"),
    Binding("binding"),
    Disposed("disposed"),
    UnsupportedAbi("unsupported-abi"),
}

public enum class WasmResourceStatus(
    public val raw: String,
) {
    Loading("loading"),
    Ready("ready"),
    Error("error"),
    Disposed("disposed"),
}

public class WasmError internal constructor(
    internal val raw: RawWasmError,
) {
    public val code: WasmErrorCode
        get() = wasmErrorCode(raw.code)

    public val message: String
        get() = raw.asDynamic().message.unsafeCast<String>()

    public val source: Any?
        get() = raw.source
}

public class WasmBinding<TState : Any> internal constructor(
    internal val raw: RawWasmBinding<Any?>,
) {
    public val name: String
        get() = raw.name.unsafeCast<String>()

    public val target: Scope<TState>
        get() = Scope<TState>(raw.target.unsafeCast<RawScope>())

    public val disposed: Boolean
        get() = raw.disposed.unsafeCast<Boolean>()

    public fun dispose() {
        raw.dispose()
    }
}

public class WasmResource internal constructor(
    internal val raw: RawWasmResource<Any?>,
) {
    public val source: Any?
        get() = raw.source

    public val status: WasmResourceStatus
        get() = wasmResourceStatus(raw.status)

    public val ready: Promise<WasmResource>
        get() = raw.ready.unsafeCast<Promise<Any?>>().then { this }

    public val error: WasmError?
        get() {
            val value: dynamic = raw.error

            return if (value == null) null else WasmError(value.unsafeCast<RawWasmError>())
        }

    public val instance: Any?
        get() = raw.instance

    public val module: Any?
        get() = raw.module

    public val exports: dynamic
        get() = raw.exports

    public val disposed: Boolean
        get() = raw.disposed.unsafeCast<Boolean>()

    public fun <TState : Any> bind(
        target: Scope<TState>,
        options: WasmBindingOptions = WasmBindingOptions(),
    ): Promise<WasmBinding<TState>> {
        val promise = raw.bind(target.unsafe, options.toJs()).unsafeCast<Promise<Any?>>()

        return promise.then { WasmBinding<TState>(it.unsafeCast<RawWasmBinding<Any?>>()) }
    }

    public fun dispose() {
        raw.dispose()
    }
}

public class WasmService internal constructor(
    internal val raw: RawWasmService,
) {
    public fun load(options: WasmLoadOptions): WasmResource =
        WasmResource(raw.load(options.toJs()).unsafeCast<RawWasmResource<Any?>>())
}

internal fun WorkerConfig.toJs(): dynamic {
    val raw = js("{}")

    if (type != null) raw.type = type
    if (name != null) raw.name = name
    if (credentials != null) raw.credentials = credentials
    if (restart != null) raw.restart = restart
    if (restartDelay != null) raw.restartDelay = restartDelay
    if (maxRestarts != null) raw.maxRestarts = maxRestarts
    if (decode != null) raw.decode = decode
    return raw
}

private fun wasmErrorCode(value: Any?): WasmErrorCode {
    val raw = value.unsafeCast<String>()

    return WasmErrorCode.values().first { code -> code.raw == raw }
}

private fun wasmResourceStatus(value: Any?): WasmResourceStatus {
    val raw = value.unsafeCast<String>()

    return WasmResourceStatus.values().first { status -> status.raw == raw }
}

internal fun WasmLoadOptions.toJs(): dynamic {
    val raw = js("{}")

    raw.source = source
    if (imports.isNotEmpty()) raw.imports = imports.toJsRecord()
    if (compile != null) {
        raw.compile = js("({})")
        if (compile.builtins.isNotEmpty()) raw.compile.builtins = compile.builtins.toTypedArray()
        if (compile.importedStringConstants != null) {
            raw.compile.importedStringConstants = compile.importedStringConstants
        }
    }
    if (diagnostics) raw.diagnostics = true

    return raw
}

private fun WasmBindingOptions.toJs(): dynamic {
    val raw = js("{}")

    if (name != null) raw.name = name
    if (watch.isNotEmpty()) raw.watch = watch.toTypedArray()
    if (initial != null) raw.initial = initial

    return raw
}
