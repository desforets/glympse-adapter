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
		var pollInterval = cfg.pollCards || 60000;

		// state
		var that = this;
		var cardInvites;
		var cards;
		var cardsIndex;
		var cardsReady = 0;
		var initialized = false;
		var authToken = cfg.authToken;


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.init = function(cardsInvitesToLoad)
		{
			cards = [];
			cardsIndex = {};
			cardInvites = cardsInvitesToLoad || [];

			cardsReady = (cardInvites) ? cardInvites.length : 0;
			initialized = true;

			controller.notify(m.CardsInitStart, cardInvites);

			if (authToken)
			{
				accountInitComplete();
			}
		};


		this.notify = function(msg, args)
		{
			switch (msg)
			{
				case Account.InitComplete:
				{
					authToken = args.token;
					accountInitComplete(args);
					break;
				}

				case m.CardInit:
				case m.CardReady:
				{
					controller.notify(msg, args);
					if (msg === m.CardReady)
					{
						var card = cardsIndex[args];
						if (cards.indexOf(card) === -1) {
							cards.push(card);
							controller.notify(m.CardAdded, card);
						}
						if (--cardsReady === 0)
						{
							controller.notify(m.CardsInitEnd, cards);
						}
					}

					break;
				}

				case m.CardMemberInviteAdded:
				case m.CardMemberInviteRemoved:
					controller.notify(msg, args);
					break;

				default:
				{
					dbg('Unknown msg: "' + msg + '"', args);
					break;
				}
			}

			return null;
		};

		this.getCards = getCards;


		///////////////////////////////////////////////////////////////////////////////
		// UTILITY
		///////////////////////////////////////////////////////////////////////////////

		function accountInitComplete(args)
		{
			var sig = '[accountInitComplete] - ';

			if (!initialized)
			{
				dbg(sig + 'not initialized', args);
				return;
			}

			if (!authToken)
			{
				dbg(sig + 'authToken unavailable', args);
				return;
			}

			//dbg('Auth token: ' + account.getToken() + ' -- ' + (info && info.token));
			dbg(sig + '[' + ((cfg.isAnon) ? 'ANON' : 'ACCT') + '] Authenticated. Loading ' + cardInvites.length + ' cards...');

			// Now load card(s)
			for (var i = 0, len = cardInvites.length; i < len; i++)
			{
				loadCard(cardInvites[i]);
			}

			if (!cardInvites.length)
			{
				controller.notify(m.CardsInitEnd, []);
			}

			getCards();
			setInterval(getCards, pollInterval);
		}

		function loadCard(cardInvite) {
			var card = new Card(that, cardInvite, authToken, cfg);
			if (card.init())
			{
				cardsIndex[cardInvite] = card;
			}
			else
			{
				dbg('Error starting card: ' + cardInvite);
			}
		}

		function getCards() {
			var svr = (cfg.svcCards || '//api.cards.sandbox.glympse.com/api/v1/');
			$.ajax(
				{
					type: 'GET',
					dataType: 'JSON',
					beforeSend: function (request) {
						request.setRequestHeader('Authorization', 'Bearer ' + account.getToken());
					},
					url: svr + 'cards',
					processData: true
				})
				.done(function (data) {
					processCardsData(data);
				})
				.fail(function () {
					processCardsData();
				});
		}

		function processCardsData(resp) {
			if (resp && resp.response && resp.result === 'ok') {
				var i, card, len, cardId, allCardIds = [];
				for (i = 0, len = resp.response.length; i < len; i++) {
					card = resp.response[i];
					allCardIds.push(card.id);
					if (cardInvites.indexOf(card.id) === -1) {
						cardInvites.push(card.id);
						loadCard(card.id);
					}
				}
				for (i = 0, len = cardInvites.length; i < len; i++) {
					cardId = cardInvites[i];
					if (allCardIds.indexOf(cardId) === -1) {
						cardInvites.splice(i, 1);
						card = cardsIndex[cardId];
						cards.splice(cards.indexOf(card), 1);
						card.destroy();
						delete cardsIndex[cardId];
						controller.notify(m.CardRemoved, card);
					}
				}
			} else {
				dbg('failed to load cards');
			}
		}
	}


	module.exports = CardsController;
});
