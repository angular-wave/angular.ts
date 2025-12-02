declare namespace legacy {
  interface IModule {
    /**
     * Use this method to register a component.
     *
     * @param name The name of the component.
     * @param options A definition object passed into the component.
     */
    component(name: string, options: IComponentOptions): IModule;
    /**
     * Use this method to register a component.
     *
     * @param object Object map of components where the keys are the names and the values are the component definition objects
     */
    component(object: { [componentName: string]: IComponentOptions }): IModule;
    /**
     * Use this method to register work which needs to be performed on module loading.
     *
     * @param configFn Execute this function on module load. Useful for service configuration.
     */
    config(configFn: Function): IModule;
    /**
     * Use this method to register work which needs to be performed on module loading.
     *
     * @param inlineAnnotatedFunction Execute this function on module load. Useful for service configuration.
     */
    config(inlineAnnotatedFunction: any[]): IModule;
    config(object: Object): IModule;
    /**
     * Register a constant service, such as a string, a number, an array, an object or a function, with the $injector. Unlike value it can be injected into a module configuration function (see config) and it cannot be overridden by an Angular decorator.
     *
     * @param name The name of the constant.
     * @param value The constant value.
     */
    constant<T>(name: string, value: T): IModule;
    constant(object: Object): IModule;
    /**
     * Register a new directive with the compiler.
     *
     * @param name Name of the directive in camel-case (i.e. ngBind which will match as ng-bind)
     * @param directiveFactory An injectable directive factory function.
     */
    directive<
      TScope extends IScope = IScope,
      TElement extends JQLite = JQLite,
      TAttributes extends IAttributes = IAttributes,
      TController extends IDirectiveController = IController,
    >(
      name: string,
      directiveFactory: Injectable<
        IDirectiveFactory<TScope, TElement, TAttributes, TController>
      >,
    ): IModule;
    directive<
      TScope extends IScope = IScope,
      TElement extends JQLite = JQLite,
      TAttributes extends IAttributes = IAttributes,
      TController extends IDirectiveController = IController,
    >(object: {
      [directiveName: string]: Injectable<
        IDirectiveFactory<TScope, TElement, TAttributes, TController>
      >;
    }): IModule;

    /**
     * Register a service factory, which will be called to return the service instance. This is short for registering a service where its provider consists of only a $get property, which is the given service factory function. You should use $provide.factory(getFn) if you do not need to configure your service in a provider.
     *
     * @param name The name of the instance.
     * @param $getFn The $getFn for the instance creation. Internally this is a short hand for $provide.provider(name, {$get: $getFn}).
     */
    factory(name: string, $getFn: Injectable<Function>): IModule;
    factory(object: { [name: string]: Injectable<Function> }): IModule;
    filter(
      name: string,
      filterFactoryFunction: Injectable<FilterFactory>,
    ): IModule;
    filter(object: { [name: string]: Injectable<FilterFactory> }): IModule;
    provider(
      name: string,
      serviceProviderFactory: IServiceProviderFactory,
    ): IModule;
    provider(
      name: string,
      serviceProviderConstructor: IServiceProviderClass,
    ): IModule;
    provider(name: string, inlineAnnotatedConstructor: any[]): IModule;
    provider(name: string, providerObject: IServiceProvider): IModule;
    provider(object: Object): IModule;
    /**
     * Run blocks are the closest thing in Angular to the main method. A run block is the code which needs to run to kickstart the application. It is executed after all of the service have been configured and the injector has been created. Run blocks typically contain code which is hard to unit-test, and for this reason should be declared in isolated modules, so that they can be ignored in the unit-tests.
     */
    run(initializationFunction: Injectable<Function>): IModule;
    /**
     * Register a service constructor, which will be invoked with new to create the service instance. This is short for registering a service where its provider's $get property is a factory function that returns an instance instantiated by the injector from the service constructor function.
     *
     * @param name The name of the instance.
     * @param serviceConstructor An injectable class (constructor function) that will be instantiated.
     */
    service(name: string, serviceConstructor: Injectable<Function>): IModule;
    service(object: { [name: string]: Injectable<Function> }): IModule;
    /**
     * Register a value service with the $injector, such as a string, a number, an array, an object or a function. This is short for registering a service where its provider's $get property is a factory function that takes no arguments and returns the value service.

     Value services are similar to constant services, except that they cannot be injected into a module configuration function (see config) but they can be overridden by an Angular decorator.
     *
     * @param name The name of the instance.
     * @param value The value.
     */
    value<T>(name: string, value: T): IModule;
    value(object: Object): IModule;

    /**
     * Register a service decorator with the $injector. A service decorator intercepts the creation of a service, allowing it to override or modify the behaviour of the service. The object returned by the decorator may be the original service, or a new service object which replaces or wraps and delegates to the original service.
     * @param name The name of the service to decorate
     * @param decorator This function will be invoked when the service needs to be instantiated and should return the decorated service instance. The function is called using the injector.invoke method and is therefore fully injectable. Local injection arguments: $delegate - The original service instance, which can be monkey patched, configured, decorated or delegated to.
     */
    decorator(name: string, decorator: Injectable<Function>): IModule;

    // Properties
    name: string;
    requires: string[];
  }

  ///////////////////////////////////////////////////////////////////////////
  // Attributes
  // see http://docs.angularjs.org/api/ng/type/$compile.directive.Attributes
  ///////////////////////////////////////////////////////////////////////////
  interface IAttributes {
    /**
     * this is necessary to be able to access the scoped attributes. it's not very elegant
     * because you have to use attrs['foo'] instead of attrs.foo but I don't know of a better way
     * this should really be limited to return string but it creates this problem: http://stackoverflow.com/q/17201854/165656
     */
    [name: string]: any;

    /**
     * Converts an attribute name (e.g. dash/colon/underscore-delimited string, optionally prefixed with x- or data-) to its normalized, camelCase form.
     *
     * Also there is special case for Moz prefix starting with upper case letter.
     *
     * For further information check out the guide on @see https://docs.angularjs.org/guide/directive#matching-directives
     */
    $normalize(name: string): string;

    /**
     * Adds the CSS class value specified by the classVal parameter to the
     * element. If animations are enabled then an animation will be triggered
     * for the class addition.
     */
    $addClass(classVal: string): void;

    /**
     * Removes the CSS class value specified by the classVal parameter from the
     * element. If animations are enabled then an animation will be triggered for
     * the class removal.
     */
    $removeClass(classVal: string): void;

    /**
     * Adds and removes the appropriate CSS class values to the element based on the difference between
     * the new and old CSS class values (specified as newClasses and oldClasses).
     */
    $updateClass(newClasses: string, oldClasses: string): void;

    /**
     * Set DOM element attribute value.
     */
    $set(key: string, value: any): void;

    /**
     * Observes an interpolated attribute.
     * The observer function will be invoked once during the next $digest
     * following compilation. The observer is then invoked whenever the
     * interpolated value changes.
     */
    $observe<T>(name: string, fn: (value?: T) => any): Function;

    /**
     * A map of DOM element attribute names to the normalized name. This is needed
     * to do reverse lookup from normalized name back to actual name.
     */
    $attr: Object;
  }

  /**
   * form.FormController - type in module ng
   * see https://docs.angularjs.org/api/ng/type/form.FormController
   */
  interface IFormController {
    /**
     * Indexer which should return ng.INgModelController for most properties but cannot because of "All named properties must be assignable to string indexer type" constraint - see https://github.com/Microsoft/TypeScript/issues/272
     */
    [name: string]: any;

    $pristine: boolean;
    $dirty: boolean;
    $valid: boolean;
    $invalid: boolean;
    $submitted: boolean;
    $error: {
      [validationErrorKey: string]: Array<INgModelController | IFormController>;
    };
    $name?: string | undefined;
    $pending?:
      | {
          [validationErrorKey: string]: Array<
            INgModelController | IFormController
          >;
        }
      | undefined;
    $addControl(control: INgModelController | IFormController): void;
    $getControls(): ReadonlyArray<INgModelController | IFormController>;
    $removeControl(control: INgModelController | IFormController): void;
    $setValidity(
      validationErrorKey: string,
      isValid: boolean,
      control: INgModelController | IFormController,
    ): void;
    $setDirty(): void;
    $setPristine(): void;
    $commitViewValue(): void;
    $rollbackViewValue(): void;
    $setSubmitted(): void;
    $setUntouched(): void;
  }

  ///////////////////////////////////////////////////////////////////////////
  // NgModelController
  // see http://docs.angularjs.org/api/ng/type/ngModel.NgModelController
  ///////////////////////////////////////////////////////////////////////////
  interface INgModelController {
    $render(): void;
    $setValidity(validationErrorKey: string, isValid: boolean): void;
    // Documentation states viewValue and modelValue to be a string but other
    // types do work and it's common to use them.
    $setViewValue(value: any, trigger?: string): void;
    $setPristine(): void;
    $setDirty(): void;
    $validate(): void;
    $setTouched(): void;
    $setUntouched(): void;
    $rollbackViewValue(): void;
    $commitViewValue(): void;
    $processModelValue(): void;
    $isEmpty(value: any): boolean;
    $overrideModelOptions(options: INgModelOptions): void;

    $viewValue: any;

    $modelValue: any;

    $parsers: IModelParser[];
    $formatters: IModelFormatter[];
    $viewChangeListeners: IModelViewChangeListener[];
    $error: { [validationErrorKey: string]: boolean };
    $name?: string | undefined;

    $touched: boolean;
    $untouched: boolean;

    $validators: IModelValidators;
    $asyncValidators: IAsyncModelValidators;

    $pending?: { [validationErrorKey: string]: boolean } | undefined;
    $pristine: boolean;
    $dirty: boolean;
    $valid: boolean;
    $invalid: boolean;
  }

  // Allows tuning how model updates are done.
  // https://docs.angularjs.org/api/ng/directive/ngModelOptions
  interface INgModelOptions {
    updateOn?: string | undefined;
    debounce?: number | { [key: string]: number } | undefined;
    allowInvalid?: boolean | undefined;
    getterSetter?: boolean | undefined;
    timezone?: string | undefined;
    /**
     * Defines if the time and datetime-local types should show seconds and milliseconds.
     * The option follows the format string of date filter.
     * By default, the options is undefined which is equal to 'ss.sss' (seconds and milliseconds)
     */
    timeSecondsFormat?: string | undefined;
    /**
     * Defines if the time and datetime-local types should strip the seconds and milliseconds
     * from the formatted value if they are zero. This option is applied after `timeSecondsFormat`
     */
    timeStripZeroSeconds?: boolean | undefined;
  }

  interface IModelValidators {
    /**
     * viewValue is any because it can be an object that is called in the view like $viewValue.name:$viewValue.subName
     */
    [index: string]: (modelValue: any, viewValue: any) => boolean;
  }

  interface IAsyncModelValidators {
    [index: string]: (modelValue: any, viewValue: any) => IPromise<any>;
  }

  interface IModelParser {
    (value: any): any;
  }

  interface IModelFormatter {
    (value: any): any;
  }

  interface IModelViewChangeListener {
    (): void;
  }

  interface IAngularEvent {
    /**
     * the scope on which the event was $emit-ed or $broadcast-ed.
     */
    targetScope: IScope;
    /**
     * the scope that is currently handling the event. Once the event propagates through the scope hierarchy, this property is set to null.
     */
    currentScope: IScope;
    /**
     * name of the event.
     */
    name: string;
    /**
     * calling stopPropagation function will cancel further event propagation (available only for events that were $emit-ed).
     */
    stopPropagation?(): void;
    /**
     * calling preventDefault sets defaultPrevented flag to true.
     */
    preventDefault(): void;
    /**
     * true if preventDefault was called.
     */
    defaultPrevented: boolean;
  }

  /**
   * $filter - $filterProvider - service in module ng
   *
   * Filters are used for formatting data displayed to the user.
   *
   * see https://docs.angularjs.org/api/ng/service/$filter
   */
  interface IFilterService {
    (name: "filter"): IFilterFilter;
    (name: "currency"): IFilterCurrency;
    (name: "number"): IFilterNumber;
    (name: "date"): IFilterDate;
    (name: "json"): IFilterJson;
    (name: "lowercase"): IFilterLowercase;
    (name: "uppercase"): IFilterUppercase;
    (name: "limitTo"): IFilterLimitTo;
    (name: "orderBy"): IFilterOrderBy;
    /**
     * Usage:
     * $filter(name);
     *
     * @param name Name of the filter function to retrieve
     */
    <T>(name: string): T;
  }

  interface IFilterFilter {
    <T>(
      array: T[],
      expression:
        | string
        | IFilterFilterPatternObject
        | IFilterFilterPredicateFunc<T>,
      comparator?: IFilterFilterComparatorFunc<T> | boolean,
    ): T[];
  }

  interface IFilterFilterPatternObject {
    [name: string]: any;
  }

  interface IFilterFilterPredicateFunc<T> {
    (value: T, index: number, array: T[]): boolean;
  }

  interface IFilterFilterComparatorFunc<T> {
    (actual: T, expected: T): boolean;
  }

  interface IFilterOrderByItem {
    value: any;
    type: string;
    index: any;
  }

  interface IFilterOrderByComparatorFunc {
    (left: IFilterOrderByItem, right: IFilterOrderByItem): -1 | 0 | 1;
  }

  interface IFilterCurrency {
    /**
     * Formats a number as a currency (ie $1,234.56). When no currency symbol is provided, default symbol for current locale is used.
     * @param amount Input to filter.
     * @param symbol Currency symbol or identifier to be displayed.
     * @param fractionSize Number of decimal places to round the amount to, defaults to default max fraction size for current locale
     * @return Formatted number
     */
    (amount: number, symbol?: string, fractionSize?: number): string;
  }

  interface IFilterNumber {
    /**
     * Formats a number as text.
     * @param number Number to format.
     * @param fractionSize Number of decimal places to round the number to. If this is not provided then the fraction size is computed from the current locale's number formatting pattern. In the case of the default locale, it will be 3.
     * @return Number rounded to decimalPlaces and places a “,” after each third digit.
     */
    (value: number | string, fractionSize?: number | string): string;
  }

  interface IFilterDate {
    /**
     * Formats date to a string based on the requested format.
     *
     * @param date Date to format either as Date object, milliseconds (string or number) or various ISO 8601 datetime string formats (e.g. yyyy-MM-ddTHH:mm:ss.sssZ and its shorter versions like yyyy-MM-ddTHH:mmZ, yyyy-MM-dd or yyyyMMddTHHmmssZ). If no timezone is specified in the string input, the time is considered to be in the local timezone.
     * @param format Formatting rules (see Description). If not specified, mediumDate is used.
     * @param timezone Timezone to be used for formatting. It understands UTC/GMT and the continental US time zone abbreviations, but for general use, use a time zone offset, for example, '+0430' (4 hours, 30 minutes east of the Greenwich meridian) If not specified, the timezone of the browser will be used.
     * @return Formatted string or the input if input is not recognized as date/millis.
     */
    (date: Date | number | string, format?: string, timezone?: string): string;
  }

  interface IFilterJson {
    /**
     * Allows you to convert a JavaScript object into JSON string.
     * @param object Any JavaScript object (including arrays and primitive types) to filter.
     * @param spacing The number of spaces to use per indentation, defaults to 2.
     * @return JSON string.
     */
    (object: any, spacing?: number): string;
  }

  interface IFilterLowercase {
    /**
     * Converts string to lowercase.
     */
    (value: string): string;
  }

  interface IFilterUppercase {
    /**
     * Converts string to uppercase.
     */
    (value: string): string;
  }

  interface IFilterLimitTo {
    /**
     * Creates a new array containing only a specified number of elements. The elements are taken from either the beginning or the end of the source array, string or number, as specified by the value and sign (positive or negative) of limit.
     * @param input Source array to be limited.
     * @param limit The length of the returned array. If the limit number is positive, limit number of items from the beginning of the source array/string are copied. If the number is negative, limit number of items from the end of the source array are copied. The limit will be trimmed if it exceeds array.length. If limit is undefined, the input will be returned unchanged.
     * @param begin Index at which to begin limitation. As a negative index, begin indicates an offset from the end of input. Defaults to 0.
     * @return A new sub-array of length limit or less if input array had less than limit elements.
     */
    <T>(input: T[], limit: string | number, begin?: string | number): T[];
    /**
     * Creates a new string containing only a specified number of elements. The elements are taken from either the beginning or the end of the source string or number, as specified by the value and sign (positive or negative) of limit. If a number is used as input, it is converted to a string.
     * @param input Source string or number to be limited.
     * @param limit The length of the returned string. If the limit number is positive, limit number of items from the beginning of the source string are copied. If the number is negative, limit number of items from the end of the source string are copied. The limit will be trimmed if it exceeds input.length. If limit is undefined, the input will be returned unchanged.
     * @param begin Index at which to begin limitation. As a negative index, begin indicates an offset from the end of input. Defaults to 0.
     * @return A new substring of length limit or less if input had less than limit elements.
     */
    (
      input: string | number,
      limit: string | number,
      begin?: string | number,
    ): string;
  }

  interface IFilterOrderBy {
    /**
     * Orders a specified array by the expression predicate. It is ordered alphabetically for strings and numerically for numbers. Note: if you notice numbers are not being sorted as expected, make sure they are actually being saved as numbers and not strings.
     * @param array The array to sort.
     * @param expression A predicate to be used by the comparator to determine the order of elements.
     * @param reverse Reverse the order of the array.
     * @param comparator Function used to determine the relative order of value pairs.
     * @return An array containing the items from the specified collection, ordered by a comparator function based on the values computed using the expression predicate.
     */
    <T>(
      array: T[],
      expression:
        | string
        | ((value: T) => any)
        | Array<((value: T) => any) | string>,
      reverse?: boolean,
      comparator?: IFilterOrderByComparatorFunc,
    ): T[];
  }

  /**
   * $filterProvider - $filter - provider in module ng
   *
   * Filters are just functions which transform input to an output. However filters need to be Dependency Injected. To achieve this a filter definition consists of a factory function which is annotated with dependencies and is responsible for creating a filter function.
   *
   * see https://docs.angularjs.org/api/ng/provider/$filterProvider
   */
  interface IFilterProvider extends IServiceProvider {
    /**
     * register(name);
     *
     * @param name Name of the filter function, or an object map of filters where the keys are the filter names and the values are the filter factories. Note: Filter names must be valid angular Expressions identifiers, such as uppercase or orderBy. Names with special characters, such as hyphens and dots, are not allowed. If you wish to namespace your filters, then you can use capitalization (myappSubsectionFilterx) or underscores (myapp_subsection_filterx).
     */
    register(name: string | {}): IServiceProvider;
  }

  interface ILogProvider extends IServiceProvider {
    debugEnabled(): boolean;
    debugEnabled(enabled: boolean): ILogProvider;
  }

  // We define this as separate interface so we can reopen it later for
  // the ngMock module.
  interface ILogCall {
    (...args: any[]): void;
  }

  ///////////////////////////////////////////////////////////////////////////
  // ParseService
  // see http://docs.angularjs.org/api/ng/service/$parse
  // see http://docs.angularjs.org/api/ng/provider/$parseProvider
  ///////////////////////////////////////////////////////////////////////////
  interface IParseService {
    (
      expression: string,
      interceptorFn?: (value: any, scope: IScope, locals: any) => any,
      expensiveChecks?: boolean,
    ): ICompiledExpression;
  }

  interface IParseProvider {
    logPromiseWarnings(): boolean;
    logPromiseWarnings(value: boolean): IParseProvider;

    unwrapPromises(): boolean;
    unwrapPromises(value: boolean): IParseProvider;

    /**
     * Configure $parse service to add literal values that will be present as literal at expressions.
     *
     * @param literalName Token for the literal value. The literal name value must be a valid literal name.
     * @param literalValue Value for this literal. All literal values must be primitives or `undefined`.
     */
    addLiteral(literalName: string, literalValue: any): void;

    /**
     * Allows defining the set of characters that are allowed in Angular expressions. The function identifierStart will get called to know if a given character is a valid character to be the first character for an identifier. The function identifierContinue will get called to know if a given character is a valid character to be a follow-up identifier character. The functions identifierStart and identifierContinue will receive as arguments the single character to be identifier and the character code point. These arguments will be string and numeric. Keep in mind that the string parameter can be two characters long depending on the character representation. It is expected for the function to return true or false, whether that character is allowed or not.
     * Since this function will be called extensivelly, keep the implementation of these functions fast, as the performance of these functions have a direct impact on the expressions parsing speed.
     *
     * @param identifierStart The function that will decide whether the given character is a valid identifier start character.
     * @param identifierContinue The function that will decide whether the given character is a valid identifier continue character.
     */
    setIdentifierFns(
      identifierStart?: (character: string, codePoint: number) => boolean,
      identifierContinue?: (character: string, codePoint: number) => boolean,
    ): void;
  }

  interface ICompiledExpression {
    (context: any, locals?: any): any;

    literal: boolean;
    constant: boolean;

    // If value is not provided, undefined is gonna be used since the implementation
    // does not check the parameter. Let's force a value for consistency. If consumer
    // whants to undefine it, pass the undefined value explicitly.
    assign(context: any, value: any): any;
  }

  interface ILocationProvider extends IServiceProvider {
    hashPrefix(): string;
    hashPrefix(prefix: string): ILocationProvider;
    html5Mode(): boolean;

    // Documentation states that parameter is string, but
    // implementation tests it as boolean, which makes more sense
    // since this is a toggler
    html5Mode(active: boolean): ILocationProvider;
    html5Mode(mode: {
      enabled?: boolean | undefined;
      requireBase?: boolean | undefined;
      rewriteLinks?: boolean | undefined;
    }): ILocationProvider;
  }

  ///////////////////////////////////////////////////////////////////////////
  // CompileService
  // see http://docs.angularjs.org/api/ng/service/$compile
  // see http://docs.angularjs.org/api/ng/provider/$compileProvider
  ///////////////////////////////////////////////////////////////////////////
  interface ICompileService {
    (
      element: string | Element | JQuery,
      transclude?: ITranscludeFunction,
      maxPriority?: number,
    ): ITemplateLinkingFunction;
  }

  interface ICompileProvider extends IServiceProvider {
    directive<
      TScope extends IScope = IScope,
      TElement extends JQLite = JQLite,
      TAttributes extends IAttributes = IAttributes,
      TController extends IDirectiveController = IController,
    >(
      name: string,
      directiveFactory: Injectable<
        IDirectiveFactory<TScope, TElement, TAttributes, TController>
      >,
    ): ICompileProvider;
    directive<
      TScope extends IScope = IScope,
      TElement extends JQLite = JQLite,
      TAttributes extends IAttributes = IAttributes,
      TController extends IDirectiveController = IController,
    >(object: {
      [directiveName: string]: Injectable<
        IDirectiveFactory<TScope, TElement, TAttributes, TController>
      >;
    }): ICompileProvider;

    component(name: string, options: IComponentOptions): ICompileProvider;
    component(object: {
      [componentName: string]: IComponentOptions;
    }): ICompileProvider;

    /** @deprecated The old name of aHrefSanitizationTrustedUrlList. Kept for compatibility. */
    aHrefSanitizationWhitelist(): RegExp;
    /** @deprecated The old name of aHrefSanitizationTrustedUrlList. Kept for compatibility. */
    aHrefSanitizationWhitelist(regexp: RegExp): ICompileProvider;

    aHrefSanitizationTrustedUrlList(): RegExp;
    aHrefSanitizationTrustedUrlList(regexp: RegExp): ICompileProvider;

    /** @deprecated The old name of imgSrcSanitizationTrustedUrlList. Kept for compatibility. */
    imgSrcSanitizationWhitelist(): RegExp;
    /** @deprecated The old name of imgSrcSanitizationTrustedUrlList. Kept for compatibility. */
    imgSrcSanitizationWhitelist(regexp: RegExp): ICompileProvider;

    imgSrcSanitizationTrustedUrlList(): RegExp;
    imgSrcSanitizationTrustedUrlList(regexp: RegExp): ICompileProvider;

    debugInfoEnabled(): boolean;
    debugInfoEnabled(enabled: boolean): ICompileProvider;

    /**
     * Sets the number of times $onChanges hooks can trigger new changes before giving up and assuming that the model is unstable.
     * Increasing the TTL could have performance implications, so you should not change it without proper justification.
     * Default: 10.
     * See: https://docs.angularjs.org/api/ng/provider/$compileProvider#onChangesTtl
     */
    onChangesTtl(): number;
    onChangesTtl(limit: number): ICompileProvider;

    /**
     * It indicates to the compiler whether or not directives on comments should be compiled.
     * It results in a compilation performance gain since the compiler doesn't have to check comments when looking for directives.
     * Defaults to true.
     * See: https://docs.angularjs.org/api/ng/provider/$compileProvider#commentDirectivesEnabled
     */
    commentDirectivesEnabled(): boolean;
    commentDirectivesEnabled(enabled: boolean): ICompileProvider;

    /**
     * It indicates to the compiler whether or not directives on element classes should be compiled.
     * It results in a compilation performance gain since the compiler doesn't have to check element classes when looking for directives.
     * Defaults to true.
     * See: https://docs.angularjs.org/api/ng/provider/$compileProvider#cssClassDirectivesEnabled
     */
    cssClassDirectivesEnabled(): boolean;
    cssClassDirectivesEnabled(enabled: boolean): ICompileProvider;

    /**
     * Call this method to enable/disable strict component bindings check.
     * If enabled, the compiler will enforce that for all bindings of a
     * component that are not set as optional with ?, an attribute needs
     * to be provided on the component's HTML tag.
     * Defaults to false.
     * See: https://docs.angularjs.org/api/ng/provider/$compileProvider#strictComponentBindingsEnabled
     */
    strictComponentBindingsEnabled(): boolean;
    strictComponentBindingsEnabled(enabled: boolean): ICompileProvider;
  }

  interface ICloneAttachFunction {
    // Let's hint but not force cloneAttachFn's signature
    (clonedElement?: JQLite, scope?: IScope): any;
  }

  // This corresponds to the "publicLinkFn" returned by $compile.
  interface ITemplateLinkingFunction {
    (
      scope: IScope,
      cloneAttachFn?: ICloneAttachFunction,
      options?: ITemplateLinkingFunctionOptions,
    ): JQLite;
  }

  interface ITemplateLinkingFunctionOptions {
    parentBoundTranscludeFn?: ITranscludeFunction | undefined;
    transcludeControllers?:
      | {
          [controller: string]: { instance: IController };
        }
      | undefined;
    futureParentElement?: JQuery | undefined;
  }

  /**
   * This corresponds to $transclude passed to controllers and to the transclude function passed to link functions.
   * https://docs.angularjs.org/api/ng/service/$compile#-controller-
   * http://teropa.info/blog/2015/06/09/transclusion.html
   */
  interface ITranscludeFunction {
    // If the scope is provided, then the cloneAttachFn must be as well.
    (
      scope: IScope,
      cloneAttachFn: ICloneAttachFunction,
      futureParentElement?: JQuery,
      slotName?: string,
    ): JQLite;
    // If one argument is provided, then it's assumed to be the cloneAttachFn.
    (
      cloneAttachFn?: ICloneAttachFunction,
      futureParentElement?: JQuery,
      slotName?: string,
    ): JQLite;

    /**
     * Returns true if the specified slot contains content (i.e. one or more DOM nodes)
     */
    isSlotFilled(slotName: string): boolean;
  }

  ///////////////////////////////////////////////////////////////////////////
  // ControllerService
  // see http://docs.angularjs.org/api/ng/service/$controller
  // see http://docs.angularjs.org/api/ng/provider/$controllerProvider
  ///////////////////////////////////////////////////////////////////////////

  interface IControllerService {
    // Although the documentation doesn't state this, locals are optional
    <T>(controllerConstructor: new (...args: any[]) => T, locals?: any): T;
    <T>(controllerConstructor: (...args: any[]) => T, locals?: any): T;
    <T>(controllerName: string, locals?: any): T;
  }

  interface IControllerProvider extends IServiceProvider {
    register(name: string, controllerConstructor: Function): void;
    register(name: string, dependencyAnnotatedConstructor: any[]): void;
  }

  /**
   * xhrFactory
   * Replace or decorate this service to create your own custom XMLHttpRequest objects.
   * see https://docs.angularjs.org/api/ng/service/$xhrFactory
   */
  interface IXhrFactory<T> {
    (method: string, url: string): T;
  }

  /**
   * HttpService
   * see http://docs.angularjs.org/api/ng/service/$http
   */
  interface IHttpService {
    /**
     * Object describing the request to be made and how it should be processed.
     */
    <T>(config: IRequestConfig): IHttpPromise<T>;

    /**
     * Shortcut method to perform GET request.
     *
     * @param url Relative or absolute URL specifying the destination of the request
     * @param config Optional configuration object
     */
    get<T>(url: string, config?: IRequestShortcutConfig): IHttpPromise<T>;

    /**
     * Shortcut method to perform DELETE request.
     *
     * @param url Relative or absolute URL specifying the destination of the request
     * @param config Optional configuration object
     */
    delete<T>(url: string, config?: IRequestShortcutConfig): IHttpPromise<T>;

    /**
     * Shortcut method to perform HEAD request.
     *
     * @param url Relative or absolute URL specifying the destination of the request
     * @param config Optional configuration object
     */
    head<T>(url: string, config?: IRequestShortcutConfig): IHttpPromise<T>;

    /**
     * Shortcut method to perform POST request.
     *
     * @param url Relative or absolute URL specifying the destination of the request
     * @param data Request content
     * @param config Optional configuration object
     */
    post<T>(
      url: string,
      data: any,
      config?: IRequestShortcutConfig,
    ): IHttpPromise<T>;

    /**
     * Shortcut method to perform PUT request.
     *
     * @param url Relative or absolute URL specifying the destination of the request
     * @param data Request content
     * @param config Optional configuration object
     */
    put<T>(
      url: string,
      data: any,
      config?: IRequestShortcutConfig,
    ): IHttpPromise<T>;

    /**
     * Shortcut method to perform PATCH request.
     *
     * @param url Relative or absolute URL specifying the destination of the request
     * @param data Request content
     * @param config Optional configuration object
     */
    patch<T>(
      url: string,
      data: any,
      config?: IRequestShortcutConfig,
    ): IHttpPromise<T>;

    /**
     * Runtime equivalent of the $httpProvider.defaults property. Allows configuration of default headers, withCredentials as well as request and response transformations.
     */
    defaults: IHttpProviderDefaults;

    /**
     * Array of config objects for currently pending requests. This is primarily meant to be used for debugging purposes.
     */
    pendingRequests: IRequestConfig[];
  }

  /**
   * Object describing the request to be made and how it should be processed.
   * see http://docs.angularjs.org/api/ng/service/$http#usage
   */
  interface IRequestShortcutConfig extends IHttpProviderDefaults {
    /**
     * {Object.<string|Object>}
     * Map of strings or objects which will be turned to ?key1=value1&key2=value2 after the url. If the value is not a string, it will be JSONified.
     */
    params?: any;

    /**
     * {string|Object}
     * Data to be sent as the request message data.
     */
    data?: any;

    /**
     * Timeout in milliseconds, or promise that should abort the request when resolved.
     */
    timeout?: number | IPromise<any> | undefined;

    /**
     * See [XMLHttpRequest.responseType]https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#xmlhttprequest-responsetype
     */
    responseType?: string | undefined;

    /**
     * Name of the parameter added (by AngularJS) to the request to specify the name (in the server response) of the JSON-P callback to invoke.
     * If unspecified, $http.defaults.jsonpCallbackParam will be used by default. This property is only applicable to JSON-P requests.
     */
    jsonpCallbackParam?: string | undefined;
  }

  /**
   * Object describing the request to be made and how it should be processed.
   * see http://docs.angularjs.org/api/ng/service/$http#usage
   */
  interface IRequestConfig extends IRequestShortcutConfig {
    /**
     * HTTP method (e.g. 'GET', 'POST', etc)
     */
    method: string;
    /**
     * Absolute or relative URL of the resource that is being requested.
     */
    url: string;
    /**
     * Event listeners to be bound to the XMLHttpRequest object.
     * To bind events to the XMLHttpRequest upload object, use uploadEventHandlers. The handler will be called in the context of a $apply block.
     */
    eventHandlers?:
      | { [type: string]: EventListenerOrEventListenerObject }
      | undefined;
    /**
     * Event listeners to be bound to the XMLHttpRequest upload object.
     * To bind events to the XMLHttpRequest object, use eventHandlers. The handler will be called in the context of a $apply block.
     */
    uploadEventHandlers?:
      | { [type: string]: EventListenerOrEventListenerObject }
      | undefined;
  }

  interface IHttpHeadersGetter {
    (): { [name: string]: string };
    (headerName: string): string;
  }

  interface IHttpPromiseCallback<T> {
    (
      data: T,
      status: number,
      headers: IHttpHeadersGetter,
      config: IRequestConfig,
    ): void;
  }

  interface IHttpResponse<T> {
    data: T;
    status: number;
    headers: IHttpHeadersGetter;
    config: IRequestConfig;
    statusText: string;
    /** Added in AngularJS 1.6.6 */
    xhrStatus: "complete" | "error" | "timeout" | "abort";
  }

  /** @deprecated The old name of IHttpResponse. Kept for compatibility. */
  type IHttpPromiseCallbackArg<T> = IHttpResponse<T>;

  type IHttpPromise<T> = IPromise<IHttpResponse<T>>;

  // See the jsdoc for transformData() at https://github.com/angular/angular.js/blob/master/src/ng/http.js#L228
  interface IHttpRequestTransformer {
    (data: any, headersGetter: IHttpHeadersGetter): any;
  }

  // The definition of fields are the same as IHttpResponse
  interface IHttpResponseTransformer {
    (data: any, headersGetter: IHttpHeadersGetter, status: number): any;
  }

  interface HttpHeaderType {
    [requestType: string]: string | ((config: IRequestConfig) => string);
  }

  interface IHttpRequestConfigHeaders {
    [requestType: string]: any;
    common?: any;
    get?: any;
    post?: any;
    put?: any;
    patch?: any;
  }

  /**
   * Object that controls the defaults for $http provider. Not all fields of IRequestShortcutConfig can be configured
   * via defaults and the docs do not say which. The following is based on the inspection of the source code.
   * https://docs.angularjs.org/api/ng/service/$http#defaults
   * https://docs.angularjs.org/api/ng/service/$http#usage
   * https://docs.angularjs.org/api/ng/provider/$httpProvider The properties section
   */
  interface IHttpProviderDefaults {
    /**
     * {boolean|Cache}
     * If true, a default $http cache will be used to cache the GET request, otherwise if a cache instance built with $cacheFactory, this cache will be used for caching.
     */
    cache?: any;

    /**
     * Transform function or an array of such functions. The transform function takes the http request body and
     * headers and returns its transformed (typically serialized) version.
     * @see {@link https://docs.angularjs.org/api/ng/service/$http#transforming-requests-and-responses}
     */
    transformRequest?:
      | IHttpRequestTransformer
      | IHttpRequestTransformer[]
      | undefined;

    /**
     * Transform function or an array of such functions. The transform function takes the http response body and
     * headers and returns its transformed (typically deserialized) version.
     */
    transformResponse?:
      | IHttpResponseTransformer
      | IHttpResponseTransformer[]
      | undefined;

    /**
     * Map of strings or functions which return strings representing HTTP headers to send to the server. If the
     * return value of a function is null, the header will not be sent.
     * The key of the map is the request verb in lower case. The "common" key applies to all requests.
     * @see {@link https://docs.angularjs.org/api/ng/service/$http#setting-http-headers}
     */
    headers?: IHttpRequestConfigHeaders | undefined;

    /** Name of HTTP header to populate with the XSRF token. */
    xsrfHeaderName?: string | undefined;

    /** Name of cookie containing the XSRF token. */
    xsrfCookieName?: string | undefined;

    /**
     * whether to to set the withCredentials flag on the XHR object. See [requests with credentials]https://developer.mozilla.org/en/http_access_control#section_5 for more information.
     */
    withCredentials?: boolean | undefined;

    /**
     * A function used to the prepare string representation of request parameters (specified as an object). If
     * specified as string, it is interpreted as a function registered with the $injector. Defaults to
     * $httpParamSerializer.
     */
    paramSerializer?: string | ((obj: any) => string) | undefined;
  }

  interface IHttpInterceptor {
    request?(config: IRequestConfig): IRequestConfig | IPromise<IRequestConfig>;
    requestError?(rejection: any): IRequestConfig | IPromise<IRequestConfig>;
    response?<T>(
      response: IHttpResponse<T>,
    ): IPromise<IHttpResponse<T>> | IHttpResponse<T>;
    responseError?<T>(
      rejection: any,
    ): IPromise<IHttpResponse<T>> | IHttpResponse<T>;
  }

  interface IHttpInterceptorFactory {
    (...args: any[]): IHttpInterceptor;
  }

  interface IHttpProvider extends IServiceProvider {
    defaults: IHttpProviderDefaults;

    /**
     * Register service factories (names or implementations) for interceptors which are called before and after
     * each request.
     */
    interceptors: Array<string | Injectable<IHttpInterceptorFactory>>;
    useApplyAsync(): boolean;
    useApplyAsync(value: boolean): IHttpProvider;

    /** @deprecated The old name of xsrfTrustedOrigins. Kept for compatibility. */
    xsrfWhitelistedOrigins: string[];
    /**
     * Array containing URLs whose origins are trusted to receive the XSRF token.
     */
    xsrfTrustedOrigins: string[];
  }

  ///////////////////////////////////////////////////////////////////////////
  // HttpBackendService
  // see http://docs.angularjs.org/api/ng/service/$httpBackend
  // You should never need to use this service directly.
  ///////////////////////////////////////////////////////////////////////////
  interface IHttpBackendService {
    // XXX Perhaps define callback signature in the future
    (
      method: string,
      url: string,
      post?: any,
      callback?: Function,
      headers?: any,
      timeout?: number,
      withCredentials?: boolean,
    ): void;
  }

  ///////////////////////////////////////////////////////////////////////////
  // SCEService
  // see http://docs.angularjs.org/api/ng/service/$sce
  ///////////////////////////////////////////////////////////////////////////
  interface ISCEService {
    getTrusted(type: string, mayBeTrusted: any): any;
    getTrustedCss(value: any): any;
    getTrustedHtml(value: any): any;
    getTrustedJs(value: any): any;
    getTrustedResourceUrl(value: any): any;
    getTrustedUrl(value: any): any;
    parse(type: string, expression: string): (context: any, locals: any) => any;
    parseAsCss(expression: string): (context: any, locals: any) => any;
    parseAsHtml(expression: string): (context: any, locals: any) => any;
    parseAsJs(expression: string): (context: any, locals: any) => any;
    parseAsResourceUrl(expression: string): (context: any, locals: any) => any;
    parseAsUrl(expression: string): (context: any, locals: any) => any;
    trustAs(type: string, value: any): any;
    trustAsHtml(value: any): any;
    trustAsJs(value: any): any;
    trustAsResourceUrl(value: any): any;
    trustAsUrl(value: any): any;
    isEnabled(): boolean;
  }

  ///////////////////////////////////////////////////////////////////////////
  // SCEProvider
  // see http://docs.angularjs.org/api/ng/provider/$sceProvider
  ///////////////////////////////////////////////////////////////////////////
  interface ISCEProvider extends IServiceProvider {
    enabled(value: boolean): void;
  }

  ///////////////////////////////////////////////////////////////////////////
  // SCEDelegateService
  // see http://docs.angularjs.org/api/ng/service/$sceDelegate
  ///////////////////////////////////////////////////////////////////////////
  interface ISCEDelegateService {
    getTrusted(type: string, mayBeTrusted: any): any;
    trustAs(type: string, value: any): any;
    valueOf(value: any): any;
  }

  ///////////////////////////////////////////////////////////////////////////
  // SCEDelegateProvider
  // see http://docs.angularjs.org/api/ng/provider/$sceDelegateProvider
  ///////////////////////////////////////////////////////////////////////////
  interface ISCEDelegateProvider extends IServiceProvider {
    /** @deprecated since 1.8.1 */
    resourceUrlBlacklist(): any[];
    /** @deprecated since 1.8.1 */
    resourceUrlBlacklist(bannedList: any[]): void;
    bannedResourceUrlList(): any[];
    bannedResourceUrlList(bannedList: any[]): void;
    /** @deprecated since 1.8.1 */
    resourceUrlWhitelist(): any[];
    /** @deprecated since 1.8.1 */
    resourceUrlWhitelist(trustedList: any[]): void;
    trustedResourceUrlList(): any[];
    trustedResourceUrlList(trustedList: any[]): void;
  }
}
