/*eslint-disable */
/* jscs:disable */
define(function (require, exports, module) {
	"use strict";
	var __dependency1__ = require("oasis/util"),
		RSVP = require("rsvp");
	var noop = __dependency1__.noop;
	/*global XDomainRequest */


	var a_slice = Array.prototype.slice;

	function acceptsHeader(options) {
		var dataType = options.dataType;

		if (dataType && accepts[dataType]) {
			return accepts[dataType];
		}

		return accepts['*'];
	}

	function xhrSetRequestHeader(xhr, options) {
		xhr.setRequestHeader("Accepts", acceptsHeader(options));
	}

	function xhrGetLoadStatus(xhr) {
		return xhr.status;
	}

	function xdrGetLoadStatus() {
		return 200;
	}

	var NONE = {};

	function trigger(event, oasis) {
		if (!oasis) {
			return;
		}

		var args = a_slice.call(arguments, 2);

		args.unshift(event);
		oasis.trigger.apply(oasis, args);
	}

	var accepts = {
		"*": "*/*",
		text: "text/plain",
		html: "text/html",
		xml: "application/xml, text/xml",
		json: "application/json, text/javascript"
	};

	var XHR, setRequestHeader, getLoadStatus, send;

	try {
		if ('withCredentials' in new XMLHttpRequest()) {
			XHR = XMLHttpRequest;
			setRequestHeader = xhrSetRequestHeader;
			getLoadStatus = xhrGetLoadStatus;
		} else if (typeof XDomainRequest !== 'undefined') {
			XHR = XDomainRequest;
			setRequestHeader = noop;
			getLoadStatus = xdrGetLoadStatus;
		}
	} catch (exception) {
		if (typeof XDomainRequest !== 'undefined') {
			XHR = XDomainRequest;
			setRequestHeader = noop;
			getLoadStatus = xdrGetLoadStatus;
		}
	}
	// else inline adapter with cross-domain cards is not going to work


	function xhr(url, options, oasis) {
		if (!oasis && this instanceof Oasis) {
			oasis = this;
		}
		if (!options) {
			options = NONE;
		}

		return new RSVP.Promise(function (resolve, reject) {
			var xhr = new XHR();
			xhr.open("get", url, true);
			setRequestHeader(xhr, options);

			if (options.timeout) {
				xhr.timeout = options.timeout;
			}

			xhr.onload = function () {
				trigger('xhr.load', oasis, url, options, xhr);

				var status = getLoadStatus(xhr);
				if (status >= 200 && status < 300) {
					resolve(xhr.responseText);
				} else {
					reject(xhr);
				}
			};

			xhr.onprogress = noop;
			xhr.ontimeout = function () {
				trigger('xhr.timeout', oasis, url, options, xhr);
				reject(xhr);
			};

			xhr.onerror = function () {
				trigger('xhr.error', oasis, url, options, xhr);
				reject(xhr);
			};

			trigger('xhr.send', oasis, url, options, xhr);
			xhr.send();
		});
	}

	module.exports = {
		xhr: xhr
	};
});
/* jscs:enable */
/*eslint-enable */
