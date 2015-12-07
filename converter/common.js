var commonGround = require('common-ground');

function convertToCommonJS(src, dest, cb) {
	commonGround.convertDir(src, dest, cb);
}

module.exports = convertToCommonJS;
