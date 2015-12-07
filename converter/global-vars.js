var path = require("path");
var through2 = require("through2");
var ncp = require("ncp");

function convert(src, dest) {
	function convertFile(file, jsString) {
		function filePathToObjectPath(filepath) {
			return 'global.glympse.modules' + '["' + filepath.split('/').join('"]["') + '"]';
		}

		//require() -> window.glympse.modules[...]
		//module.exports -> window.glympse.modules[fileRelativePath]
		var fileRelativePath = path.relative(src, file.name);
		var requirePath = path.join(path.dirname(fileRelativePath), path.basename(fileRelativePath, '.js'));
		var moduleExportsString = filePathToObjectPath(requirePath);

		jsString = jsString.replace('module.exports', moduleExportsString);

		var requireReqex = /require\(['|"](\S+)[\'|\"]\)/g;

		jsString = jsString.replace(requireReqex, function (match, p1) {
			return filePathToObjectPath(p1);
		});

		return jsString;
	}

	return new Promise(function (resolve, reject) {
		ncp(src, dest, {
			transform: function (read, write, file) {
				var i = 0;
				read.pipe(through2(function (chunk, enc, callback) {
					if (path.extname(file.name) === '.js') {
						chunk = convertFile(file, chunk.toString());
					}
					this.push(chunk);
					return callback();
				})).pipe(write);
			}
		}, function (err) {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});

}

function globalVars() {
	convert('./cjs', './global');
}

module.exports = globalVars;
