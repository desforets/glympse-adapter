var commonjs = require("./common");
var globalVars = require("./global-vars");

var args = process.argv.slice(2);

var path = require("path");

var src = "../app";

commonjs(path.join(src, 'src'), './cjs', function (error) {
	if (args.indexOf('global') > -1) {
		globalVars();
	}
});

