// App entry point
define(function(require, exports, module)
{
    'use strict';

	// Polyfills - external
	require('UUID');
	require('kamino');
	require('MessageChannel');

	// imports
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

		var viewerMonitor;
		var cardsController;
		var oasisLocal = new Oasis();	// Found in minified source

		var hasArrived = false;
		var isAbandoned = false;
		var phase = null;
		var connectedOasis = false;
		var connectQueue = [];

		// data
		var cfgMonitor = { };


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.run = function(newViewer)
		{
			oasisLocal.autoInitializeSandbox();	// Found in minified source
			//oasisLocal.configure('allowSameOrigin', true);

			var id;
			var cfgClient = { consumers: { } };
			var events = { setUserInfo: setUserInfo };
			var requests = { getValue: getValue };

			// Defines.REQUESTS specifies the endpoints to expose
			// to the host, along with default ones like getValue
			for (id in Defines.REQUESTS)
			{
				requests[id] = generateAction(id);
			}

			// Add user-defined interfaces, if specified
			var connectSettings = { invite: ((cfgViewer.t) ? cfgViewer.t.split(',')[0] : '???') };
			var customInterfaces = cfgAdapter.interfaces;
			if (customInterfaces)
			{
				var interfaces = [];
				for (id in customInterfaces)
				{
					// Keep default reference available if overriding
					if (requests[id])
					{
						requests['base_' + id] = requests[id];
					}
					else
					{
						interfaces.push(id);	// Only advertise unique custom interfaces
					}

					requests[id] = customInterfaces[id];
				}

				connectSettings.interfaces = interfaces;
			}

			connectQueue.push({ id: 'Connected', val: connectSettings });

			// Add local-only requests, err, locally
			for (id in Defines.REQUEST_LOCAL)
			{
				this[id] = generateAction(id);
			}

			// Make the interfaces also available locally, if not already available
			for (id in requests)
			{
				if (!this[id])
				{
					this[id] = requests[id];
				}
				else
				{
					console.log(id + ' already defined! Not adding locally...');
				}
			}

			// DEBUG
			//for (id in this)
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

			// Set up for app
			window.appGlympseAdapter = this;

			cardsController = new CardsController(this, cfgAdapter);
			cardsController.init(['3DNH-3793']);

			// Kick off viewer monitor
/*			cfgMonitor.viewer = newViewer[0];
			viewerMonitor = new ViewerMonitor(this, cfgMonitor);
			viewerMonitor.run();

			newViewer.glympser(cfgViewer);
*/		};

		this.notify = function(msg, args)
		{
			switch (msg)
			{
				case m.DataUpdate:
				case m.ViewerInit:
				case m.ViewerReady:
				{
					//dbg('VIEWER -- ' + msg + ' -- ' + this.getMap);
					//dbg('event: ' + msg + ' -- hide: ' + cfgAdapter.hideEvents);
					sendOasisMessage(msg, true);
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
			if (id === s.Phase)
			{
				phase = val;
				updateArrived();

				isAbandoned = false;
				if (val === 'abandoned')
				{
					isAbandoned = true;
					notifyController(mStateUpdate, { id: s.NoInvites, val: true }, false);
				}
			}
			else if (id === s.Eta)
			{
				updateArrived(val);
			}

			if (!isAbandoned || id === s.Phase)
			{
				var args = { id: id, val: val };
				notifyController(mStateUpdate, args, false);
				sendOasisMessage(mStateUpdate, args);
			}
		};


		///////////////////////////////////////////////////////////////////////////////
		// INTERNAL
		///////////////////////////////////////////////////////////////////////////////

		function dbg(msg, args)
		{
			console.log('[GlympseAdapter] ' + msg + ((args) ? (': ' + JSON.stringify(args)) : ''));
		}

		function generateAction(id)
		{
			return function(data)
			{
				return (viewerMonitor.cmd(id, data) || true);
			};
		}

		function updateArrived(eta)
		{
			var oldArrived = hasArrived;

			if (phase)
			{
				hasArrived = (phase === 'arrived');
			}
			//else if (eta != null)
			//{
			//	hasArrived = (eta <= 70);
			//}

			//dbg('old=' + oldArrived + ', has=' + hasArrived);
			if (oldArrived !== hasArrived)
			{
				var val = { id: s.Arrived, val: { hasArrived: hasArrived, t: Date.now() }};
				notifyController(mStateUpdate, val, false);
				sendOasisMessage(mStateUpdate, val);
			}
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
		// HOST REQUEST HANDLERS
		///////////////////////////////////////////////////////////////////////////////

		function getValue(id)
		{
			if (!viewerMonitor)
			{
				return 'NOT_INITIALIZED';
			}

			if (id === s.Arrived)
			{
				return hasArrived;
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
