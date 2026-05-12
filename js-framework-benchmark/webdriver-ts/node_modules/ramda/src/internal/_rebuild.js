var _fromPairs = /*#__PURE__*/require("./_fromPairs.js");
var _toPairs = /*#__PURE__*/require("./_toPairs.js");
var _chain = /*#__PURE__*/require("./_chain.js");
var rebuild = function (convert, obj) {
  return _fromPairs(_chain(function (pair) {
    return convert(pair[0], pair[1]);
  }, _toPairs(obj)));
};
module.exports = rebuild;