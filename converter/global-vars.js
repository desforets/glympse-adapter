var path = require("path");
var through2 = require("through2");
var ncp = require("ncp");

var frag = {
	start: '(function (global) {if(!global.glympse){global.glympse = {};}function moduleExports(n,o){function r(n){var r=global.glympse,t=r,l=n.split("/");return l.forEach(function(n,r,l){t[n]||(t[n]=r<l.length-1?{}:o),t=t[n]}),r}var t="modules/";return r(t+n)}',
	end: '})(this);'
};

function convert(src, dest) {
	function convertFile(file, jsString) {
		function filePathToObjectPath(filepath) {
			var steps = filepath.split('/');
			if(steps[0] === 'glympse-adapter'){
				steps = steps.slice(1);
			}
			return 'global.glympse.modules' + '["' + steps.join('"]["') + '"]';
		}

		//require() -> window.glympse.modules[...]
		//module.exports -> window.glympse.modules[fileRelativePath]
		var fileRelativePath = path.relative(src, file.name);
		var requirePath = path.join(path.dirname(fileRelativePath), path.basename(fileRelativePath, '.js'));

		jsString = jsString.replace(/module\.exports\s*=\s*(\w+);/g, 'moduleExports("' + requirePath + '", $1);');

		var requireReqex = /require\(['|"](\S+)[\'|\"]\)/g;

		jsString = jsString.replace(requireReqex, function (match, p1) {
			return filePathToObjectPath(p1);
		});

		return [frag.start, jsString, frag.end].join('\n');
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
