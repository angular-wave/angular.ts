import {
  extend,
  isDefined,
  isUndefined,
  minErr,
  stringify,
} from "../../shared/utils.js";
import { constantWatchDelegate } from "../parse/parse.js";
import { $injectTokens as $t } from "../../injection-tokens.js";

const $interpolateMinErr = minErr("$interpolate");

function throwNoconcat(text) {
  throw $interpolateMinErr(
    "noconcat",
    "Error while interpolating: {0}\nStrict Contextual Escaping disallows " +
      "interpolations that concatenate multiple expressions when a trusted value is " +
      "required.  See http://docs.angularjs.org/api/ng.$sce",
    text,
  );
}

function interr(text, err) {
  throw $interpolateMinErr(
    "interr",
    "Can't interpolate: {0}\n{1}",
    text,
    err.toString(),
  );
}

/**
 *
 * Used for configuring the interpolation markup. Defaults to `{{` and `}}`.
 *
 * <div class="alert alert-danger">
 * This feature is sometimes used to mix different markup languages, e.g. to wrap an AngularTS
 * template within a Python Jinja template (or any other template language). Mixing templating
 * languages is **very dangerous**. The embedding template language will not safely escape AngularTS
 * expressions, so any user-controlled values in the template will cause Cross Site Scripting (XSS)
 * security bugs!
 * </div>
 */
export class InterpolateProvider {
  constructor() {
    /**
     * @type {string} Symbol to denote start of expression in the interpolated string. Defaults to `{{`.
     */
    this.startSymbol = "{{";

    /**
     * @type {string} Symbol to denote the end of expression in the interpolated string. Defaults to `}}`.
     */
    this.endSymbol = "}}";
  }

  $get = [
    $t._parse,
    $t._sce,
    /**
     *
     * @param {ng.ParseService} $parse
     * @param {ng.SCEService} $sce
     * @returns {ng.InterpolateService}
     */
    ($parse, $sce) => {
      /** @type {InterpolateProvider} */
      const provider = this;

      const startSymbolLength = provider.startSymbol.length;

      const endSymbolLength = provider.endSymbol.length;

      const escapedStartRegexp = new RegExp(
        provider.startSymbol.replace(/./g, escape),
        "g",
      );

      const escapedEndRegexp = new RegExp(
        provider.endSymbol.replace(/./g, escape),
        "g",
      );

      function escape(ch) {
        return `\\\\\\${ch}`;
      }

      function unescapeText(text) {
        return text
          .replace(escapedStartRegexp, provider.startSymbol)
          .replace(escapedEndRegexp, provider.endSymbol);
      }

      /**
       *
       * Compiles a string with markup into an interpolation function. This service is used by the
       * HTML {@link ng.$compile $compile} service for data binding. See
       * {@link ng.$interpolateProvider $interpolateProvider} for configuring the
       * interpolation markup.
       *
       *
       * ```js
       *   let $interpolate = ...; // injected
       *   let exp = $interpolate('Hello {{name | uppercase}}!');
       *   expect(exp({name:'AngularTS'})).toEqual('Hello ANGULARJS!');
       * ```
       *
       * `$interpolate` takes an optional fourth argument, `allOrNothing`. If `allOrNothing` is
       * `true`, the interpolation function will return `undefined` unless all embedded expressions
       * evaluate to a value other than `undefined`.
       *
       * ```js
       *   let $interpolate = ...; // injected
       *   let context = {greeting: 'Hello', name: undefined };
       *
       *   // default "forgiving" mode
       *   let exp = $interpolate('{{greeting}} {{name}}!');
       *   expect(exp(context)).toEqual('Hello !');
       *
       *   // "allOrNothing" mode
       *   exp = $interpolate('{{greeting}} {{name}}!', false, null, true);
       *   expect(exp(context)).toBeUndefined();
       *   context.name = 'AngularTS';
       *   expect(exp(context)).toEqual('Hello AngularTS!');
       * ```
       *
       * `allOrNothing` is useful for interpolating URLs. `ngSrc` and `ngSrcset` use this behavior.
       *
       * #### Escaped Interpolation
       * $interpolate provides a mechanism for escaping interpolation markers. Start and end markers
       * can be escaped by preceding each of their characters with a REVERSE SOLIDUS U+005C (backslash).
       * It will be rendered as a regular start/end marker, and will not be interpreted as an expression
       * or binding.
       *
       * This enables web-servers to prevent script injection attacks and defacing attacks, to some
       * degree, while also enabling code examples to work without relying on the
       * {@link ng.directive:ngNonBindable ngNonBindable} directive.
       *
       * **For security purposes, it is strongly encouraged that web servers escape user-supplied data,
       * replacing angle brackets (&lt;, &gt;) with &amp;lt; and &amp;gt; respectively, and replacing all
       * interpolation start/end markers with their escaped counterparts.**
       *
       * Escaped interpolation markers are only replaced with the actual interpolation markers in rendered
       * output when the $interpolate service processes the text. So, for HTML elements interpolated
       * by {@link ng.$compile $compile}, or otherwise interpolated with the `mustHaveExpression` parameter
       * set to `true`, the interpolated text must contain an unescaped interpolation expression. As such,
       * this is typically useful only when user-data is used in rendering a template from the server, or
       * when otherwise untrusted data is used by a directive.
       *
       * <example name="interpolation">
       *  <file name="index.html">
       *    <div ng-init="username='A user'">
       *      <p ng-init="apptitle='Escaping demo'">{{apptitle}}: \{\{ username = "defaced value"; \}\}
       *        </p>
       *      <p><strong>{{username}}</strong> attempts to inject code which will deface the
       *        application, but fails to accomplish their task, because the server has correctly
       *        escaped the interpolation start/end markers with REVERSE SOLIDUS U+005C (backslash)
       *        characters.</p>
       *      <p>Instead, the result of the attempted script injection is visible, and can be removed
       *        from the database by an administrator.</p>
       *    </div>
       *  </file>
       * </example>
       *
       * @knownIssue
       * It is currently not possible for an interpolated expression to contain the interpolation end
       * symbol. For example, `{{ '}}' }}` will be incorrectly interpreted as `{{ ' }}` + `' }}`, i.e.
       * an interpolated expression consisting of a single-quote (`'`) and the `' }}` string.
       *
       * @knownIssue
       * All directives and components must use the standard `{{` `}}` interpolation symbols
       * in their templates. If you change the application interpolation symbols the {@link $compile}
       * service will attempt to denormalize the standard symbols to the custom symbols.
       * The denormalization process is not clever enough to know not to replace instances of the standard
       * symbols where they would not normally be treated as interpolation symbols. For example in the following
       * code snippet the closing braces of the literal object will get incorrectly denormalized:
       *
       * ```
       * <div data-context='{"context":{"id":3,"type":"page"}}">
       * ```
       *
       * The workaround is to ensure that such instances are separated by whitespace:
       * ```
       * <div data-context='{"context":{"id":3,"type":"page"} }">
       * ```
       *
       * See https://github.com/angular/angular.js/pull/14610#issuecomment-219401099 for more information.
       *
       * @param {string} text The text with markup to interpolate.
       * @param {boolean=} mustHaveExpression if set to true then the interpolation string must have
       *    embedded expression in order to return an interpolation function. Strings with no
       *    embedded expression will return null for the interpolation function.
       * @param {string=} trustedContext when provided, the returned function passes the interpolated
       *    result through {@link ng.$sce#getTrusted $sce.getTrusted(interpolatedResult,
       *    trustedContext)} before returning it.  Refer to the {@link ng.$sce $sce} service that
       *    provides Strict Contextual Escaping for details.
       * @param {boolean=} allOrNothing if `true`, then the returned function returns undefined
       *    unless all embedded expressions evaluate to a value other than `undefined`.
       * @returns {Function} an interpolation function which is used to compute the
       *    interpolated string. The function has these parameters:
       *
       * - `context`: evaluation context for all expressions embedded in the interpolated text
       */
      function $interpolate(
        text,
        mustHaveExpression,
        trustedContext,
        allOrNothing,
      ) {
        const contextAllowsConcatenation =
          trustedContext === $sce.URL || trustedContext === $sce.MEDIA_URL;

        // Provide a quick exit and simplified result function for text with no interpolation
        if (!text.length || text.indexOf(provider.startSymbol) === -1) {
          if (mustHaveExpression) return undefined;

          let unescapedText = unescapeText(text);

          if (contextAllowsConcatenation) {
            unescapedText = $sce.getTrusted(trustedContext, unescapedText);
          }

          /**
           * @type {any}
           */
          const constantInterp = () => unescapedText;

          constantInterp.exp = text;
          constantInterp.expressions = [];
          constantInterp._watchDelegate = constantWatchDelegate;

          return constantInterp;
        }

        allOrNothing = !!allOrNothing;
        let startIndex;

        let endIndex;

        let index = 0;

        const expressions = [];

        const textLength = text.length;

        let exp;

        const concat = [];

        const expressionPositions = [];

        while (index < textLength) {
          if (
            (startIndex = text.indexOf(provider.startSymbol, index)) !== -1 &&
            (endIndex = text.indexOf(
              provider.endSymbol,
              startIndex + startSymbolLength,
            )) !== -1
          ) {
            if (index !== startIndex) {
              concat.push(unescapeText(text.substring(index, startIndex)));
            }
            exp = text.substring(startIndex + startSymbolLength, endIndex);
            expressions.push(exp);
            index = endIndex + endSymbolLength;
            expressionPositions.push(concat.length);
            concat.push(""); // Placeholder that will get replaced with the evaluated expression.
          } else {
            // we did not find an interpolation, so we have to add the remainder to the separators array
            if (index !== textLength) {
              concat.push(unescapeText(text.substring(index)));
            }
            break;
          }
        }

        const singleExpression =
          concat.length === 1 && expressionPositions.length === 1;

        // Intercept expression if we need to stringify concatenated inputs, which may be SCE trusted
        // objects rather than simple strings
        // (we don't modify the expression if the input consists of only a single trusted input)
        const interceptor =
          contextAllowsConcatenation && singleExpression
            ? undefined
            : parseStringifyInterceptor;

        const parseFns = expressions.map((x) => $parse(x, interceptor));

        // Concatenating expressions makes it hard to reason about whether some combination of
        // concatenated values are unsafe to use and could easily lead to XSS.  By requiring that a
        // single expression be used for some $sce-managed secure contexts (RESOURCE_URLs mostly),
        // we ensure that the value that's used is assigned or constructed by some JS code somewhere
        // that is more testable or make it obvious that you bound the value to some user controlled
        // value.  This helps reduce the load when auditing for XSS issues.

        // Note that URL and MEDIA_URL $sce contexts do not need this, since `$sce` can sanitize the values
        // passed to it. In that case, `$sce.getTrusted` will be called on either the single expression
        // or on the overall concatenated string (losing trusted types used in the mix, by design).
        // Both these methods will sanitize plain strings. Also, HTML could be included, but since it's
        // only used in srcdoc attributes, this would not be very useful.

        if (!mustHaveExpression || expressions.length) {
          const compute = function (values) {
            for (let i = 0, ii = expressions.length; i < ii; i++) {
              if (allOrNothing && isUndefined(values[i])) return undefined;
              concat[expressionPositions[i]] = values[i];
            }

            if (contextAllowsConcatenation) {
              // If `singleExpression` then `concat[0]` might be a "trusted" value or `null`, rather than a string
              return $sce.getTrusted(
                trustedContext,
                singleExpression ? concat[0] : concat.join(""),
              );
            }

            if (trustedContext && concat.length > 1) {
              // This context does not allow more than one part, e.g. expr + string or exp + exp.
              throwNoconcat(text);
            }

            // In an unprivileged context or only one part: just concatenate and return.
            return concat.join("");
          };

          return /**@type {import("./interface.ts").InterpolationFunction}  */ extend(
            (context, cb) => {
              let i = 0;

              const ii = expressions.length;

              const values = new Array(ii);

              try {
                for (; i < ii; i++) {
                  if (cb) {
                    const watchProp = expressions[i].trim();

                    context.$watch(watchProp, () => {
                      const vals = new Array(ii);

                      let j = 0;

                      for (; j < ii; j++) {
                        const fn = parseFns[j];

                        vals[j] = fn(context);
                      }
                      cb(compute(vals));
                    });
                  }

                  values[i] = parseFns[i](context);
                }

                return compute(values);
              } catch (err) {
                return interr(text, err);
              }
            },
            {
              // Most likely we would need to register watches during interpolation
              // all of these properties are undocumented for now
              exp: text, // just for compatibility with regular watchers created via $watch
              expressions,
              _watchDelegate(scope, listener) {
                let lastValue;

                return scope.$watch(
                  parseFns,
                  function interpolateFnWatcher(values, oldValues) {
                    const currValue = compute(values);

                    listener.call(
                      provider,
                      currValue,
                      values !== oldValues ? lastValue : currValue,
                      scope,
                    );
                    lastValue = currValue;
                  },
                );
              },
            },
          );
        }

        function parseStringifyInterceptor(value) {
          try {
            // In concatenable contexts, getTrusted comes at the end, to avoid sanitizing individual
            // parts of a full URL. We don't care about losing the trustedness here.
            // In non-concatenable contexts, where there is only one expression, this interceptor is
            // not applied to the expression.
            value =
              trustedContext && !contextAllowsConcatenation
                ? $sce.getTrusted(trustedContext, value)
                : $sce.valueOf(value);

            return allOrNothing && !isDefined(value) ? value : stringify(value);
          } catch (err) {
            return interr(text, err);
          }
        }

        return undefined;
      }

      /**
       * Symbol to denote the start of expression in the interpolated string. Defaults to `{{`.
       *
       * Use {@link ng.$interpolateProvider#startSymbol `$interpolateProvider.startSymbol`} to change
       * the symbol.
       *
       * @returns {string} start symbol.
       */
      $interpolate.startSymbol = function () {
        return provider.startSymbol;
      };

      /**
       * Symbol to denote the end of expression in the interpolated string. Defaults to `}}`.
       *
       * Use {@link ng.$interpolateProvider#endSymbol `$interpolateProvider.endSymbol`} to change
       * the symbol.
       *
       * @returns {string} end symbol.
       */
      $interpolate.endSymbol = function () {
        return provider.endSymbol;
      };

      // @ts-ignore
      return $interpolate;
    },
  ];
}
