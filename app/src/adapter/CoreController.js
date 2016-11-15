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


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.init = function()
		{
			account.init();
		};

		this.notify = function(msg, args)
		{
			controller.notify(msg, args);
			// switch (msg)
			// {
			// 	case Account.InitComplete:
			// 	case Account.CreateStatus:
			// 	{
			// 		controller.notify(msg, args);
			// 		break;
			// 	}
            //
			// 	default:
			// 	{
			// 		dbg('Unknown msg: "' + msg + '"', args);
			// 		break;
			// 	}
			// }

			return null;
		};

		this.cmd = function(method, args)
		{
			switch (method)
			{
				case CoreController.AccountCreate:
				{
					account.create();
					break;
				}

				case CoreController.GenerateToken:
				{
					account.generateToken();
					break;
				}

				case CoreController.SetUserName:
				{
					account.setName(args);
					break;
				}

				case CoreController.SetUserAvatar:
				{
					account.setAvatar(args);
					break;
				}

				case CoreController.GetUserInfo:
				{
					account.getUserInfo();
					break;
				}
			}
		};


		///////////////////////////////////////////////////////////////////////////////
		// UTILITY
		///////////////////////////////////////////////////////////////////////////////

	}

	CoreController.AccountCreate = 'accountCreate';
	CoreController.GenerateToken = 'generateToken';
	CoreController.GetUserInfo = 'getUserInfo';
	CoreController.SetUserName = 'setUserName';
	CoreController.SetUserAvatar = 'setUserAvatar';

	module.exports = CoreController;
});
