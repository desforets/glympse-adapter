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
		var pollingInterval;
		var cardsMode = cfg.cardsMode;

		// state
		var that = this;
		var cardInvites;
		var cards;
		var cardsIndex;
		var cardsReady = 0;
		var initialized = false;
		var authToken = cfg.authToken;
		var accountId = cfg.accountId;


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
				case m.AccountLoginStatus:
				{
					authToken = args.token;
					accountId = args.id;
					accountInitComplete(args);
					break;
				}

				case m.AccountDeleteStatus:
				{
					accountDeleteComplete();
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
				case r.requestCards:
					return requestCards();

				case rl.getCards:
					return getCards();

				case r.request:
					return request(args);

				case r.removeMember:
					return removeMember(args);

				case r.joinRequest:
					return joinRequest(args);

				case r.joinRequestCancel:
					return joinRequestCancel(args);

				case r.getActiveJoinRequests:
					return getActiveJoinRequests();

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
				if (pollingInterval)
				{
					clearInterval(pollingInterval);
				}
				requestCards();
				pollingInterval = setInterval(requestCards, pollInterval);
			}
		}

		function accountDeleteComplete(){
			authToken = null;
			accountId = null;
			if (pollingInterval)
			{
				clearInterval(pollingInterval);
				pollingInterval = null;
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

		/**
		 * Requests cards for the current user.
		 */
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

			function processCardsData(resp)
			{
				var result = {
					status: false,
					response: resp
				};
				if (resp && resp.response)
				{
					if (resp.result === 'ok')
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
						// cleanup deleted cards (use while to allow deleting in the loop)
						i = cardInvites.length;
						while (i--)
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
						result.status = true;
						result.response = resp.response;
					}
					else
					{
						result.response = resp.meta;
					}
				}
				else
				{
					dbg('failed to load cards');
				}
				controller.notify(m.CardsRequestStatus, result);
			}

		}

		/**
		 * Returns currently loaded cards
		 */
		function getCards()
		{
			return cards;
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
					processCardData(data);
				})
				.fail(function()
				{
					processCardData(null);
				});

			function processCardData(resp)
			{
				try
				{
					if (resp)
					{
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
		}

		/**
		 * Request a card member / all card members to share its / their locations
		 *
		 * @param {Object} config Configuration
		 * @param {string} config.inviteCode Invite code generated by the app via adapter.core.createRequest($request_params)
		 * @param {string} config.cardId Card id to remove a member
		 * @param {string} config.memberList List of member ids. If no ids is given, all card members will receive this request.
		 */
		function request(config)
		{
			if (!config || !config.cardId || !config.inviteCode)
			{
				dbg('cardId & inviteCode config params must be passed', config, 3);
				return;
			}

			var url = svr + 'cards/' + config.cardId + '/request';

			var data = {
				invite_code: config.inviteCode,
				invitees: {}
			};

			if (config.memberList && config.memberList.length)
			{
				var members = [];
				for (var i = 0, len = config.memberList.length; i < len; i++)
				{
					members.push({member_id: config.memberList[i]});
				}
				data.invitees.type = 'list';
				data.invitees.list = members;
			}
			else
			{
				data.invitees.type = 'all';
			}

			$.ajax({
				url: url,
				method: 'POST',
				beforeSend: function(request)
				{
					request.setRequestHeader('Authorization', 'Bearer ' + authToken);
				},
				dataType: 'json',
				data: JSON.stringify(data),
				contentType: 'application/json'
			})
				.done(processResponse)
				.fail(processResponse);

			function processResponse(data)
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
				controller.notify(m.CardsLocationRequestStatus, result);
			}
		}

		/**
		 * Request to join a card
		 *
		 * @param {Object} requestConfig:
		 * {
		 *   type: "${request_type}",
		 *   name: ${requestee_name},
		 *   address: ${requestee_address},
		 *   send: "${send_type}",
		 *   locale: "${locale}",
		 *   region: "${region}"
		 * }
		 */
		function joinRequest(requestConfig)
		{
			var url = svr + 'cards/requests';

			if (!requestConfig.type ||
				(!requestConfig.address && requestConfig.type !== REQUEST_TYPES.CLIPBOARD && requestConfig.type !== REQUEST_TYPES.LINK))
			{
				dbg('Need to provide type (Defines.CARDS.REQUEST_TYPES: LINK, CLIPBOARD, SMS, EMAIL, ACCOUNT) ' +
					'and address (except LINK and CLIPBOARD types) to join a card', requestConfig, 3);
				return;
			}
			requestConfig.send = requestConfig.send || 'server';

			//Todo: This should be centralized as this call pattern will be identical for nearly all authenticated calls in the adapter.
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

		function joinRequestCancel(requestId)
		{
			var url = svr + 'cards/requests/' + requestId;

			$.ajax({
				url: url,
				method: 'DELETE',
				beforeSend: function(request)
				{
					request.setRequestHeader('Authorization', 'Bearer ' + authToken);
				},
				dataType: 'json',
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
						result.response = data.response || {};
						result.response.id = requestId;
					}
					else
					{
						result.response = data.meta;
					}
				}
				controller.notify(m.CardsJoinRequestCancelStatus, result);
			}
		}

		function getActiveJoinRequests()
		{
			var url = svr + 'cards/requests';

			$.ajax({
				url: url,
				method: 'GET',
				beforeSend: function(request)
				{
					request.setRequestHeader('Authorization', 'Bearer ' + authToken);
				},
				dataType: 'json',
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
						result.response = data.response || {};
					}
					else
					{
						result.response = data.meta;
					}
				}
				controller.notify(m.CardsActiveJoinRequestsStatus, result);
			}
		}

		/**
		 * Removes a member from a given card
		 *
		 * @param {Object} config Configuration
		 * @param {string} config.cardId Card id to remove a member
		 * @param {string} config.memberId Member id of the member to remove. If no memberId is given, the current user is removed.
		 */
		function removeMember(config)
		{
			if (!config || !config.cardId)
			{
				dbg('CardId param is mandatory!', config, 3);
				return;
			}

			var memberId = config.memberId;
			var card;
			if (!memberId)
			{
				card = cardsIndex[config.cardId];
				if (!card)
				{
					dbg('card not found for CardId=', config.cardId, 3);
					return;
				}
				var members = card.getMembers();
				for (var i = 0, len = members.length, member; i < len; i++)
				{
					member = members[i];
					if (member.getUserId() === accountId)
					{
						memberId = member.getId();
						break;
					}
				}
				if (!memberId)
				{
					dbg('current member not found for card=', card.toJSON(), 3);
					return;
				}
			}

			$.ajax({
				url: (svr + 'cards/' + config.cardId + '/members/' + memberId),
				method: 'DELETE',
				beforeSend: function(request)
				{
					request.setRequestHeader('Authorization', 'Bearer ' + authToken);
				},
				dataType: 'json',
				contentType: 'application/json'
			})
				.done(processResponse)
				.fail(processResponse);

			function processResponse(data)
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
						result.response = data.response || {};
						result.response.cardId = config.cardId;
						result.response.memberId = memberId;

						requestCards();
					}
					else
					{
						result.response = data.meta;
					}
				}
				controller.notify(m.CardRemoveMemberStatus, result);
			}
		}
	}


	module.exports = CardsController;
});
