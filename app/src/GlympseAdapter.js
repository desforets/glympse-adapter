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
	var ViewerMonitor = require('glympse-adapter/adapter/ViewerMonitor');
	var CardsController = require('glympse-adapter/adapter/CardsController');

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
		var cfgAdapter = cfg.adapter;
		var cfgViewer = cfg.viewer;

		var initialized = false;
		var viewerMonitor;
		var cardsController;
		var oasisLocal = new Oasis();	// Found in minified source

		var connectedOasis = false;
		var connectQueue = [];

		// data
		var cfgMonitor = { };


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
			var intInterfaces = { map: { getValue: getValue }
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

				// Static internal available APIs
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

			// Card vs Glympse Invite loading
			var card = cfgAdapter.card;
			if (card)
			{
				cardsController.init([ card ]);
			}
			else if (cfgAdapter.t || cfgAdapter.pg || cfgAdapter.g || cfgAdapter.twt)
			{
				cfgViewer.t = cfgAdapter.t;
				cfgViewer.pg = cfgAdapter.pg;
				cfgViewer.twt = cfgAdapter.twt;
				cfgViewer.g = cfgAdapter.g;

				this.loadViewer(cfgViewer);
			}
		};

		this.loadViewer = function(cfgNew)
		{
			//console.log('cfg.viewer=' + cfgMonitor.viewer);
			$.extend(cfgViewer, cfgNew);
			viewerMonitor.run();
			$(cfgMonitor.viewer).glympser(cfgViewer);
		};

		this.notify = function(msg, args)
		{
			switch (msg)
			{
				case m.DataUpdate:
				case m.ViewerInit:
				case m.ViewerReady:
				case m.CardsInitStart:
				case m.CardInit:
				case m.CardReady:
				case m.CardsInitEnd:
				{
					sendOasisMessage(msg, args);
					notifyController(msg, args, true);
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

		this.infoUpdate = function(id, val)
		{
			//console.log('>>>>>> id=' + id);
			var args = { id: id, val: val };
			notifyController(mStateUpdate, args, false);
			sendOasisMessage(mStateUpdate, args);
		};


		///////////////////////////////////////////////////////////////////////////////
		// INTERNAL
		///////////////////////////////////////////////////////////////////////////////

		function dbg(msg, args)
		{
			console.log('[GlympseAdapter] ' + msg + ((args) ? (': ' + JSON.stringify(args)) : ''));
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

		function getValue(id)
		{
			if (!viewerMonitor)
			{
				return 'NOT_INITIALIZED';
			}

			return viewerMonitor.getCurrentValue(id);
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
