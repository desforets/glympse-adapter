/*eslint-disable */
/* jscs:disable */
define(function (require, exports, module) {
	"use strict";
	var __dependency1__ = require("oasis/shims");
	var o_create = __dependency1__.o_create;
	var a_filter = __dependency1__.a_filter;

	function assert(assertion, string) {
		if (!assertion) {
			throw new Error(string);
		}
	}

	function noop() {
	}

	function mustImplement(className, name) {
		return function () {
			throw new Error("Subclasses of " + className + " must implement " + name);
		};
	}

	function extend(parent, object) {
		function OasisObject() {
			parent.apply(this, arguments);
			if (this.initialize) {
				this.initialize.apply(this, arguments);
			}
		}

		OasisObject.prototype = o_create(parent.prototype);

		for (var prop in object) {
			if (!object.hasOwnProperty(prop)) {
				continue;
			}
			OasisObject.prototype[prop] = object[prop];
		}

		return OasisObject;
	}

	function delegate(delegateeProperty, delegatedMethod) {
		return function () {
			var delegatee = this[delegateeProperty];
			return delegatee[delegatedMethod].apply(delegatee, arguments);
		};
	}

	function uniq() {
		var seen = {};
		return a_filter.call(this, function (item) {
			var _seen = !seen.hasOwnProperty(item);
			seen[item] = true;
			return _seen;
		});
	}

	function reverseMerge(a, b) {
		for (var prop in b) {
			if (!b.hasOwnProperty(prop)) {
				continue;
			}

			if (!(prop in a)) {
				a[prop] = b[prop];
			}
		}

		return a;
	}

	module.exports = {
		assert: assert,
		noop: noop,
		mustImplement: mustImplement,
		extend: extend,
		delegate: delegate,
		uniq: uniq,
		reverseMerge: reverseMerge
	}
});
/* jscs:enable */
/*eslint-enable */
