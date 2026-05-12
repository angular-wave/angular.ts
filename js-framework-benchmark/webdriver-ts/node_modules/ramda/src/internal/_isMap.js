function _isMap(x) {
  return Object.prototype.toString.call(x) === '[object Map]';
}
module.exports = _isMap;