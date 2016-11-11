define(function(require, exports, module)
{
    'use strict';

	// defines
	var lib = require('glympse-adapter/lib/utils');
	var Defines = require('glympse-adapter/GlympseAdapterDefines');
	var m = Defines.MSG;
	var s = Defines.STATE;
	var r = Defines.REQUESTS;

	var Account = require('glympse-adapter/adapter/models/Account');

	// Exported class
	function CoreController(controller, cfg)
	{
		// consts
		var dbg = lib.dbg('CoreController', cfg.dbg);

		// state
		var account = new Account(this, cfg);

		if(account.init())
		{
			controller.notify(Account.InitComplete, { status: true, token: account.getToken() });
		}

		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.notify = function(msg, args)
		{
			switch (msg)
			{
				case Account.InitComplete:
				case Account.AccountCreateStatus:
				{
					controller.notify(msg, args);
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

		this.cmd = function(method, args)
		{
			switch (method)
			{
				case "accountCreate":
				{
					createAccount();
					break;
				}
			}
		};

		function createAccount()
		{
			account.create();
		}
	}


	module.exports = CoreController;
});
