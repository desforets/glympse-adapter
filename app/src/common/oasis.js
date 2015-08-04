/* jscs:disable */
define(function(require, exports, module)
{
	"use strict";
	
	require('rsvp');
	
	var __dependency1__ = require('oasis/util');
	var __dependency2__ = require('oasis/xhr');
	var __dependency3__ = require('oasis/connect');
	var RSVP = window.RSVP;//require('rsvp');
	var logger = require('oasis/logger');
	var Version = require('oasis/version');
	var OasisConfiguration = require('oasis/config');
	var Sandbox = require('oasis/sandbox');
	var autoInitializeSandbox = require('oasis/sandbox_init');
	var Events = require('oasis/events');
	var Service = require('oasis/service');
	var IframeAdapter = require('oasis/iframe_adapter');
	var WebworkerAdapter = require('oasis/webworker_adapter');
	var InlineAdapter = require('oasis/inline_adapter');
		
    var assert = __dependency1__.assert;
    var delegate = __dependency1__.delegate;
    var xhr = __dependency2__.xhr;
    var connect = __dependency3__.connect;
    var connectCapabilities = __dependency3__.connectCapabilities;
    var portFor = __dependency3__.portFor;



    function Oasis() {
      // Data structures used by Oasis when creating sandboxes
      this.packages = {};
      this.requestId = 0;
      this.oasisId = 'oasis' + (+new Date());

      this.consumers = {};
      this.services = [];

      // Data structures used when connecting to a parent sandbox
      this.ports = {};
      this.handlers = {};

      this.receivedPorts = false;

      this.configuration = new OasisConfiguration();
      this.events = new Events();

      this.didCreate();
    }

    Oasis.Version = Version;
    Oasis.Service = Oasis.Consumer = Service;
    Oasis.RSVP = RSVP;

    Oasis.reset = function () {
      Oasis.adapters = {
        iframe: new IframeAdapter(),
        webworker: new WebworkerAdapter(),
        inline: new InlineAdapter()
      };
    };

    Oasis.reset();

    Oasis.prototype = {
      logger: logger,
      log: function () {
        this.logger.log.apply(this.logger, arguments);
      },

      on: delegate('events', 'on'),
      off: delegate('events', 'off'),
      trigger: delegate('events', 'trigger'),

      didCreate: function() {},

      xhr: xhr,

      /**
        This is the entry point that allows the containing environment to create a
        child sandbox.

        Options:

        * `capabilities`: an array of registered services
        * `url`: a registered URL to a JavaScript file that will initialize the
          sandbox in the sandboxed environment
        * `adapter`: a reference to an adapter that will handle the lifecycle
          of the sandbox. Right now, there are iframe and web worker adapters.

        @param {Object} options
      */
      createSandbox: function (options) {
        return new Sandbox(this, options);
      },

      /**
        This registers a sandbox type inside of the containing environment so that
        it can be referenced by URL in `createSandbox`.

        Options:

        * `capabilities`: An array of service names that will be supplied when calling
          `createSandbox`
        * `url`: The URL of the JavaScript file that contains the sandbox code

        @param {Object} options
      */
      register: function (options) {
        assert(options.capabilities, "You are trying to register a package without any capabilities. Please provide a list of requested capabilities, or an empty array ([]).");

        this.packages[options.url] = options;
      },

      configure: function(name, value) { this.configuration[name] = value; },
      autoInitializeSandbox: autoInitializeSandbox,

      connect: connect,
      connectCapabilities: connectCapabilities,
      portFor: portFor
    };

    module.exports = Oasis;
  });
/* jscs:enable */
