var _isInteger = /*#__PURE__*/require("./_isInteger.js");
var _nth = /*#__PURE__*/require("./_nth.js");
function _prop(p, obj) {
  if (obj == null) {
    return;
  }
  return _isInteger(p) ? _nth(p, obj) : obj[p];
}
module.exports = _prop;