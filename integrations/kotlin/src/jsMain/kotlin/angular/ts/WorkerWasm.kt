package angular.ts

import angular.ts.generated.WasmScope as RawWasmScope
import angular.ts.generated.WasmScopeAbi as RawWasmScopeAbi
import angular.ts.generated.WasmService as RawWasmService
import angular.ts.generated.WorkerConnection as RawWorkerConnection

public data class WorkerConfig public constructor(
    public val onMessage: ((Any?, Any?) -> Unit)? = null,
    public val onError: ((Any?) -> Unit)? = null,
    public val autoRestart: Boolean? = null,
    public val autoTerminate: Boolean? = null,
    public val transformMessage: ((Any?) -> Any?)? = null,
    public val logger: LogService? = null,
    public val err: ExceptionHandlerService? = null,
)

public class WorkerConnection internal constructor(
    internal val raw: RawWorkerConnection,
) {
    public val config: Any?
        get() = raw.config

    public fun post(data: Any?) {
        raw.post(data)
    }

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
    ): WorkerConnection =
        WorkerConnection(callJsFunction(raw, null, arrayOf(scriptPath, config.toJs())).unsafeCast<RawWorkerConnection>())
}

public class WorkerProvider internal constructor(
    internal val raw: dynamic,
)

public data class WorkerRegistration public constructor(
    public val scriptPath: String,
    public val config: WorkerConfig = WorkerConfig(),
)

public data class WasmOptions public constructor(
    public val raw: Boolean = false,
    public val extra: Map<String, Any?> = emptyMap(),
)

public data class WasmRegistration public constructor(
    public val source: String,
    public val imports: Map<String, Any?> = emptyMap(),
    public val options: WasmOptions = WasmOptions(),
)

public typealias WasmAbiExports = Any

public data class WasmInstantiationResult public constructor(
    public val instance: Any?,
    public val exports: Any?,
    public val module: Any?,
)

public data class WasmScopeOptions public constructor(
    public val name: String? = null,
)

public typealias WasmScopeReference = Any

public data class WasmScopeUpdate public constructor(
    public val scopeHandle: Int,
    public val scopeName: String,
    public val path: String,
    public val value: Any?,
) {
    internal companion object {
        internal fun fromJs(raw: dynamic): WasmScopeUpdate =
            WasmScopeUpdate(
                scopeHandle = raw.scopeHandle.unsafeCast<Int>(),
                scopeName = raw.scopeName.unsafeCast<String>(),
                path = raw.path.unsafeCast<String>(),
                value = raw.value,
            )
    }
}

public data class WasmScopeBindingOptions public constructor(
    public val name: String? = null,
    public val watch: List<String> = emptyList(),
    public val initial: Boolean? = null,
)

public data class WasmScopeWatchOptions public constructor(
    public val initial: Boolean? = null,
)

public class WasmScopeAbiImportObject internal constructor(
    internal val raw: dynamic,
) {
    public val angularTs: Any?
        get() = raw.angular_ts
}

public class WasmScopeAbiImports internal constructor(
    internal val raw: dynamic,
) {
    public fun scopeResolve(
        namePtr: Int,
        nameLen: Int,
    ): Int =
        raw.scope_resolve(namePtr, nameLen).unsafeCast<Int>()

    public fun bufferFree(bufferHandle: Int) {
        raw.buffer_free(bufferHandle)
    }
}

public class WasmScope internal constructor(
    internal val raw: RawWasmScope,
) {
    public val abi: Any?
        get() = raw.abi

    public val handle: Int
        get() = raw.handle.unsafeCast<Int>()

    public val name: String
        get() = raw.name

    public val scope: Any?
        get() = raw.scope

    public fun isDisposed(): Boolean =
        raw.isDisposed()

    public fun get(path: String): Any? =
        raw.get(path)

    public fun set(
        path: String,
        value: Any?,
    ): Boolean =
        raw.set(path, value)

    public fun delete(path: String): Boolean =
        raw.delete(path)

    public fun sync() {
        raw.sync()
    }

    public fun onSync(callback: () -> Unit): () -> Unit {
        val disposer = raw.onSync(callback)

        return { callJsFunction(disposer, null, emptyArray()) }
    }

    public fun watch(
        path: String,
        options: WasmScopeWatchOptions = WasmScopeWatchOptions(),
        callback: (WasmScopeUpdate) -> Unit,
    ): () -> Unit {
        val disposer = raw.watch(
            path,
            { update: dynamic -> callback(WasmScopeUpdate.fromJs(update)) },
            options.toJs(),
        )

        return { callJsFunction(disposer, null, emptyArray()) }
    }

    public fun bindExports(
        exports: WasmAbiExports,
        options: WasmScopeBindingOptions = WasmScopeBindingOptions(),
    ): () -> Unit {
        val disposer = raw.bindExports(exports, options.toJs())

        return { callJsFunction(disposer, null, emptyArray()) }
    }

    public fun dispose() {
        raw.dispose()
    }
}

public class WasmScopeAbi internal constructor(
    internal val raw: RawWasmScopeAbi,
) {
    public val imports: WasmScopeAbiImportObject
        get() = WasmScopeAbiImportObject(raw.imports)

    public fun attach(exports: WasmAbiExports) {
        raw.attach(exports)
    }

    public fun createScope(
        scope: Scope<*>,
        options: WasmScopeOptions = WasmScopeOptions(),
    ): WasmScope =
        WasmScope(raw.createScope(scope.unsafe, options.toJs()).unsafeCast<RawWasmScope>())

    public fun getScope(reference: WasmScopeReference): WasmScope? {
        val scope = raw.getScope(reference)

        return if (js("scope == null").unsafeCast<Boolean>()) {
            null
        } else {
            WasmScope(scope.unsafeCast<RawWasmScope>())
        }
    }

    public fun unregisterScope(handle: Int): Boolean =
        raw.unregisterScope(handle.toDouble())

    public fun notifyBind(scope: WasmScope) {
        raw.notifyBind(scope.raw)
    }

    public fun notifyUpdate(update: WasmScopeUpdate) {
        raw.notifyUpdate(update.toJs())
    }

    public fun notifyUnbind(scope: WasmScope) {
        raw.notifyUnbind(scope.raw)
    }

    public fun freeBuffer(bufferHandle: Int) {
        raw.freeBuffer(bufferHandle.toDouble())
    }
}

public class WasmService internal constructor(
    internal val raw: RawWasmService,
) {
    public operator fun invoke(
        source: String,
        imports: Map<String, Any?> = emptyMap(),
        options: WasmOptions = WasmOptions(),
    ): Any? =
        callJsFunction(raw, null, arrayOf(source, imports.toJsRecord(), options.toJs()))

    public fun scope(
        scope: Scope<*>,
        options: WasmScopeOptions = WasmScopeOptions(),
    ): WasmScope =
        WasmScope(raw.scope(scope.unsafe, options.toJs()).unsafeCast<RawWasmScope>())

    public fun createScopeAbi(exports: WasmAbiExports? = null): WasmScopeAbi =
        WasmScopeAbi(raw.createScopeAbi(exports ?: undefined).unsafeCast<RawWasmScopeAbi>())
}

public class WasmProvider internal constructor(
    internal val raw: dynamic,
)

internal fun WorkerConfig.toJs(): dynamic {
    val raw = js("{}")

    if (onMessage != null) raw.onMessage = onMessage
    if (onError != null) raw.onError = onError
    if (autoRestart != null) raw.autoRestart = autoRestart
    if (autoTerminate != null) raw.autoTerminate = autoTerminate
    if (transformMessage != null) raw.transformMessage = transformMessage
    if (logger != null) raw.logger = logger.raw
    if (err != null) raw.err = err.raw

    return raw
}

internal fun WasmOptions.toJs(): dynamic {
    val options = extra.toJsRecord()

    if (raw) {
        options.raw = true
    }

    return options
}

private fun WasmScopeOptions.toJs(): dynamic {
    val raw = js("{}")

    if (name != null) raw.name = name

    return raw
}

private fun WasmScopeBindingOptions.toJs(): dynamic {
    val raw = js("{}")

    if (name != null) raw.name = name
    if (watch.isNotEmpty()) raw.watch = watch.toTypedArray()
    if (initial != null) raw.initial = initial

    return raw
}

private fun WasmScopeWatchOptions.toJs(): dynamic {
    val raw = js("{}")

    if (initial != null) raw.initial = initial

    return raw
}

private fun WasmScopeUpdate.toJs(): dynamic {
    val raw = js("{}")

    raw.scopeHandle = scopeHandle
    raw.scopeName = scopeName
    raw.path = path
    raw.value = value

    return raw
}

@Suppress("UNUSED_VARIABLE")
private val undefined: dynamic =
    js("undefined")
