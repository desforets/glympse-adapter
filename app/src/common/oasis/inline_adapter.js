/*eslint-disable */
/* jscs:disable */
define("oasis/inline_adapter",
  ["oasis/util","oasis/config","oasis/shims","oasis/xhr","rsvp","oasis/logger","oasis/base_adapter"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, RSVP, Logger, BaseAdapter) {
    "use strict";
    var assert = __dependency1__.assert;
    var extend = __dependency1__.extend;
    var noop = __dependency1__.noop;
    var configuration = __dependency2__.configuration;
    var a_forEach = __dependency3__.a_forEach;
    var a_map = __dependency3__.a_map;
    var xhr = __dependency4__.xhr;
    /*global self, postMessage, importScripts */



    var InlineAdapter = extend(BaseAdapter, {
      //-------------------------------------------------------------------------
      // Environment API

      initializeSandbox: function(sandbox) {
        sandbox.el = document.createElement('div');

        var oasis = sandbox.sandboxedOasis = new Oasis();
        sandbox.sandboxedOasis.sandbox = sandbox;
        RSVP.async(function () {
          sandbox.createAndTransferCapabilities();
        });
      },
 
      startSandbox: function(sandbox) {
        var body = document.body || document.documentElement.getElementsByTagName('body')[0];
        body.appendChild(sandbox.el);
      },

      terminateSandbox: function(sandbox) {
        var el = sandbox.el;

        if (el.parentNode) {
          Logger.log("Terminating sandbox ", sandbox.el.name);
          el.parentNode.removeChild(el);
        }

        sandbox.el = null;
      },

      connectPorts: function(sandbox, ports) {
        var rawPorts = a_map.call(ports, function(oasisPort){ return oasisPort.port; }),
            message = this.createInitializationMessage(sandbox),
            event = { data: message, ports: rawPorts };

        // Normally `connectSandbox` is called in autoinitialization, but there
        // isn't a real sandbox here.
        this.connectSandbox(sandbox.sandboxedOasis, event);
      },

      fetchResource: function (url, oasis) {
        var adapter = this;

        return xhr(url, {
          dataType: 'text'
        }, oasis).then(function (code) {
          return adapter.wrapResource(code);
        })['catch'](RSVP.rethrow);
      },

      wrapResource: function (code) {
        return new Function("oasis", code);
      },

      //-------------------------------------------------------------------------
      // Sandbox API

      connectSandbox: function(oasis, pseudoEvent) {
        return this.initializeOasisSandbox(pseudoEvent, oasis);
      },

      oasisLoaded: noop,

      didConnect: function(oasis) {
        var adapter = this;

        return oasis.sandbox._waitForLoadDeferred().resolve(loadSandboxJS()['catch'](RSVP.rethrow));

        function applySandboxJS(sandboxFn) {
          Logger.log("sandbox: inline sandbox initialized");
          sandboxFn(oasis);
          return oasis.sandbox;
        }

        function loadSandboxJS() {
          return new RSVP.Promise(function (resolve, reject) {
            resolve(adapter.fetchResource(oasis.sandbox.options.url, oasis).
              then(applySandboxJS));
          });
        }
      },
    });


    return InlineAdapter;
  });
/* jscs:enable */
/*eslint-enable */
