// App entry point
define(function(require, exports, module)
{
    'use strict';

    // import dependencies
	var GlympseAdapter = require('glympse-adapter/GlympseAdapter');
	var AdapterDefines = require('glympse-adapter/GlympseAdapterDefines');
	var lib = require('glympse-adapter/lib/utils');

	// Test app-specific
	var ViewManager = require('ViewManager');
	var Defines = require('Defines');

	var c = Defines.CMD;
	var m = AdapterDefines.MSG;
	var _id = 'Main';


	function Main(vm, cfgCore)
	{
		// Main config for app setup
		var cfg = (cfgCore && cfgCore.app) || { };

		var adapter;
		var viewManager = vm;
		var cards;
		var invitesCard;
		var invitesGlympse;
		var that = this;
		var cntEta = 0;

		var dbg = lib.dbg(_id, cfg.dbg);


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.notify = function(msg, args)
		{
			switch (msg)
			{
				case m.AdapterReady:
				{
					invitesCard = args.cards;
					invitesGlympse = args.glympses;
					dbg('--> ADAPTER READY', args);
					break;
				}

				case m.ViewerReady:
				{
					dbg('----> VIEWER READY');
					viewManager.cmd(c.InitUi, { invitesCard: invitesCard
											  , invitesGlympse: invitesGlympse
											  , cards: cards
											  });
					break;
				}

				case m.CardsInitEnd:
				{
					cards = args;
					dbg('--> FINISHED CARDS LOAD! ' + cards.length + ' total cards');
					dbg('---> First card: "' + cards[0].getIdCard() + '" (' + cards[0].getId() + '), type=' + cards[0].getTypeId());
					break;
				}

				default:
				{
					return viewManager.cmd(msg, args);
				}
			}

			return null;
		};


		///////////////////////////////////////////////////////////////////////////////
		// UTILITY
		///////////////////////////////////////////////////////////////////////////////

		function adapterInit()
		{
			adapter = new GlympseAdapter(that, { dbg: false });
			cfg.adapter = adapter;	// Reference for general app usage

			// In this example, we'll capture all GA events
			var events = {};
			for (var id in AdapterDefines.MSG)
			{
				events[id] = (id === m.StateUpdate) ? stateUpdate
													: generateCallback(id);
			}

			var el = adapter.host({
				url: cfg.urlClient,
				initialize: clientInitialized,
				connect: clientConnected,
				events: events
			});

			viewManager.cmd(c.SetAdapterUi, el);
		}

		function clientInitialized(name)
		{
			viewManager.cmd(c.LogEvent, { id: ('** INITIALIZED (' + name + ') **') });
		}

		function clientConnected(data)
		{
			viewManager.cmd(c.LogEvent, { id: '** Connected ** ', data: data });
		}

		function generateCallback(id)
		{
			return function(data)
			{
				viewManager.cmd(c.LogEvent, { id: id, data: data });
			};
		}

		function stateUpdate(data)
		{
			if (!data)
			{
				return;
			}

			if (data.id !== 'eta' || (cntEta++ % 60) === 0)
			{
				viewManager.cmd(c.LogEvent, { id: '[StateUpdate]', data: data });
			}
		}


		///////////////////////////////////////////////////////////////////////////////
		// CTOR
		///////////////////////////////////////////////////////////////////////////////

		if (!cfgCore || !cfgCore.app || !cfgCore.viewer || !cfgCore.adapter)
		{
			dbg('[ERROR]: Invalid config! Aborting...', cfgCore);
			return;
		}

		if (!viewManager)
		{
			dbg('[ERROR]: viewManager not defined! Aborting...');
			return;
		}

		viewManager.init(this);

		// Add initial init delay to allow viewport to settle down
		setTimeout(adapterInit, 100);
	}


	module.exports = Main;
});
