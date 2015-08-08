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
		var that = this;
		var account = new Account(this, cfg);
		var cardInvites;
		var cards;
		var cardsReady = 0;


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.init = function(cardsInvitesToLoad)
		{
			cards = [];
			cardInvites = cardsInvitesToLoad;

			cardsReady = (cardInvites) ? cardInvites.length : 0;
			controller.notify(m.CardsInitStart, cardInvites);

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

				case m.CardInit:
				case m.CardReady:
				{
					controller.notify(msg, args);
					if (msg === m.CardReady)
					{
						if (--cardsReady === 0)
						{
							controller.notify(m.CardsInitEnd, cards);
						}
					}

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
			dbg('[' + ((cfg.anon) ? 'ANON' : 'ACCT') + '] Authenticated. Loading ' + cardInvites.length + ' cards...');

			// Now load card(s)
			for (var i = 0, len = cardInvites.length; i < len; i++)
			{
				var card = new Card(that, cardInvites[i], account.getToken(), cfg);
				if (!card.init())
				{
					dbg('Error starting card: ' + cardInvites[i]);
				}
				else
				{
					cards.push(card);
				}
			}
		}
	}


	module.exports = CardsController;
});
