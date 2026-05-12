var _rebuild = /*#__PURE__*/require("./_rebuild.js");
var mapKeys = function mapKeys(fn, obj) {
  return _rebuild(function (k, v) {
    return [[fn(k), v]];
  }, obj);
};
module.exports = mapKeys;