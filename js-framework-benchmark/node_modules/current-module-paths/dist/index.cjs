'use strict';

var url = require('url');
var path = require('path');

function getModulePaths (fileURL) {
  const __filename = url.fileURLToPath(fileURL);
  const __dirname = path.dirname(__filename);
  return { __filename, __dirname }
}

module.exports = getModulePaths;
