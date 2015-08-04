/*eslint-disable */
/* jscs:disable */
define("oasis/webworker_adapter",
  ["oasis/util","oasis/shims","rsvp","oasis/logger","oasis/base_adapter"],
  function(__dependency1__, __dependency2__, RSVP, Logger, BaseAdapter) {
    "use strict";
    var assert = __dependency1__.assert;
    var extend = __dependency1__.extend;
    var a_forEach = __dependency2__.a_forEach;
    var addEventListener = __dependency2__.addEventListener;
    var removeEventListener = __dependency2__.removeEventListener;
    /*global self, postMessage, importScripts, UUID */



    var WebworkerAdapter = extend(BaseAdapter, {
      type: 'js',

      //-------------------------------------------------------------------------
      // Environment API

      initializeSandbox: function(sandbox) {
        var worker = new Worker(sandbox.options.url);
        worker.name = sandbox.options.url + '?uuid=' + UUID.generate();
        sandbox.worker = worker;

        // Error handling inside the worker
        worker.errorHandler = function(event) {
          if(!event.data.sandboxException) {return;}

          sandbox.onerror( event.data.sandboxException );
        };
        addEventListener(worker, 'message', worker.errorHandler);

        sandbox._waitForLoadDeferred().resolve(new RSVP.Promise( function(resolve, reject) {
          worker.initializationHandler = function (event) {
            sandbox.oasis.configuration.eventCallback(function () {
              if( event.data !== sandbox.adapter.sandboxInitializedMessage ) {return;}
              removeEventListener(worker, 'message', worker.initializationHandler);

              Logger.log("worker sandbox initialized");
              resolve(sandbox);
            });
          };
          addEventListener(worker, 'message', worker.initializationHandler);
        }));

        worker.loadHandler = function (event) {
          sandbox.oasis.configuration.eventCallback(function () {
            if( event.data !== sandbox.adapter.oasisLoadedMessage ) {return;}
            removeEventListener(worker, 'message', worker.loadHandler);

            Logger.log("worker sandbox initialized");
            sandbox.createAndTransferCapabilities();
          });
        };
        addEventListener(worker, 'message', worker.loadHandler);
      },

      startSandbox: function(sandbox) { },

      terminateSandbox: function(sandbox) {
        var worker = sandbox.worker;

        removeEventListener(worker, 'message', worker.loadHandler);
        removeEventListener(worker, 'message', worker.initializationHandler);
        sandbox.worker.terminate();
      },

      connectPorts: function(sandbox, ports) {
        var rawPorts = ports.map(function(port) { return port.port; }),
            message = this.createInitializationMessage(sandbox);

        Worker.postMessage(sandbox.worker, message, rawPorts);
      },

      connectSandbox: function(oasis) {
        return BaseAdapter.prototype.connectSandbox.call(this, self, oasis);
      },

      //-------------------------------------------------------------------------
      // Sandbox API

      name: function(sandbox) {
        return sandbox.worker.name;
      },

      oasisLoaded: function() {
        postMessage(this.oasisLoadedMessage, []);
      },

      didConnect: function() {
        postMessage(this.sandboxInitializedMessage, []);
      }
    });


    return WebworkerAdapter;
  });
/* jscs:enable */
/*eslint-enable */
