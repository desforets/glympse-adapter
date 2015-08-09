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

	var m = AdapterDefines.MSG;
	var _id = 'GlympseCards';

	function Main(vm, cfgCore)
	{
		// Main config for app setup
		var cfg = (cfgCore && cfgCore.app) || { };

		var adapter;
		var viewManager = vm;
		var cards;
		var invites;
		var that = this;

		var dbg = lib.dbg(_id, cfg.dbg);


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.notify = function(msg, args)
		{
			switch (msg)
			{
				case m.ViewerReady:
				{
					dbg('----> VIEWER READY');
					viewManager.cmd(Defines.CMD.InitUi, { cards: cards, invites: invites });
					//dbg('MAP = ' + adapter.map.getMap());
					break;
				}

				case m.CardsInitEnd:
				{
					cards = args;
					invites = [];
					dbg('--> FINISHED CARDS LOAD! ' + cards.length + ' total cards');

					for (var i = 0, len = cards.length; i < len; i++)
					{
						var card = cards[i];

						if (!card.isLoaded())
						{
							dbg('Error loading card "' + card.getIdCard() + '"');
							dbg('Members: ' + card.getMembers());
							continue;
						}

						var members = card.getMembers();
						//dbg('[' + i + ']: ' + card.getName() + ' with ' + members.length + ' members');
						for (var j = 0, mlen = members.length; j < mlen; j++)
						{
							var member = members[j];
							var invite = member.getTicket().getInviteCode();
							//dbg('  [' + j + ']: ' + invite);
							if (invite)
							{
								invites.push(invite);
							}
						}
					}

					if (invites.length > 0)
					{
						dbg('---> Loading invites: ' + invites);
						cfgCore.viewer.t = invites.join(';');
						adapter.loadViewer(cfg.cfgViewer);
					}
					//dbg('--> ' + JSON.stringify(args));
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
			adapter.run(cfgAdapter.element);
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
