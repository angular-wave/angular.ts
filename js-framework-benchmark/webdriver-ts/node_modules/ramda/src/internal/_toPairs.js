var _has = /*#__PURE__*/require("./_has.js");
function _toPairs(obj) {
  var pairs = [];
  for (var prop in obj) {
    if (_has(prop, obj)) {
      pairs[pairs.length] = [prop, obj[prop]];
    }
  }
  return pairs;
}
module.exports = _toPairs;