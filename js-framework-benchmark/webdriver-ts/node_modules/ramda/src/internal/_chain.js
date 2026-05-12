var _dispatchable = /*#__PURE__*/require("./_dispatchable.js");
var _makeFlat = /*#__PURE__*/require("./_makeFlat.js");
var _xchain = /*#__PURE__*/require("./_xchain.js");
var map = /*#__PURE__*/require("../map.js");
module.exports = /*#__PURE__*/_dispatchable(['fantasy-land/chain', 'chain'], _xchain, function chain(fn, monad) {
  if (typeof monad === 'function') {
    return function (x) {
      return fn(monad(x))(x);
    };
  }
  return _makeFlat(false)(map(fn, monad));
});