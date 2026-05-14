import 'dart:js_interop';

import 'unsafe.dart' as unsafe;

/// Synchronous validator registered on an `NgModelController`.
typedef ModelValidator<TModel, TView> = bool Function(
  TModel modelValue,
  TView viewValue,
);

/// Asynchronous validator registered on an `NgModelController`.
typedef AsyncModelValidator<TModel, TView> = Future<Object?> Function(
  TModel modelValue,
  TView viewValue,
);

/// Parser that converts a view value into a model value.
typedef ModelParser<TIn, TOut> = TOut Function(TIn value);

/// Formatter that converts a model value into a view value.
typedef ModelFormatter<TIn, TOut> = TOut Function(TIn value);

/// Listener called after a view change updates the model.
typedef ModelViewChangeListener = void Function();

/// Configuration for AngularTS `ng-model-options`.
final class NgModelOptions {
  /// Creates a ng model options.
  const NgModelOptions({
    this.updateOn,
    this.debounce,
    this.allowInvalid,
    this.getterSetter,
    this.timezone,
    this.timeSecondsFormat,
    this.timeStripZeroSeconds,
  });

  /// The update on.
  final String? updateOn;

  /// The debounce.
  final Object? debounce;

  /// The allow invalid.
  final bool? allowInvalid;

  /// The getter setter.
  final bool? getterSetter;

  /// The timezone.
  final String? timezone;

  /// The time seconds format.
  final String? timeSecondsFormat;

  /// The time strip zero seconds.
  final bool? timeStripZeroSeconds;

  /// The to map.
  Map<String, Object?> toMap() => {
        if (updateOn != null) 'updateOn': updateOn,
        if (debounce != null) 'debounce': debounce,
        if (allowInvalid != null) 'allowInvalid': allowInvalid,
        if (getterSetter != null) 'getterSetter': getterSetter,
        if (timezone != null) 'timezone': timezone,
        if (timeSecondsFormat != null) 'timeSecondsFormat': timeSecondsFormat,
        if (timeStripZeroSeconds != null)
          'timeStripZeroSeconds': timeStripZeroSeconds,
      };
}

/// Runtime facade for AngularTS `NgModelController`.
final class NgModelController {
  /// Creates a ng model controller.
  const NgModelController(this.raw);

  /// The raw.
  final JSObject raw;

  /// Current value from the control's view.
  Object? get viewValue => unsafe.getProperty(raw, r'$viewValue');

  /// Current value stored in the bound model.
  Object? get modelValue => unsafe.getProperty(raw, r'$modelValue');

  /// Whether the control has not lost focus yet.
  bool? get untouched {
    final value = unsafe.getProperty(raw, r'$untouched');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Whether the control has lost focus.
  bool? get touched {
    final value = unsafe.getProperty(raw, r'$touched');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Whether the user has not interacted with the control yet.
  bool? get pristine {
    final value = unsafe.getProperty(raw, r'$pristine');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Whether the user has interacted with the control.
  bool? get dirty {
    final value = unsafe.getProperty(raw, r'$dirty');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Whether the control currently has no validation errors.
  bool? get valid {
    final value = unsafe.getProperty(raw, r'$valid');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Whether the control currently has at least one validation error.
  bool? get invalid {
    final value = unsafe.getProperty(raw, r'$invalid');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Updates the validation state for a named validation key.
  void setValidity(String validationErrorKey, bool? state) {
    unsafe.callMethod(
      raw,
      r'$setValidity',
      validationErrorKey.toJS,
      state?.toJS,
    );
  }

  /// Renders the current model value into the view.
  void render() {
    unsafe.callMethod(raw, r'$render');
  }

  /// Returns whether a value should be considered empty by the model.
  bool isEmpty(Object? candidate) {
    final value = unsafe.callMethod(
      raw,
      r'$isEmpty',
      unsafe.dartToJs(candidate),
    );

    return (value as JSBoolean).toDart;
  }

  /// Sets the control to pristine state.
  void setPristine() {
    unsafe.callMethod(raw, r'$setPristine');
  }

  /// Sets the control to dirty state.
  void setDirty() {
    unsafe.callMethod(raw, r'$setDirty');
  }

  /// Sets the control to untouched state.
  void setUntouched() {
    unsafe.callMethod(raw, r'$setUntouched');
  }

  /// Sets the control to touched state.
  void setTouched() {
    unsafe.callMethod(raw, r'$setTouched');
  }

  /// Cancels a pending view update and restores the last committed value.
  void rollbackViewValue() {
    unsafe.callMethod(raw, r'$rollbackViewValue');
  }

  /// Runs model validation.
  void validate() {
    unsafe.callMethod(raw, r'$validate');
  }

  /// Commits the current view value into the model.
  void commitViewValue() {
    unsafe.callMethod(raw, r'$commitViewValue');
  }

  /// Sets a new view value, optionally with the triggering event name.
  void setViewValue(Object? value, [String? trigger]) {
    unsafe.callMethod(
      raw,
      r'$setViewValue',
      unsafe.dartToJs(value),
      trigger?.toJS,
    );
  }
}
