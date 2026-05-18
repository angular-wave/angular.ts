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
  Object? get $viewValue => viewValue;

  /// Current value from the control's view.
  Object? get viewValue => unsafe.getProperty(raw, r'$viewValue');

  /// Current value stored in the bound model.
  Object? get $modelValue => modelValue;

  /// Current value stored in the bound model.
  Object? get modelValue => unsafe.getProperty(raw, r'$modelValue');

  /// Synchronous validators keyed by validation name.
  Object? get $validators => unsafe.getProperty(raw, r'$validators');

  /// Asynchronous validators keyed by validation name.
  Object? get $asyncValidators => unsafe.getProperty(raw, r'$asyncValidators');

  /// View-to-model parser pipeline.
  Object? get $parsers => unsafe.getProperty(raw, r'$parsers');

  /// Model-to-view formatter pipeline.
  Object? get $formatters => unsafe.getProperty(raw, r'$formatters');

  /// Listeners called after view changes.
  Object? get $viewChangeListeners =>
      unsafe.getProperty(raw, r'$viewChangeListeners');

  /// Whether the control has not lost focus yet.
  bool? get $untouched => untouched;

  /// Whether the control has not lost focus yet.
  bool? get untouched {
    final value = unsafe.getProperty(raw, r'$untouched');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Whether the control has lost focus.
  bool? get $touched => touched;

  /// Whether the control has lost focus.
  bool? get touched {
    final value = unsafe.getProperty(raw, r'$touched');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Whether the user has not interacted with the control yet.
  bool? get $pristine => pristine;

  /// Whether the user has not interacted with the control yet.
  bool? get pristine {
    final value = unsafe.getProperty(raw, r'$pristine');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Whether the user has interacted with the control.
  bool? get $dirty => dirty;

  /// Whether the user has interacted with the control.
  bool? get dirty {
    final value = unsafe.getProperty(raw, r'$dirty');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Whether the control currently has no validation errors.
  bool? get $valid => valid;

  /// Whether the control currently has no validation errors.
  bool? get valid {
    final value = unsafe.getProperty(raw, r'$valid');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Whether the control currently has at least one validation error.
  bool? get $invalid => invalid;

  /// Whether the control currently has at least one validation error.
  bool? get invalid {
    final value = unsafe.getProperty(raw, r'$invalid');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Native validity state for the target control.
  Object? get $validity => unsafe.getProperty(raw, r'$validity');

  /// Native validation message for the target control.
  String? get $validationMessage {
    final value = unsafe.getProperty(raw, r'$validationMessage');
    return value == null ? null : (value as JSString).toDart;
  }

  /// Current validation error flags.
  Object? get $error => unsafe.getProperty(raw, r'$error');

  /// Pending asynchronous validation flags.
  Object? get $pending => unsafe.getProperty(raw, r'$pending');

  /// Control name.
  Object? get $name => unsafe.getProperty(raw, r'$name');

  /// Native form control target.
  Object? get $target => unsafe.getProperty(raw, r'$target');

  /// Resolved model options.
  Object? get $options => unsafe.getProperty(raw, r'$options');

  /// Updates the validation state for a named validation key.
  void $setValidity(String validationErrorKey, Object? state) {
    unsafe.callMethod(
      raw,
      r'$setValidity',
      validationErrorKey.toJS,
      unsafe.dartToJs(state),
    );
  }

  /// Updates the validation state for a named validation key.
  void setValidity(String validationErrorKey, bool? state) {
    $setValidity(validationErrorKey, state);
  }

  /// Updates the native validity state.
  void $setNativeValidity(bool? state) {
    unsafe.callMethod(raw, r'$setNativeValidity', state?.toJS);
  }

  /// Sets the native custom validity message.
  void $setCustomValidity(String message) {
    unsafe.callMethod(raw, r'$setCustomValidity', message.toJS);
  }

  /// Renders the current model value into the view.
  void $render() {
    unsafe.callMethod(raw, r'$render');
  }

  /// Renders the current model value into the view.
  void render() {
    $render();
  }

  /// Returns whether a value should be considered empty by the model.
  bool $isEmpty(Object? value) {
    final result = unsafe.callMethod(
      raw,
      r'$isEmpty',
      unsafe.dartToJs(value),
    );

    return (result as JSBoolean).toDart;
  }

  /// Returns whether a value should be considered empty by the model.
  bool isEmpty(Object? candidate) {
    return $isEmpty(candidate);
  }

  /// Sets the control to pristine state.
  void $setPristine() {
    unsafe.callMethod(raw, r'$setPristine');
  }

  /// Sets the control to pristine state.
  void setPristine() {
    $setPristine();
  }

  /// Sets the control to dirty state.
  void $setDirty() {
    unsafe.callMethod(raw, r'$setDirty');
  }

  /// Sets the control to dirty state.
  void setDirty() {
    $setDirty();
  }

  /// Sets the control to untouched state.
  void $setUntouched() {
    unsafe.callMethod(raw, r'$setUntouched');
  }

  /// Sets the control to untouched state.
  void setUntouched() {
    $setUntouched();
  }

  /// Sets the control to touched state.
  void $setTouched() {
    unsafe.callMethod(raw, r'$setTouched');
  }

  /// Sets the control to touched state.
  void setTouched() {
    $setTouched();
  }

  /// Cancels a pending view update and restores the last committed value.
  void $rollbackViewValue() {
    unsafe.callMethod(raw, r'$rollbackViewValue');
  }

  /// Cancels a pending view update and restores the last committed value.
  void rollbackViewValue() {
    $rollbackViewValue();
  }

  /// Runs model validation.
  void $validate() {
    unsafe.callMethod(raw, r'$validate');
  }

  /// Runs model validation.
  void validate() {
    $validate();
  }

  /// Commits the current view value into the model.
  void $commitViewValue() {
    unsafe.callMethod(raw, r'$commitViewValue');
  }

  /// Commits the current view value into the model.
  void commitViewValue() {
    $commitViewValue();
  }

  /// Sets a new view value, optionally with the triggering event name.
  void $setViewValue(Object? value, [String? trigger]) {
    unsafe.callMethod(
      raw,
      r'$setViewValue',
      unsafe.dartToJs(value),
      trigger?.toJS,
    );
  }

  /// Sets a new view value, optionally with the triggering event name.
  void setViewValue(Object? value, [String? trigger]) {
    $setViewValue(value, trigger);
  }

  /// Overrides resolved model options.
  void $overrideModelOptions(Object? options) {
    unsafe.callMethod(
      raw,
      r'$overrideModelOptions',
      unsafe.dartToJs(options),
    );
  }

  /// Runs the model-to-view pipeline on the current model value.
  void $processModelValue() {
    unsafe.callMethod(raw, r'$processModelValue');
  }

  /// Runs the model-to-view pipeline on the current model value.
  void processModelValue() {
    $processModelValue();
  }
}
