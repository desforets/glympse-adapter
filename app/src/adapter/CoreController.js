define(function(require, exports, module)
{
    'use strict';

	// defines
	var lib = require('glympse-adapter/lib/utils');
	var Defines = require('glympse-adapter/GlympseAdapterDefines');

	var m = Defines.MSG;
	var rl = Defines.CORE.REQUESTS_LOCAL;

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
			switch (msg)
			{
				case m.AccountInit:
				case m.AccountCreateStatus:
				case m.UserNameUpdateStatus:
				case m.UserAvatarUpdateStatus:
				case m.UserInfoStatus:
				case m.CreateRequestStatus:
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
				case rl.accountCreate:
				{
					account.create();
					break;
				}

				case CoreController.GenerateToken:
				{
					account.generateToken();
					break;
				}

				case rl.setUserName:
				{
					account.setName(args);
					break;
				}

				case rl.setUserAvatar:
				{
					account.setAvatar(args);
					break;
				}

				case rl.getUserInfo:
				{
					account.getUserInfo(args);
					break;
				}

				case rl.hasAccount:
				{
					return account.hasAccount();
				}

				case rl.createRequest:
				{
					return account.createRequest(args);
				}
			}
		};


		///////////////////////////////////////////////////////////////////////////////
		// UTILITY
		///////////////////////////////////////////////////////////////////////////////

	}

	CoreController.GenerateToken = 'generateToken';

	module.exports = CoreController;
});
