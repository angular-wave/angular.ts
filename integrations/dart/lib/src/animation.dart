import 'dart:js_interop';

import 'package:web/web.dart';

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
final class NativeAnimationOptions {
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
final class AnimationPreset {
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
}

/// Handle returned by an AngularTS animation operation.
abstract interface class AnimationHandle {
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
