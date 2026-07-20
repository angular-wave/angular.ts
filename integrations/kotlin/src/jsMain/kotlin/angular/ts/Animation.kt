package angular.ts

import angular.ts.generated.AnimateService as RawAnimateService
import angular.ts.generated.AnimationHandle as RawAnimationHandle
import org.w3c.dom.Element

public enum class AnimationPhase(
    public val raw: String,
) {
    Enter("enter"),
    Leave("leave"),
    Move("move"),
    AddClass("addClass"),
    RemoveClass("removeClass"),
    SetClass("setClass"),
    Animate("animate"),
}

public data class AnimationContext public constructor(
    public val signal: Any?,
    public val phase: AnimationPhase,
    public val className: String? = null,
    public val addClass: String? = null,
    public val removeClass: String? = null,
    public val from: Map<String, Any?>? = null,
    public val to: Map<String, Any?>? = null,
) {
    internal companion object {
        internal fun fromJs(raw: dynamic): AnimationContext =
            AnimationContext(
                signal = raw.signal,
                phase = animationPhase(raw.phase),
                className = raw.className.unsafeCast<String?>(),
                addClass = raw.addClass.unsafeCast<String?>(),
                removeClass = raw.removeClass.unsafeCast<String?>(),
                from = null,
                to = null,
            )
    }
}

public typealias AnimationLifecycleCallback = (
    element: Element,
    context: AnimationContext,
) -> Unit

public data class AnimationOptions public constructor(
    public val animation: String? = null,
    public val keyframes: Any? = null,
    public val enter: Any? = null,
    public val leave: Any? = null,
    public val move: Any? = null,
    public val addClass: String? = null,
    public val removeClass: String? = null,
    public val from: Map<String, Any?>? = null,
    public val to: Map<String, Any?>? = null,
    public val tempClasses: Any? = null,
    public val onStart: AnimationLifecycleCallback? = null,
    public val onDone: AnimationLifecycleCallback? = null,
    public val onCancel: AnimationLifecycleCallback? = null,
    public val composite: Any? = null,
    public val delay: Any? = null,
    public val direction: Any? = null,
    public val duration: Any? = null,
    public val easing: Any? = null,
    public val endDelay: Any? = null,
    public val fill: Any? = null,
    public val id: String? = null,
    public val iterationComposite: Any? = null,
    public val iterationStart: Any? = null,
    public val iterations: Any? = null,
    public val playbackRate: Any? = null,
    public val pseudoElement: String? = null,
    public val timeline: Any? = null,
)

public typealias AnimationResult = Any?

public typealias AnimationPresetHandler = (
    element: Element,
    context: AnimationContext,
    options: AnimationOptions,
) -> AnimationResult

public data class AnimationPreset public constructor(
    public val enter: Any? = null,
    public val leave: Any? = null,
    public val move: Any? = null,
    public val addClass: Any? = null,
    public val removeClass: Any? = null,
    public val setClass: Any? = null,
    public val animate: Any? = null,
    public val options: AnimationOptions? = null,
)

public class AnimationHandle internal constructor(
    internal val raw: RawAnimationHandle,
) {
    public val controller: Any?
        get() = raw.controller

    public val finished: Any?
        get() = raw.finished

    public fun then(
        onFulfilled: (() -> Any?)? = null,
        onRejected: ((Any?) -> Any?)? = null,
    ): Any? =
        raw.then({ onFulfilled?.invoke() }, { reason -> onRejected?.invoke(reason) })

    public fun done(callback: (Boolean) -> Unit) {
        raw.done(callback)
    }

    public fun cancel() {
        raw.cancel()
    }

    public fun finish() {
        raw.finish()
    }

    public fun pause() {
        raw.pause()
    }

    public fun play() {
        raw.play()
    }

    public fun complete(status: Boolean = true) {
        raw.complete(status)
    }
}

public class AnimateProvider internal constructor(
    internal val raw: dynamic,
)

public class AnimateService internal constructor(
    internal val raw: RawAnimateService,
) {
    public fun cancel(handle: AnimationHandle? = null) {
        raw.cancel(handle?.raw)
    }

    public fun define(
        name: String,
        preset: AnimationPreset,
    ) {
        raw.define(name, preset.toJs())
    }

    public fun enter(
        element: Element,
        parent: Any? = undefined,
        after: Any? = undefined,
        options: AnimationOptions = AnimationOptions(),
    ): AnimationHandle =
        AnimationHandle(raw.enter(element, parent, after, options.toJs()).unsafeCast<RawAnimationHandle>())

    public fun move(
        element: Element,
        parent: Any?,
        after: Any? = undefined,
        options: AnimationOptions = AnimationOptions(),
    ): AnimationHandle =
        AnimationHandle(raw.move(element, parent, after, options.toJs()).unsafeCast<RawAnimationHandle>())

    public fun leave(
        element: Element,
        options: AnimationOptions = AnimationOptions(),
    ): AnimationHandle =
        AnimationHandle(raw.leave(element, options.toJs()).unsafeCast<RawAnimationHandle>())

    public fun addClass(
        element: Element,
        className: String,
        options: AnimationOptions = AnimationOptions(),
    ): AnimationHandle =
        AnimationHandle(raw.addClass(element, className, options.toJs()).unsafeCast<RawAnimationHandle>())

    public fun removeClass(
        element: Element,
        className: String,
        options: AnimationOptions = AnimationOptions(),
    ): AnimationHandle =
        AnimationHandle(raw.removeClass(element, className, options.toJs()).unsafeCast<RawAnimationHandle>())

    public fun setClass(
        element: Element,
        add: String,
        remove: String,
        options: AnimationOptions = AnimationOptions(),
    ): AnimationHandle =
        AnimationHandle(raw.setClass(element, add, remove, options.toJs()).unsafeCast<RawAnimationHandle>())

    public fun animate(
        element: Element,
        from: Map<String, Any?>,
        to: Map<String, Any?> = emptyMap(),
        className: String = "",
        options: AnimationOptions = AnimationOptions(),
    ): AnimationHandle =
        AnimationHandle(
            raw.animate(element, from.toJsRecord(), to.toJsRecord(), className, options.toJs())
                .unsafeCast<RawAnimationHandle>(),
        )
}

internal fun AnimationOptions.toJs(): dynamic {
    val raw = js("{}")

    if (animation != null) raw.animation = animation
    if (keyframes != null) raw.keyframes = keyframes
    if (enter != null) raw.enter = enter
    if (leave != null) raw.leave = leave
    if (move != null) raw.move = move
    if (addClass != null) raw.addClass = addClass
    if (removeClass != null) raw.removeClass = removeClass
    if (from != null) raw.from = from.toJsRecord()
    if (to != null) raw.to = to.toJsRecord()
    if (tempClasses != null) raw.tempClasses = tempClasses
    if (onStart != null) raw.onStart = lifecycleCallback(onStart)
    if (onDone != null) raw.onDone = lifecycleCallback(onDone)
    if (onCancel != null) raw.onCancel = lifecycleCallback(onCancel)
    if (composite != null) raw.composite = composite
    if (delay != null) raw.delay = delay
    if (direction != null) raw.direction = direction
    if (duration != null) raw.duration = duration
    if (easing != null) raw.easing = easing
    if (endDelay != null) raw.endDelay = endDelay
    if (fill != null) raw.fill = fill
    if (id != null) raw.id = id
    if (iterationComposite != null) raw.iterationComposite = iterationComposite
    if (iterationStart != null) raw.iterationStart = iterationStart
    if (iterations != null) raw.iterations = iterations
    if (playbackRate != null) raw.playbackRate = playbackRate
    if (pseudoElement != null) raw.pseudoElement = pseudoElement
    if (timeline != null) raw.timeline = timeline

    return raw
}

internal fun AnimationPreset.toJs(): dynamic {
    val raw = js("{}")

    if (enter != null) raw.enter = animationPresetValueToJs(enter)
    if (leave != null) raw.leave = animationPresetValueToJs(leave)
    if (move != null) raw.move = animationPresetValueToJs(move)
    if (addClass != null) raw.addClass = animationPresetValueToJs(addClass)
    if (removeClass != null) raw.removeClass = animationPresetValueToJs(removeClass)
    if (setClass != null) raw.setClass = animationPresetValueToJs(setClass)
    if (animate != null) raw.animate = animationPresetValueToJs(animate)
    if (options != null) raw.options = options.toJs()

    return raw
}

private fun animationPresetValueToJs(value: Any?): dynamic =
    value

private fun lifecycleCallback(callback: AnimationLifecycleCallback): Function<*> =
    { element: Element, context: dynamic ->
        callback(element, AnimationContext.fromJs(context))
    }

private fun animationPhase(value: Any?): AnimationPhase {
    val raw = value.unsafeCast<String?>()

    return AnimationPhase.values().firstOrNull { phase -> phase.raw == raw } ?: AnimationPhase.Animate
}

@Suppress("UNUSED_VARIABLE")
private val undefined: dynamic =
    js("undefined")
