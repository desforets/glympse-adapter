// App entry point
define(function(require, exports, module)
{
	'use strict';

	// imports
	var lib = require('glympse-adapter/lib/utils');
	var Oasis = require('oasis');
	var Defines = require('glympse-adapter/GlympseAdapterDefines');
	var ViewerMonitor = require('glympse-adapter/adapter/ViewerMonitor');
	var CardsController = require('glympse-adapter/adapter/CardsController');
	var CoreController = require('glympse-adapter/adapter/CoreController');
	var GlympseLoader = require('glympse-adapter/adapter/GlympseLoader');
	var Account = require('glympse-adapter/adapter/models/Account');

	var s = Defines.STATE;
	var m = Defines.MSG;
	var mStateUpdate = m.StateUpdate;	// Used alot


	function Client(controller, oasisLocal, app, cfg, elementViewer)
	{
		var cfgApp = (cfg && cfg.app) || {};
		var cfgAdapter = (cfg && cfg.adapter) || {};
		var cfgViewer = (cfg && cfg.viewer) || {};

		var dbg = lib.dbg('Client', cfgApp.dbg);

		// state
		var that = this;
		var cardsController;
		var cfgMonitor = {dbg: cfgApp.dbg, viewer: elementViewer};
		var invitesCard;
		var invitesGlympse;
		var invitesReferences = {};
		var glympseLoader;
		var mapCardInvites = {};
		var cardsInitialized = false;
		var viewerMonitor;
		var coreController;
		var authToken;

		var progressCurrent = 0;
		var progressTotal = 0;

		var connectedOasis = false;
		var connectQueue = [];
		var port;
		var cardsMode = cfgAdapter.cardsMode;

		var initialized = false;

		cfgAdapter.dbg = cfgApp.dbg || cfgAdapter.dbg;
		cfgViewer.services = cfgAdapter.svcGlympse; // Link viewer to card data center


		///////////////////////////////////////////////////////////////////////////////
		// PROPERTIES
		///////////////////////////////////////////////////////////////////////////////

		// Disabled for now.. all through front-door.
		// Add to MAP.REQUESTS_LOCAL for additional client-only interfaces
		//this.getViewer = function()
		//{
		//	return viewerMonitor.getViewer();
		//};


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Set up the client portion of the adapter
		 * @param settings Object to advertise to any connecting adapter running in host-mode. This object is updated with all of the available interfaces/end-points.
		 */
		this.init = function(settings)
		{
			var card = cfgAdapter.card;
			var t = cfgAdapter.t;

			var cfgClient = {consumers: {}};
			var events = {};
			var requests = {};

			var cleanInvites = lib.cleanInvites;

			invitesCard = (card) ? cleanInvites([card]) : [];
			invitesGlympse = cleanInvites(splitMulti(t));

			events.setUserInfo = setUserInfo;	// Dummy/test

			$.extend(settings, {invitesCard: invitesCard, invitesGlympse: invitesGlympse});


			coreController = new CoreController(this, cfgAdapter);
			cardsController = new CardsController(this, cfgAdapter);
			viewerMonitor = new ViewerMonitor(this, cfgMonitor);

			// API namespaced endpoints
			var svcs = [
				{id: 'MAP', targ: viewerMonitor},
				{id: 'CARDS', targ: cardsController},
				{id: 'CORE', targ: coreController}
			];

			var intInterfaces = {map: {}, cards: {}, core: {}};

			// Local overrides
			// FIXME: This shouldn't go here
			intInterfaces.map[ViewerMonitor.GetInviteProperties] = getInviteProperties;
			intInterfaces.map[ViewerMonitor.GetInviteProperty] = getInviteProperty;

			// Defines.SVC_ID.REQUESTS specifies the various API endpoints
			// to expose to both client and host consumers:
			// Client APIs --> adapter_instance.SVC_ID.*()
			// Host calls --> interfaces.SVC_ID.*
			for (var i = 0, len = svcs.length; i < len; i++)
			{
				var id, aid = svcs[i];
				var idApi = aid.id.toLowerCase();
				var listApis = [];

				requests[idApi] = generateRequestAction(aid.targ);

				// Generate public APIs from static internal interfaces
				var targ = intInterfaces[idApi];
				for (id in targ)
				{
					listApis.push(id); // Advertised host availability
					controller[idApi][id] = targ[id]; // Local client access
				}

				// Generic "action" APIs to pass along to hosted object
				targ = Defines[aid.id].REQUESTS;
				for (id in targ)
				{
					listApis.push(id); // Advertised host availability
					controller[idApi][id] = generateTargAction(aid.targ, id);	// Local client access
				}

				// Add local-only requests, err, locally
				targ = Defines[aid.id].REQUESTS_LOCAL;
				for (id in targ)
				{
					controller[idApi][id] = generateTargAction(aid.targ, id);	// Local client access (only)
				}

				settings[idApi] = listApis;
			}

			// Add user-defined interfaces, if specified
			var customInterfaces = cfgAdapter.interfaces;
			if (customInterfaces)
			{
				requests.ext = function(data)
				{
					return customInterfaces[data.id](data.args);
				};

				var extInterfaces = [];
				for (id in customInterfaces)
				{
					extInterfaces.push(id);
					controller.ext[id] = customInterfaces[id];
				}

				settings.ext = extInterfaces;
			}

			connectQueue.push({id: 'Connected', val: settings});

			cfgClient.consumers[Defines.PORT] = Oasis.Consumer.extend(
				{
					initialize: oasisInitialize,
					events: events,		// send data/notification --> necessary?
					requests: requests	// request data
				});

			oasisLocal.connect(cfgClient);

			// Notify of invite loading status
			var initSettings = {
				isCard: (card != null || cardsMode)
				, t: invitesGlympse
				, pg: splitMulti(cfgAdapter.pg)
				, twt: splitMulti(cfgAdapter.twt)
				, g: splitMulti(cfgAdapter.g)
			};

			progressCurrent = 0;
			progressTotal = (invitesCard.length > 0) ? (5 + 1 * 2) :
				((invitesGlympse.length > 0) ? 3 : 0);

			sendEvent(m.AdapterInit, initSettings);
			updateProgress();

			// Start up CoreController first to get current/new auth token
			dbg('Init core..');
			coreController.init();
		};

		this.loadViewer = function(cfgNew, newMapElement)
		{
			loadMap(cfgNew, newMapElement);
		};

		this.infoUpdate = function(id, invite, owner, t, val)
		{
			var info = {
				id: id
				, invite: invite
				, owner: owner
				, card: mapCardInvites[invite]
				, t: t
				, val: val
			};

			notifyApp(mStateUpdate, info, false);
			sendOasisMessage(mStateUpdate, info);
		};

		this.notify = function(msg, args)
		{
			var idCard, card;

			switch (msg)
			{
				case m.CardInit:
				case m.CardReady:
				case m.CardsInitStart:
				case m.InviteInit:
				case m.ViewerInit:
				{
					updateProgress();
					sendEvent(msg, args);
					break;
				}

				case m.ViewerReady:
				{
					// Break ViewReady out to hand off viewer app reference for local
					// consumers only. Hosted consumers will only get a notification.
					updateProgress();
					sendOasisMessage(msg, true);
					notifyApp(msg, args, true);
					break;
				}

				case m.CardsInitEnd:
				{
					sendEvent(msg, args);
					invitesGlympse = [];
					cardsInitialized = true;

					for (var i = 0, cards = args, len = cards.length; i < len; i++)
					{
						card = cards[i];
						idCard = card.getIdCard();

						if (!card.isLoaded())
						{
							// If card failed to load properly, fallback to the
							// original Glympse invite to render last-known state
							var reference = invitesReferences[idCard];
							var idx = invitesCard.indexOf(idCard);
							console.log('Error loading card "' + idCard + '" ---> reference: ' + reference + ', idx=' + idx);
							if (reference)
							{
								invitesGlympse.push(reference);
							}

							if (idx >= 0)
							{
								invitesCard.splice(idx, 1);
							}

							continue;
						}

						var members = card.getMembers();
						//console.log('[' + i + ']: ' + card.getName() + ' with ' + members.length + ' members');
						for (var j = 0, mlen = members.length; j < mlen; j++)
						{
							var member = members[j];
							var invite = member.getTicket().getInviteCode();
							//console.log('  [' + j + ']: ' + invite);
							if (invite)
							{
								invitesGlympse.push(invite);
								mapCardInvites[invite] = idCard;
							}
						}
					}

					//dbg('Card map', mapCardInvites);
					// Real cards/invites to be loaded
					if (invitesGlympse.length > 0)
					{
						//console.log('---> Loading invites: ' + invitesGlympse);
						cfgViewer.t = invitesGlympse.join(';');
						loadMap(cfgViewer);
					}

					break;
				}

				case m.CardUpdated:
					// dbg('card updated', args);
					sendEvent(msg, args);
					break;

				case m.InviteError:
				{
					//dbg('Invite loading error', args);
					sendEvent(msg, args);
					break;
				}

				case m.InviteClicked:
				{
					//dbg('Invite clicked', args);
					sendEvent(msg, args);
					break;
				}

				case m.InviteReady:
				{
					if (!args.isLoaded())
					{
						var inviteError = args.getError();
						dbg('Invite error state', inviteError);

						// Refetch a new token on token errors. Account.InitComplete should
						// properly push the new token to controllers so they can continue.
						if (inviteError && inviteError.error === 'oauth_token')
						{
							coreController.cmd(CoreController.GenerateToken, true);
						}
						else
						{
							sendEvent(m.InviteError, args);
						}

						return null;
					}

					//dbg('InviteReady: ' + args.getIdInvite() + ' -- isLoaded=' + args.isLoaded());
					sendEvent(msg, args);

					idCard = args.getReference();
					//dbg('Has reference: "' + idCard + '"');
					if (idCard)
					{
						if (invitesCard.indexOf(idCard) < 0)
						{
							// Track back in case of expired card invite
							invitesReferences[idCard] = args.getIdInvite();

							progressTotal += (5 + 1 * 2) - 2;
							invitesCard.push(idCard);
							//sendEvent(m.AdapterInit, { isCard: true });
							updateProgress();
							//cardsController.init(invitesCard);
						}
					}
					else
					{
						// Use the original invite list
						progressTotal += (3 - 1);
						updateProgress();
						cfgViewer.t = args.getIdInvite();	// FIXME: Breaks for multiple initial invites

						loadMap(cfgViewer);
					}

					break;
				}

				case m.CardAdded:
				case m.CardRemoved:
				{
					sendEvent(msg, args);
					//dbg(msg, args);//(msg === m.DataUpdate) ? args : undefined);
					break;
				}

				case m.DataUpdate:
				case m.InviteAdded:
				case m.InviteRemoved:
				{
					args.card = mapCardInvites[args.id];
					sendEvent(msg, args);
					//dbg(msg, args);//(msg === m.DataUpdate) ? args : undefined);
					break;
				}

				case Account.InitComplete:
				{
					if (args.status)
					{
						authToken = args.token;
						cfgAdapter.authToken = authToken;
						cfgViewer.authToken = authToken;
						//dbg('Account.InitComplete', args);

						if (glympseLoader)
						{
							glympseLoader.notify(msg, args);
						}

						if (cardsController)
						{
							cardsController.notify(msg, args);
						}
					}

					sendEvent(m.AccountInit, args);

					if (!initialized && args.status)
					{
						initialized = true;
						loadInvites();
					}

					break;
				}

				case Account.CreateStatus:
				{
					sendEvent(m.AccountCreateStatus, args);
					break;
				}

				default:
				{
					dbg('notify(): unknown msg: "' + msg + '"', args);
					break;
				}
			}

			return null;
		};


		///////////////////////////////////////////////////////////////////////////////
		// EVENT HANDLERS
		///////////////////////////////////////////////////////////////////////////////

		function loadInvites()
		{
			// Various invite types handled by the map
			var t = cfgAdapter.t;		// Core invite
			var pg = cfgAdapter.pg;		// Core group (public)
			var twt = cfgAdapter.twt;	// Twitter user (@) query
			var g = cfgAdapter.g;		// Twitter topic (#) query

			// Card vs Glympse Invite loading
			if (invitesCard.length > 0 || cardsMode)
			{
				cardsController.init(invitesCard);
				return;
			}

			// Special handling to determine if a core invite has a card reference
			// GlympseLoader will perform the lookup to determine if indeed there
			// is a card invite to load instead of the presented core invite.
			// FIXME: Assumes only one invite code!
			if (lib.simplifyInvite(t).indexOf('demobot') < 0)
			{
				glympseLoader = new GlympseLoader(that, cfgAdapter);
				glympseLoader.init(t);
				return;
			}

			// Straight invite types to load
			if (t || pg || g || twt)
			{
				cfgViewer.t = t;
				cfgViewer.pg = pg;
				cfgViewer.twt = twt;
				cfgViewer.g = g;

				loadMap(cfgViewer);
			}
		}

		function loadMap(cfgNew, newMapElement)
		{
			dbg('loadMap!');
			// Signal the cards/invites to load
			sendEvent(m.AdapterReady, {cards: invitesCard, glympses: invitesGlympse});

			//console.log('cfg.viewer=' + cfgMonitor.viewer);
			$.extend(cfgViewer, cfgNew);

			if (newMapElement)
			{
				cfgMonitor.viewer = newMapElement;
			}

			if (cfgMonitor.viewer)
			{
				//FixMe: viewer can't be initialized w/o invite, so pass incorrect one for now
				cfgViewer.t = cfgViewer.t || 'incorrect';

				viewerMonitor.run();
				$(cfgMonitor.viewer).glympser(cfgViewer);
			}
		}


		///////////////////////////////////////////////////////////////////////////////
		// INTERNAL
		///////////////////////////////////////////////////////////////////////////////

		function splitMulti(val)
		{
			return (val && val.split(';'));
		}

		function joinMulti(val)
		{
			return (val && val.split(';'));
		}

		function generateTargAction(targ, id)
		{
			return function(data)
			{
				return (targ.cmd(id, data) || true);
			};
		}

		function generateRequestAction(targ)
		{
			return function(data)
			{
				return (targ.cmd(data.id, data.args) || true);
			};
		}

		function updateProgress()
		{
			sendEvent(m.Progress,
				{
					curr: Math.min(++progressCurrent, progressTotal)
					, total: progressTotal
				});
		}

		function notifyApp(msg, args, evtMsg)
		{
			if ((!evtMsg && cfgAdapter.hideUpdates) || (evtMsg && cfgAdapter.hideEvents))
			{
				return;
			}

			app.notify(msg, args);
		}

		function sendEvent(msg, args)
		{
			sendOasisMessage(msg, args);
			notifyApp(msg, args, true);
		}


		///////////////////////////////////////////////////////////////////////////////
		// CLIENT-MODE OASIS HANDLERS
		///////////////////////////////////////////////////////////////////////////////

		// Once the port is initialized, send along the "Connect" command to the host
		function oasisInitialize(newPort, name)
		{
			dbg('**** Consumer Init **** q=' + connectQueue.length);

			port = newPort;
			connectedOasis = true;

			for (var i = 0, len = connectQueue.length; i < len; i++)
			{
				var q = connectQueue[i];
				//dbg('Sending: ' + q.id);
				this.send(q.id, q.val);
			}

			connectQueue = [];

			var extInit = cfgAdapter.initialize;
			if (extInit)
			{
				extInit(name);
			}
		}

		function sendOasisMessage(id, val)
		{
			if (connectedOasis)
			{
				//dbg('send "' + id + '" ', val);
				port.send(id, (val && val.toJSON && val.toJSON()) || val);
			}
			else
			{
				connectQueue.push({id: id, val: val});
			}
		}


		///////////////////////////////////////////////////////////////////////////////
		// HOST REQUEST HANDLERS (MAP)
		///////////////////////////////////////////////////////////////////////////////

		function getInviteProperties(idInvite)
		{
			if (!viewerMonitor)
			{
				return 'NOT_INITIALIZED';
			}

			return viewerMonitor.getCurrentProperties(idInvite);
		}

		// cfgInvite = { idProperty: name_of_property_to_retrieve
		//			   , idInvite:   glympse_invite_id --> can be null if first invite is targetted
		//			   }
		function getInviteProperty(cfgInvite)
		{
			if (!viewerMonitor)
			{
				return 'NOT_INITIALIZED';
			}

			return viewerMonitor.getCurrentValue(cfgInvite.idProperty, cfgInvite.idInvite);
		}

		/*		function requestPing(str)
		 {
		 return new Oasis.RSVP.Promise(function(resolve, reject)
		 {
		 var delay = 100;
		 setTimeout(function()
		 {
		 resolve('PONG - ' + str + ' (delayed ' + delay + 'ms)');
		 }, delay);
		 });
		 }*/


		///////////////////////////////////////////////////////////////////////////////
		// HOST EVENT HANDLERS
		///////////////////////////////////////////////////////////////////////////////

		function setUserInfo(data)
		{
			dbg('setUserInfo', data);
		}
	}


	module.exports = Client;
});
