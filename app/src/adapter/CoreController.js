define(function(require, exports, module)
{
    'use strict';

	// defines
	var lib = require('glympse-adapter/lib/utils');
	var Defines = require('glympse-adapter/GlympseAdapterDefines');
	var m = Defines.MSG;
	var s = Defines.STATE;
	var r = Defines.REQUESTS;

	// Cards-specific
	var Account = require('glympse-adapter/adapter/models/Account');


	// Exported class
	function CoreController(controller, cfg)
	{
		// consts
		var dbg = lib.dbg('CoreController', cfg.dbg);

		// state
		var that = this;
		var account = new Account(this, cfg);

		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.notify = function(msg, args)
		{
			switch (msg)
			{
				case Account.InitComplete:
				{
					controller.notify(m.LoggedIn, args);
					break;
				}

				default:
				{
					dbg('Unknown msg: "' + msg + '"', args);
					break;
				}
			}

			return null;
		};

		this.cmd = function(method, args) {
			switch (method){
				case "accountCreate":
					createAccount();
					break;
			}
		};

		function createAccount() {
			controller.notify(m.LoggedIn, []);
		}
	}


	module.exports = CoreController;
});
