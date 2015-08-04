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
	var Card = require('glympse-adapter/adapter/models/Card');


	// Exported class
	function CardsController(controller, cfg)
	{
		// consts
		var dbg = lib.dbg('CardsController', cfg.dbg);

		// state
		var account = new Account(this, cfg);
		var idCards;
		var cards;


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.init = function(cards)
		{
			idCards = cards;

			if (account.init())
			{
				accountInitComplete(true);
			}
		};


		this.notify = function(msg, args)
		{
			switch (msg)
			{
				case Account.InitComplete:
				{
					accountInitComplete(args.status, args);
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

		function accountInitComplete(status, info)
		{
			if (!status)
			{
				dbg('Error during Account.Init()', info);
				return;
			}

			//dbg('Auth token: ' + account.getToken() + ' -- ' + (info && info.token));
			dbg('Authenticated. Loading ' + idCards.length + ' cards...');

			// Now load card(s)
			for (var i = 0, len = idCards.length; i < len; i++)
			{
				var card = new Card(this, idCards[i], account.getToken(), cfg);
				if (!card.init())
				{
					dbg('Error starting card: ' + idCards[i]);
				}
			}
		}
	}


	module.exports = CardsController;
});
