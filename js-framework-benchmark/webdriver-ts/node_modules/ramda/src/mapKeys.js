var _curry2 = /*#__PURE__*/require("./internal/_curry2.js");
var _mapKeys = /*#__PURE__*/require("./internal/_mapKeys.js");
/**
 * Transforms an object by converting the keys to new values.
 *
 * **Note** that if multiple keys map to the same new key, the last one processed will dominate.
 *
 * @func
 * @memberOf R
 * @since v0.31.0
 * @category Object
 * @sig (String -> String) -> Object -> Object
 * @param {Function} fn
 * @param {Object} obj
 * @return {Object}
 * @see R.map, R.rebuild, R.renameKeys
 * @example
 *
 *      R.mapKeys(toUpper, {foo: 1, bar: 2, baz: 3}) //=> {FOO: 1, BAR: 2, BAZ: 3}
 */
var mapKeys = /*#__PURE__*/_curry2(_mapKeys);
module.exports = mapKeys;