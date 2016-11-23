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
		//var svr = (cfg.svcGlympse || '//api.glympse.com/v2/');

		// state
		var that = this;
		var authToken = cfg.authToken;
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

			if (authToken)
			{
				accountInitComplete(authToken);
			}
		};


		this.notify = function(msg, args)
		{
			switch (msg)
			{
				case m.AccountLoginStatus:
				{
					authToken = args.token;
					accountInitComplete(args);
					break;
				}

				case m.AccountDeleteStatus:
				{
					authToken = null;
					if (invite)
					{
						invite.setToken(authToken);
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
					//var error = args.getError();

					// if (error && error.error === 'oauth_token')
					// {
					// 	if (error.error_detail.indexOf('expired') >= 0)
					// 	{
					// 		account.handleExpiredToken();
					// 	}
					// 	else
					// 	{
					// 		account.handleInvalidToken();
					// 	}
                    //
					// 	break;
					// }

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

			if (!authToken)
			{
				dbg(sig + 'authToken unavailable', info);
				return;
			}

			//dbg('Auth token: ' + account.getToken() + ' -- ' + (info && info.token));
			dbg(sig + '[' + ((cfg.isAnon) ? 'ANON' : 'ACCT') + '] Token active. Loading Glympse invite "' + idInvite + '"');

			if (invite)
			{
				invite.setToken(authToken);
			}
			else
			{
				invite = new GlympseInvite(that, idInvite, authToken, cfg);
			}

			invite.load();
		}
	}


	module.exports = GlympseLoader;
});
