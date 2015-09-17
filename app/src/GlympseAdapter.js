// App entry point
define(function(require, exports, module)
{
    'use strict';

	// Polyfills - external
	require('UUID');
	require('kamino');
	require('MessageChannel');

	// imports
	var lib = require('glympse-adapter/lib/utils');
	var Oasis = require('oasis');
	var Defines = require('glympse-adapter/GlympseAdapterDefines');
	var VersionInfo = require('glympse-adapter/VersionInfo');
	var ViewerMonitor = require('glympse-adapter/adapter/ViewerMonitor');
	var CardsController = require('glympse-adapter/adapter/CardsController');
	var GlympseLoader = require('glympse-adapter/adapter/GlympseLoader');

	// consts
	var idOasisPort = 'glympse';
	var s = Defines.STATE;
	var m = Defines.MSG;
	var mStateUpdate = m.StateUpdate;	// Used alot


	// Faked AMD module setup -- necessary??
	if (!window.Oasis)
	{
		window.Oasis = Oasis;			// Needed for some Oasis modules
	}


	function GlympseAdapter(controller, cfg)
	{
		var cfgApp = cfg.app;
		var cfgAdapter = cfg.adapter;
		var cfgViewer = cfg.viewer;

		cfgAdapter.dbg = cfgApp.dbg;

		var dbg = lib.dbg('GlympseAdapter', cfgApp.dbg);

		var initialized = false;
		var viewerMonitor;
		var cardsController;
		var glympseLoader;
		var oasisLocal = new Oasis();	// Found in minified source

		var connectedOasis = false;
		var connectQueue = [];

		var invitesCard = [];
		var invitesGlympse = [];

		// data
		var cfgMonitor = { dbg: cfgApp.dbg };
		var progressCurrent = 0;
		var progressTotal = 0;
		var mapCardInvites = { };



		///////////////////////////////////////////////////////////////////////////////
		// API endpoint namespace (filled by run())
		///////////////////////////////////////////////////////////////////////////////

		this.map = {};
		this.cards = {};
		this.ext = {};


		///////////////////////////////////////////////////////////////////////////////
		// PROPERTIES
		///////////////////////////////////////////////////////////////////////////////

		this.getViewer = function()
		{
			return (viewerMonitor && viewerMonitor.getViewer());
		};


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.run = function(newViewer)
		{
			if (initialized)
			{
				return;
			}

			initialized = true;
			oasisLocal.autoInitializeSandbox();	// Found in minified source
			//oasisLocal.configure('allowSameOrigin', true);

			cfgMonitor.viewer = newViewer[0];
			viewerMonitor = new ViewerMonitor(this, cfgMonitor);
			cardsController = new CardsController(this, cfgAdapter);

			var id, action;
			var cfgClient = { consumers: { } };
			var events = { setUserInfo: setUserInfo };
			var intInterfaces = { map: { getInviteProperties: getInviteProperties
									   , getInviteProperty: getInviteProperty
									   }
								, cards: {}
								};

			// Link viewer to card data center
			cfgViewer.services = cfgAdapter.svcGlympse;
			//console.log('adapter svcs: ' + cfgAdapter.svcGlympse);

			var connectSettings = { invite: ((cfgViewer.t) ? cfgViewer.t.split(',')[0] : '???')
								 // apiMap: [ idApi0, idApi1, ... ]
								 // apiCards: [ idApi0, idApi1, ... ]
								 // apiExternal: [ idApi0, ... ]
								  };

			// API namespaced endpoints
			var svcs = [ { id: 'MAP', targ: viewerMonitor },//, action: generateMapAction, request: processMap },
						 { id: 'CARDS', targ: cardsController}//, action: generateCardsAction, request: processCards }
					   ];

			var requests = { ext: processExternal };

			// Defines.*.REQUESTS specifies the various API endpoints
			// to expose to both local and host consumers
			for (var i = 0, len = svcs.length; i < len; i++)
			{
				var aid = svcs[i];
				var idApi = aid.id.toLowerCase();
				var listApis = [];

				requests[idApi] = generateRequestAction(aid.targ);//aid.request;

				// Generate public APIs from static internal interfaces
				var targ = intInterfaces[idApi];
				for (id in targ)
				{
					this[idApi][id] = targ[id];
					listApis.push(id);
				}

				// Generic "action" APIs to pass along to hosted object
				targ = Defines[aid.id].REQUESTS;
				for (id in targ)
				{
					action = generateTargAction(aid.targ, id);//aid.action(id);
					this[idApi][id] = action;
					listApis.push(id);
				}

				// Add local-only requests, err, locally
				targ = Defines[aid.id].REQUESTS_LOCAL;
				for (id in targ)
				{
					action = generateTargAction(aid.targ, id);//aid.action(id);
					this[idApi][id] = action;
				}

				connectSettings[idApi] = listApis;
			}

			// Add user-defined interfaces, if specified
			var customInterfaces = cfgAdapter.interfaces;
			if (customInterfaces)
			{
				var extInterfaces = [];
				for (id in customInterfaces)
				{
					extInterfaces.push(id);
					this.ext[id] = customInterfaces[id];
				}

				connectSettings.ext = extInterfaces;
			}

			connectQueue.push({ id: 'Connected', val: connectSettings });

			// DEBUG
			//for (id in this.map)
			//{
			//	console.log('Available public interface: ' + id);
			//}

			cfgClient.consumers[idOasisPort] = Oasis.Consumer.extend(
			{
				initialize: oasisInitialize,
				events: events,
				requests: requests
			});

			oasisLocal.connect(cfgClient);

			var card = cfgAdapter.card;
			var t = cfgAdapter.t;
			var pg = cfgAdapter.pg;
			var twt = cfgAdapter.twt;
			var g = cfgAdapter.g;
			var cleanInvites = lib.cleanInvites;

			invitesCard = (card) ? cleanInvites([ card ]) : [];
			invitesGlympse = cleanInvites(splitMulti(t));
			t = invitesGlympse.join(';');

			progressCurrent = 0;
			progressTotal = (card) ? (5 + 1 * 2) : 3;
			sendEvent(m.AdapterInit, { isCard: (card != null)
											, t: invitesGlympse
											, pg: splitMulti(pg)
											, twt: splitMulti(twt)
											, g: splitMulti(g)
											});
			updateProgress();

			// Card vs Glympse Invite loading
			if (card)
			{
				cardsController.init(invitesCard);
			}
			else if (lib.simplifyInvite(t).indexOf('demobot') < 0)
			{
				glympseLoader = new GlympseLoader(this, cfgAdapter);
				glympseLoader.init(t);	// FIXME: Assumes only one invite code!
			}
			else if (t || pg || g || twt)
			{
				// Straight glympse invites/references to load
				cfgViewer.t = t;
				cfgViewer.pg = pg;
				cfgViewer.twt = twt;
				cfgViewer.g = g;

				this.loadViewer(cfgViewer);
			}
		};

		this.loadViewer = function(cfgNew)
		{
			// Signal the cards/invites to load
			sendEvent(m.AdapterReady, { cards: invitesCard
									  , glympses: invitesGlympse
									  });

			//console.log('cfg.viewer=' + cfgMonitor.viewer);
			$.extend(cfgViewer, cfgNew);
			viewerMonitor.run();
			$(cfgMonitor.viewer).glympser(cfgViewer);
		};

		this.notify = function(msg, args)
		{
			var idCard;

			switch (msg)
			{
				case m.CardInit:
				case m.CardReady:
				case m.CardsInitStart:
				case m.InviteInit:
				case m.ViewerInit:
				case m.ViewerReady:
				{
					updateProgress();
					sendEvent(msg, args);
					break;
				}

				case m.CardsInitEnd:
				{
					sendEvent(msg, args);
					invitesGlympse = [];

					for (var i = 0, cards = args, len = cards.length; i < len; i++)
					{
						var card = cards[i];
						idCard = card.getIdCard();

						if (!card.isLoaded())
						{
							console.log('Error loading card "' + idCard + '"');
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
						this.loadViewer(cfgViewer);
					}

					break;
				}

				case m.InviteError:
				{
					dbg('Invite loading error', args.getError());
					sendEvent(msg, args);
					break;
				}

				case m.InviteReady:
				{
					//dbg('InviteReady: ' + args.getIdInvite() + ' -- isLoaded=' + args.isLoaded());
					sendEvent(msg, args);
					if (!args.isLoaded())
					{
						dbg('Invite error state', args.getError());
						return null;
					}

					idCard = args.getReference();
					//dbg('Has reference: "' + idCard + '"');
					if (idCard)
					{
						if (invitesCard.indexOf(idCard) < 0)
						{
							progressTotal += (5 + 1 * 2) - 2;
							invitesCard.push(idCard);
							sendEvent(m.AdapterInit, { isCard: true });
							updateProgress();
							cardsController.init(invitesCard);
						}
					}
					else
					{
						// Use the original invite list
						progressTotal += (3 - 1);
						updateProgress();
						cfgViewer.t = args.getIdInvite();	// FIXME: Breaks for multiple initial invites

						this.loadViewer(cfgViewer);
					}

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

				default:
				{
					dbg('notify(): unknown msg: "' + msg + '"', args);
					break;
				}
			}

			return null;
		};

		this.infoUpdate = function(id, invite, owner, t, val)
		{
			var args = { id: id, invite: invite, owner: owner, card: mapCardInvites[invite], t: t, val: val };

			//dbg('>>>>>> infoUpdate', id);
			notifyController(mStateUpdate, args, false);
			sendOasisMessage(mStateUpdate, args);
		};


		///////////////////////////////////////////////////////////////////////////////
		// INTERNAL
		///////////////////////////////////////////////////////////////////////////////

		function splitMulti(val)
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

		function processExternal(args)
		{
			console.log('processExternal: ' + JSON.stringify(args));
		}

		function notifyController(msg, args, evtMsg)
		{
			if ((!evtMsg && cfgAdapter.hideUpdates) || (evtMsg && cfgAdapter.hideEvents))
			{
				return;
			}

			controller.notify(msg, args);
		}

		function updateProgress()
		{
			sendEvent(m.Progress, { curr: Math.min(++progressCurrent, progressTotal)
								  , total: progressTotal
								  });
		}

		function sendEvent(msg, args)
		{
			sendOasisMessage(msg, args);
			notifyController(msg, args, true);
		}


		///////////////////////////////////////////////////////////////////////////////
		// OASIS HANDLERS
		///////////////////////////////////////////////////////////////////////////////

		// Once the port is initialized, send along the "Connect" command to the host
		function oasisInitialize(port, name)
		{
			dbg('**** Consumer Init **** q=' + connectQueue.length);
			connectedOasis = true;
			for (var i = 0, len = connectQueue.length; i < len; i++)
			{
				var q = connectQueue[i];
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
				oasisLocal.consumers[idOasisPort].send(id, val);
			}
			else
			{
				connectQueue.push({ id: id, val: val });
			}
		}


		///////////////////////////////////////////////////////////////////////////////
		// HOST EVENT HANDLERS
		///////////////////////////////////////////////////////////////////////////////

		function setUserInfo(data)
		{
			dbg('setUserInfo', data);
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
	}


	// Global namespace registration
	if (!window.glympse)
	{
		window.glympse = {};
	}

	if (!window.glympse.GlympseAdapter)
	{
		window.glympse.GlympseAdapter = GlympseAdapter;
	}

	module.exports = GlympseAdapter;
});
