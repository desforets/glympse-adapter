(function (global) {
	if(!global.glympse){
		global.glympse = {};
	}
	//function moduleExports(n,o){function r(n){var r=global.glympse,t=r,l=n.split("/");return l.forEach(function(n,r,l){t[n]||(t[n]=r<l.length-1?{}:o),t=t[n]}),r}var t="modules/";return r(t+n)}
	function moduleExports(objectString, value) {
		var prefix = 'modules/';
		function stringToObject(objectString) {
			var exportObject = global.glympse,
				currentStep = exportObject,
				steps = objectString.split('/');
			steps.forEach(function (step, index, array) {
				if(!currentStep[step]) {
					currentStep[step] = index < array.length-1 ? {} : value;
				}
				currentStep = currentStep[step];
			});
			return exportObject;
		}

		return stringToObject(prefix + objectString);
	}

	moduleExports('a/b/c/d', 123);
})(this);
