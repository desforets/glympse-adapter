define(function(require, exports, module)
{
    'use strict';

	var lib = require('glympse-adapter/lib/utils');
	var Defines = require('glympse-adapter/GlympseAdapterDefines');
	var m = Defines.MSG;

	// Glympse-specific
	var Account = require('glympse-adapter/adapter/models/Account');
	var GlympseInvite = require('glympse-adapter/adapter/models/GlympseInvite');


	// Exported class
	function GlympseLoader(controller, cfg)
	{
		// consts
		var dbg = lib.dbg('GlympseLoader', cfg.dbg);

		// state
		var that = this;
		var account = cfg.account;
		var idInvite;
		var invite;
		var initialized = false;


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.init = function(inviteToLoad)
		{
			idInvite = inviteToLoad;
			initialized = true;

			if (account)
			{
				accountInitComplete(account);
			}
		};


		this.notify = function(msg, args)
		{
			switch (msg)
			{
				case m.AccountLoginStatus:
				{
					account = args.account;
					accountInitComplete(args);
					break;
				}

				case m.AccountDeleteStatus:
				{
					account = null;
					if (invite)
					{
						invite.setAccount(account);
					}
					break;
				}

				case m.InviteInit:
				{
					controller.notify(msg, args);
					break;
				}

				case m.InviteReady:
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


		///////////////////////////////////////////////////////////////////////////////
		// UTILITY
		///////////////////////////////////////////////////////////////////////////////

		function accountInitComplete(info)
		{
			var sig = '[accountInitComplete] - ';

			if (!initialized)
			{
				dbg(sig + 'not initialized', info);
				return;
			}

			if (!account)
			{
				dbg(sig + 'authToken unavailable', info);
				return;
			}

			//dbg('Auth token: ' + account.getToken() + ' -- ' + (info && info.token));
			dbg(sig + '[' + ((cfg.isAnon) ? 'ANON' : 'ACCT') + '] Token active. Loading Glympse invite "' + idInvite + '"');

			if (invite)
			{
				invite.setAccount(account);
			}
			else
			{
				invite = new GlympseInvite(that, idInvite, account, cfg);
			}

			if (!invite.isLoaded())
			{
				invite.load();
			}
		}
	}


	module.exports = GlympseLoader;
});
