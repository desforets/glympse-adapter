/*eslint-disable */
/* jscs:disable */
define(function (require, exports, module) {
	"use strict";
	var __dependency1__ = require("oasis/util"),
		__dependency2__ = require("oasis/shims"),
		__dependency3__ = require("oasis/connect"),
		__dependency4__ = require("oasis/message_channel"),
		RSVP = require("rsvp"),
		Logger = require("oasis/logger");
	var mustImplement = __dependency1__.mustImplement;
	var addEventListener = __dependency2__.addEventListener;
	var removeEventListener = __dependency2__.removeEventListener;
	var a_indexOf = __dependency2__.a_indexOf;
	var a_filter = __dependency2__.a_filter;
	var connectCapabilities = __dependency3__.connectCapabilities;
	var PostMessageMessageChannel = __dependency4__.PostMessageMessageChannel;


	function BaseAdapter() {
		this._unsupportedCapabilities = [];
	}

	BaseAdapter.prototype = {
		initializeSandbox: mustImplement('BaseAdapter', 'initializeSandbox'),
		name: mustImplement('BaseAdapter', 'name'),

		unsupportedCapabilities: function () {
			return this._unsupportedCapabilities;
		},

		addUnsupportedCapability: function (capability) {
			this._unsupportedCapabilities.push(capability);
		},

		filterCapabilities: function (capabilities) {
			var unsupported = this._unsupportedCapabilities;
			return a_filter.call(capabilities, function (capability) {
				var index = a_indexOf.call(unsupported, capability);
				return index === -1;
			});
		},

		createChannel: function (oasis) {
			var channel = new PostMessageMessageChannel(oasis);
			channel.port1.start();
			return channel;
		},

		environmentPort: function (sandbox, channel) {
			return channel.port1;
		},

		sandboxPort: function (sandbox, channel) {
			return channel.port2;
		},

		proxyPort: function (sandbox, port) {
			return port;
		},

		connectSandbox: function (receiver, oasis) {
			var adapter = this;

			Logger.log("Sandbox listening for initialization message");

			function initializeOasisSandbox(event) {
				if (!event.data.isOasisInitialization) {
					return;
				}

				removeEventListener(receiver, 'message', initializeOasisSandbox);
				adapter.initializeOasisSandbox(event, oasis);
			}

			addEventListener(receiver, 'message', initializeOasisSandbox);

			adapter.oasisLoaded(oasis);
		},

		initializeOasisSandbox: function (event, oasis) {
			var adapter = this;
			oasis.configuration.eventCallback(function () {
				Logger.log("sandbox: received initialization message.");

				oasis.connectCapabilities(event.data.capabilities, event.ports);

				adapter.didConnect(oasis);
			});
		},

		createInitializationMessage: function (sandbox) {
			return {
				isOasisInitialization: true,
				capabilities: sandbox._capabilitiesToConnect,
			};
		},

		oasisLoadedMessage: "oasisSandboxLoaded",
		sandboxInitializedMessage: "oasisSandboxInitialized"
	};


	module.exports = BaseAdapter;
});
/* jscs:enable */
/*eslint-enable */
