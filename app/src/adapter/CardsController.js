define(function(require, exports, module)
{
	'use strict';

	// defines
	var lib = require('glympse-adapter/lib/utils');
	var Defines = require('glympse-adapter/GlympseAdapterDefines');

	var m = Defines.MSG;
	var r = Defines.CARDS.REQUESTS;
	var rl = Defines.CARDS.REQUESTS_LOCAL;
	var REQUEST_TYPES = Defines.CARDS.REQUEST_TYPES;

	// Cards-specific
	var Account = require('glympse-adapter/adapter/models/Account');
	var Card = require('glympse-adapter/adapter/models/Card');


	// Exported class
	function CardsController(controller, cfg)
	{
		// consts
		var dbg = lib.dbg('CardsController', cfg.dbg);
		var svr = (cfg.svcCards || '//api.cards.glympse.com/api/v1/');
		var pollInterval = cfg.pollCards || 60000;
		var cardsMode = cfg.cardsMode;

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
				case m.AccountInit:
				{
					authToken = args.token;
					accountInitComplete(args);
					break;
				}

				case m.CardInit:
				{
					controller.notify(msg, args);

					break;
				}

				case m.CardReady:
				{
					controller.notify(msg, args);

					var card = cardsIndex[args];
					if (cards.indexOf(card) === -1)
					{
						cards.push(card);
						controller.notify(m.CardAdded, card);
					}
					if (--cardsReady === 0)
					{
						controller.notify(m.CardsInitEnd, cards);
					}

					break;
				}

				case m.CardUpdated:
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

		this.cmd = function(cmd, args)
		{
			switch (cmd)
			{
				/**
				 * Force to request cards for the current user now.
				 */
				case r.requestCards:
					return requestCards();
				/**
				 * Returns currently loaded cards
				 */
				case rl.getCards:
					return cards;

				case rl.joinRequest:
					return joinRequest(args);
				default:
					dbg('method not found', cmd);
			}
		};


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

			if (cardsMode)
			{
				requestCards();
				setInterval(requestCards, pollInterval);
			}
		}

		function loadCard(cardInvite)
		{
			if (!cardsIndex[cardInvite])
			{
				cardsIndex[cardInvite] = new Card(that, cardInvite, cfg);
			}

			var card = cardsIndex[cardInvite];

			getCard(card);
		}

		//////////////////////
		// Cards API
		//////////////////////

		function requestCards()
		{
			$.ajax(
				{
					type: 'GET',
					dataType: 'JSON',
					beforeSend: function(request)
					{
						request.setRequestHeader('Authorization', 'Bearer ' + authToken);
					},
					url: svr + 'cards',
					processData: true
				})
				.done(function(data)
				{
					processCardsData(data);
				})
				.fail(function()
				{
					processCardsData();
				});
		}

		function processCardsData(resp)
		{
			if (resp && resp.response && resp.result === 'ok')
			{
				var i, card, len, cardId, allCardIds = [];
				// add new cards
				for (i = 0, len = resp.response.length; i < len; i++)
				{
					card = resp.response[i];
					allCardIds.push(card.id);
					if (cardInvites.indexOf(card.id) === -1)
					{
						cardInvites.push(card.id);
					}
				}
				// cleanup deleted cards
				for (i = 0, len = cardInvites.length; i < len; i++)
				{
					cardId = cardInvites[i];
					if (allCardIds.indexOf(cardId) === -1)
					{
						cardInvites.splice(i, 1);
						card = cardsIndex[cardId];
						cards.splice(cards.indexOf(card), 1);
						delete cardsIndex[cardId];
						controller.notify(m.CardRemoved, card);
					}
				}
				// refresh existing cards
				for (i = 0, len = cardInvites.length; i < len; i++)
				{
					loadCard(cardInvites[i]);
				}
			}
			else
			{
				dbg('failed to load cards');
			}
		}

		function getCard(card)
		{
			var idCard = card.getIdCard();

			controller.notify(m.CardInit, idCard);

			var cardUrl = (svr + 'cards/' + idCard);

			$.ajax(
				{
					type: 'GET',
					dataType: 'JSON',
					beforeSend: function(request)
					{
						request.setRequestHeader('Authorization', 'Bearer ' + authToken);
					},
					url: cardUrl,
					data: {members: true},
					processData: true
				})
				.done(function(data)
				{
					processCardData(card, data);
				})
				.fail(function()
				{
					processCardData(card, null);
				});
		}

		function processCardData(card, resp)
		{
			try
			{
				if (resp)
				{
					var idCard = card.getIdCard();

					if (resp.response && resp.result === 'ok')
					{
						//dbg('Got card data', resp);
						card.setData(resp.response);
						that.notify(m.CardReady, idCard);
					}
					else if (resp.meta && resp.meta.error)
					{
						// Invite is invalid or has been revoked, in
						// either case, we cannot continue loading this
						// card, so bail immediately
						if (resp.meta.error === 'failed_to_decode')
						{
							that.notify(m.CardReady, idCard);
						}
					}
				}
			}
			catch (e)
			{
				dbg('Error parsing card', e);
			}
		}

		function joinRequest(requestConfig)
		{
			// {
			// 	type: "${request_type}",
			// 	name: ${requestee_name},
			// 	address: ${requestee_address},
			// 	send: "${send_type}",
			// 	locale: "${locale}",
			// 	region: "${region}"
			// }
			var url = svr + 'cards/requests';

			if (!requestConfig.type ||
				(!requestConfig.address && requestConfig.type !== REQUEST_TYPES.CLIPBOARD && requestConfig.type !== REQUEST_TYPES.LINK))
			{
				dbg('Need to provide type (Defines.CARDS.REQUEST_TYPES: LINK, CLIPBOARD, SMS, EMAIL, ACCOUNT) ' +
					'and address (except LINK and CLIPBOARD types) to join a card');
				return;
			}
			requestConfig.send = requestConfig.send || 'server';

			$.ajax({
				url: url,
				method: 'POST',
				beforeSend: function(request)
				{
					request.setRequestHeader('Authorization', 'Bearer ' + authToken);
				},
				dataType: 'json',
				data: JSON.stringify(requestConfig),
				contentType: 'application/json'
			})
				.done(processRequest)
				.fail(processRequest);

			function processRequest(data)
			{
				var result = {
					status: false,
					response: data
				};
				if (data && data.response)
				{
					if (data.result === 'ok')
					{
						result.status = true;
						result.response = data.response;
					}
					else
					{
						result.response = data.meta;
					}
				}
				controller.notify(m.CardsJoinRequestStatus, result);
			}
		}
	}


	module.exports = CardsController;
});
