/**
 * This is a [[StateBuilder.builder]] function for the `resolve:` block on a [[StateDeclaration]].
 *
 * When the [[StateBuilder]] builds a [[StateObject]] object from a raw [[StateDeclaration]], this builder
 * validates the `resolve` property and converts it to a [[Resolvable]] array.
 *
 * resolve: input value can be:
 *
 * {
 *   // analyzed but not injected
 *   myFooResolve: function() { return "myFooData"; },
 *
 *   // function.toString() parsed, "DependencyName" dep as string (not min-safe)
 *   myBarResolve: function(DependencyName) { return DependencyName.fetchSomethingAsPromise() },
 *
 *   // Array split; "DependencyName" dep as string
 *   myBazResolve: [ "DependencyName", function(dep) { return dep.fetchSomethingAsPromise() },
 *
 *   // Array split; DependencyType dep as token (compared using ===)
 *   myQuxResolve: [ DependencyType, function(dep) { return dep.fetchSometingAsPromise() },
 *
 *   // val.$inject used as deps
 *   // where:
 *   //     corgeResolve.$inject = ["DependencyName"];
 *   //     function corgeResolve(dep) { dep.fetchSometingAsPromise() }
 *   // then "DependencyName" dep as string
 *   myCorgeResolve: corgeResolve,
 *
 *  // inject service by name
 *  // When a string is found, desugar creating a resolve that injects the named service
 *   myGraultResolve: "SomeService"
 * }
 *
 * or:
 *
 * [
 *   new Resolvable("myFooResolve", function() { return "myFooData" }),
 *   new Resolvable("myBarResolve", function(dep) { return dep.fetchSomethingAsPromise() }, [ "DependencyName" ]),
 *   { provide: "myBazResolve", useFactory: function(dep) { dep.fetchSomethingAsPromise() }, deps: [ "DependencyName" ] }
 * ]
 * @param {ng.StateObject & ng.StateDeclaration} state
 * @param {boolean | undefined} strictDi
 */
export function resolvablesBuilder(
  state: ng.StateObject & ng.StateDeclaration,
  strictDi: boolean | undefined,
): any[];
/**
 * A internal global service
 *
 * StateBuilder is a factory for the internal [[StateObject]] objects.
 *
 * When you register a state with the [[StateRegistry]], you register a plain old javascript object which
 * conforms to the [[StateDeclaration]] interface.  This factory takes that object and builds the corresponding
 * [[StateObject]] object, which has an API and is used internally.
 *
 * Custom properties or API may be added to the internal [[StateObject]] object by registering a decorator function
 * using the [[builder]] method.
 */
export class StateBuilder {
  /**
   * @param {import('./state-matcher.js').StateMatcher} matcher
   * @param {ng.UrlService} urlService
   */
  constructor(
    matcher: import("./state-matcher.js").StateMatcher,
    urlService: ng.UrlService,
  );
  _matcher: import("./state-matcher.js").StateMatcher;
  /** @type {ng.InjectorService | undefined} */
  _$injector: ng.InjectorService | undefined;
  /** @type {Builders} */
  _builders: Builders;
  /**
   * @param {string} name
   * @param {*} fn
   * @returns {BuilderFunction | BuilderFunction[] | null | undefined}
   */
  builder(
    name: string,
    fn: any,
  ): BuilderFunction | BuilderFunction[] | null | undefined;
  /**
   * Builds all of the properties on an essentially blank State object, returning a State object which has all its
   * properties and API built.
   *
   * @param {ng.StateObject} state an uninitialized State object
   * @returns {ng.StateObject | null} the built State object
   */
  build(state: ng.StateObject): ng.StateObject | null;
  /**
   *
   * @param {ng.StateObject} state
   * @returns {string}
   */
  parentName(state: ng.StateObject): string;
  /** @param {ng.StateObject} state*/
  name(state: ng.StateObject): string;
}
export type BuilderFunction = import("./interface.ts").BuilderFunction;
export type Builders = import("./interface.ts").Builders;
export type UrlMatcher = import("../url/url-matcher.js").UrlMatcher;
