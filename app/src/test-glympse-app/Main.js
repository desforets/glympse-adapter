// App entry point
define(function(require, exports, module)
{
    'use strict';

    // import dependencies
	var GlympseAdapter = require('glympse-adapter/GlympseAdapter');
	var AdapterDefines = require('glympse-adapter/GlympseAdapterDefines');
	var VersionInfo = require('glympse-adapter/VersionInfo');
	var lib = require('glympse-adapter/lib/utils');

	// Test app-specific
	var ViewManager = require('ViewManager');
	var Defines = require('Defines');

	var m = AdapterDefines.MSG;
	var _id = 'GlympseCards';

	console.log(VersionInfo.id + ' v(' + VersionInfo.version + ')');


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
					viewManager.cmd(Defines.CMD.InitUi, { invitesCard: invitesCard
														, invitesGlympse: invitesGlympse
														, cards: cards
														});
					//dbg('MAP = ' + adapter.map.getMap());
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
					//dbg('[OTHER] StubViewer.notify(): [' + msg + '] -- ' + JSON.stringify(args));
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
			var cfgAdapter = cfgCore.adapter;

			cfgAdapter.initialize = adapterPostInit;
			cfgAdapter.interfaces = { customMethodExample: doCustomMethod };

			adapter = new GlympseAdapter(that, cfgCore);
			adapter.client(cfgAdapter.element);
			cfg.adapter = adapter;	// Reference for general app usage
		}

		function adapterPostInit()
		{
			dbg('ADAPTER_POST_INIT');
			//viewManager.cmd(c.Progress, 1 / 3);
		}

		function doCustomMethod(args)
		{
			dbg('CALLED CUSTOM_METHOD: ' + JSON.stringify(args));
			return { passed: args, sample: 'badu!' };
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
