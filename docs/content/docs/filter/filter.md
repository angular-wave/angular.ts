/\*\*

- @ngdoc filter
- @name filter
- @kind function
-
- @description
- Selects a subset of items from `array` and returns it as a new array.
-
- @param {Array} array The source array.
- <div class="alert alert-info">
- **Note**: If the array contains objects that reference themselves, filtering
  is not possible.
- </div>
- @param {string|Object|function()} expression The predicate to be used for
  selecting items from
- `array`.
-
- Can be one of:
-
- - `string`: The string is used for matching against the contents of the
    `array`. All strings or
-     objects with string properties in `array` that match this string will be returned. This also
-     applies to nested object properties.
-     The predicate can be negated by prefixing the string with `!`.
-
- - `Object`: A pattern object can be used to filter specific properties on
    objects contained
-     by `array`. For example `{name:"M", phone:"1"}` predicate will return an array of items
-     which have property `name` containing "M" and property `phone` containing "1". A special
-     property name (`$` by default) can be used (e.g. as in `{$: "text"}`) to accept a match
-     against any property of the object or its nested object properties. That's equivalent to the
-     simple substring match with a `string` as described above. The special property name can be
-     overwritten, using the `anyPropertyKey` parameter.
-     The predicate can be negated by prefixing the string with `!`.
-     For example `{name: "!M"}` predicate will return an array of items which have property `name`
-     not containing "M".
-
-     Note that a named property will match properties on the same level only, while the special
-     `$` property will match properties on the same level or deeper. E.g. an array item like
-     `{name: {first: 'John', last: 'Doe'}}` will **not** be matched by `{name: 'John'}`, but
-     **will** be matched by `{$: 'John'}`.
-
- - `function(value, index, array)`: A predicate function can be used to write
    arbitrary filters.
-     The function is called for each element of the array, with the element, its index, and
-     the entire array itself as arguments.
-
-     The final result is an array of those elements that the predicate returned true for.
-
- @param {function(actual, expected)|true|false} [comparator] Comparator which
  is used in
-     determining if values retrieved using `expression` (when it is not a function) should be
-     considered a match based on the expected value (from the filter expression) and actual
-     value (from the object in the array).
-
- Can be one of:
-
- - `function(actual, expected)`:
-     The function will be given the object value and the predicate value to compare and
-     should return true if both values should be considered equal.
-
- - `true`: A shorthand for strict value comparison.
-     This is essentially strict comparison of expected and actual.
-
- - `false`: A short hand for a function which will look for a substring match
    in a case
-     insensitive way. Primitive values are converted to strings. Objects are not compared against
-     primitives, unless they have a custom `toString` method (e.g. `Date` objects).
-
-
- Defaults to `false`.
-
- @param {string} [anyPropertyKey] The special property name that matches
  against any property.
-     By default `$`.
- \*/
