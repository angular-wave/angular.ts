import 'dart:js_interop';

import 'package:web/web.dart';

import 'unsafe.dart' as unsafe;

/// Supported animation phase values.
enum AnimationPhase {
  /// Invokes enter.
  enter('enter'),

  /// Invokes leave.
  leave('leave'),

  /// Invokes move.
  move('move'),

  /// Invokes add class.
  addClass('addClass'),

  /// Invokes remove class.
  removeClass('removeClass'),

  /// Invokes set class.
  setClass('setClass'),

  /// Invokes animate.
  animate('animate');

  const AnimationPhase(this.value);

  /// Registers an AngularTS value.
  final String value;
}

/// Represents animation context.
final class AnimationContext {
  /// Creates a animation context.
  const AnimationContext({
    required this.signal,
    required this.phase,
    this.className,
    this.addClass,
    this.removeClass,
    this.from,
    this.to,
  });

  /// The signal.
  final AbortSignal signal;

  /// The phase.
  final AnimationPhase phase;

  /// The class name.
  final String? className;

  /// The add class.
  final String? addClass;

  /// The remove class.
  final String? removeClass;

  /// The from.
  final Map<String, Object?>? from;

  /// The to.
  final Map<String, Object?>? to;
}

/// Signature for animation lifecycle callback.
typedef AnimationLifecycleCallback = void Function(
  Element element,
  AnimationContext context,
);

/// Represents native animation options.
final class NativeAnimationOptions implements unsafe.JsConvertible {
  /// Creates a native animation options.
  const NativeAnimationOptions({
    this.animation,
    this.keyframes,
    this.enter,
    this.leave,
    this.move,
    this.addClass,
    this.removeClass,
    this.from,
    this.to,
    this.tempClasses,
    this.onStart,
    this.onDone,
    this.onCancel,
    this.composite,
    this.delay,
    this.direction,
    this.duration,
    this.easing,
    this.endDelay,
    this.fill,
    this.id,
    this.iterationComposite,
    this.iterationStart,
    this.iterations,
    this.playbackRate,
    this.pseudoElement,
    this.timeline,
  });

  /// The animation.
  final String? animation;

  /// The keyframes.
  final JSAny? keyframes;

  /// The enter.
  final JSAny? enter;

  /// The leave.
  final JSAny? leave;

  /// The move.
  final JSAny? move;

  /// The add class.
  final String? addClass;

  /// The remove class.
  final String? removeClass;

  /// The from.
  final Map<String, Object?>? from;

  /// The to.
  final Map<String, Object?>? to;

  /// The temp classes.
  final Object? tempClasses;

  /// The on start.
  final AnimationLifecycleCallback? onStart;

  /// The on done.
  final AnimationLifecycleCallback? onDone;

  /// The on cancel.
  final AnimationLifecycleCallback? onCancel;

  /// The composite operation.
  final Object? composite;

  /// The start delay.
  final Object? delay;

  /// The playback direction.
  final Object? direction;

  /// The animation duration.
  final Object? duration;

  /// The easing function.
  final Object? easing;

  /// The end delay.
  final Object? endDelay;

  /// The fill mode.
  final Object? fill;

  /// The animation id.
  final String? id;

  /// The iteration composite operation.
  final Object? iterationComposite;

  /// The iteration start offset.
  final Object? iterationStart;

  /// The iteration count.
  final Object? iterations;

  /// The playback rate.
  final Object? playbackRate;

  /// The pseudo-element selector.
  final String? pseudoElement;

  /// The animation timeline.
  final Object? timeline;

  /// The to map.
  Map<String, Object?> toMap() => {
        if (animation != null) 'animation': animation,
        if (keyframes != null) 'keyframes': keyframes,
        if (enter != null) 'enter': enter,
        if (leave != null) 'leave': leave,
        if (move != null) 'move': move,
        if (addClass != null) 'addClass': addClass,
        if (removeClass != null) 'removeClass': removeClass,
        if (from != null) 'from': from,
        if (to != null) 'to': to,
        if (tempClasses != null) 'tempClasses': tempClasses,
        if (composite != null) 'composite': composite,
        if (delay != null) 'delay': delay,
        if (direction != null) 'direction': direction,
        if (duration != null) 'duration': duration,
        if (easing != null) 'easing': easing,
        if (endDelay != null) 'endDelay': endDelay,
        if (fill != null) 'fill': fill,
        if (id != null) 'id': id,
        if (iterationComposite != null)
          'iterationComposite': iterationComposite,
        if (iterationStart != null) 'iterationStart': iterationStart,
        if (iterations != null) 'iterations': iterations,
        if (playbackRate != null) 'playbackRate': playbackRate,
        if (pseudoElement != null) 'pseudoElement': pseudoElement,
        if (timeline != null) 'timeline': timeline,
      };

  @override
  JSAny? toJsValue() => unsafe.object(toMap());
}

/// Signature for animation options.
typedef AnimationOptions = NativeAnimationOptions;

/// Signature for animation result.
typedef AnimationResult = Object?;

/// Signature for animation preset handler.
typedef AnimationPresetHandler = AnimationResult Function(
  Element element,
  AnimationContext context,
  NativeAnimationOptions options,
);

/// Represents animation preset.
final class AnimationPreset implements unsafe.JsConvertible {
  /// Creates a animation preset.
  const AnimationPreset({
    this.enter,
    this.leave,
    this.move,
    this.addClass,
    this.removeClass,
    this.setClass,
    this.animate,
    this.options,
  });

  /// The enter.
  final Object? enter;

  /// The leave.
  final Object? leave;

  /// The move.
  final Object? move;

  /// The add class.
  final Object? addClass;

  /// The remove class.
  final Object? removeClass;

  /// The set class.
  final Object? setClass;

  /// The animate.
  final Object? animate;

  /// The options.
  final NativeAnimationOptions? options;

  /// The to map.
  Map<String, Object?> toMap() => {
        if (enter != null) 'enter': enter,
        if (leave != null) 'leave': leave,
        if (move != null) 'move': move,
        if (addClass != null) 'addClass': addClass,
        if (removeClass != null) 'removeClass': removeClass,
        if (setClass != null) 'setClass': setClass,
        if (animate != null) 'animate': animate,
        if (options != null) 'options': options,
      };

  @override
  JSAny? toJsValue() => unsafe.object(toMap());
}

/// Handle returned by an AngularTS animation operation.
abstract interface class AnimationHandle {
  /// Abort controller backing this animation.
  AbortController get controller;

  /// Promise that resolves when the animation finishes.
  JSPromise<JSAny?> get finished;

  /// Promise-like continuation hook.
  Object? then([Object? onfulfilled, Object? onrejected]);

  /// The done.
  void done(void Function(bool ok) callback);

  /// The cancel.
  void cancel();

  /// The finish.
  void finish();

  /// The pause.
  void pause();

  /// The play.
  void play();

  /// The complete.
  void complete([bool status]);
}
