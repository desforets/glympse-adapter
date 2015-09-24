// App entry point
define(function(require, exports, module)
{
    'use strict';

    // import dependencies
	var GlympseAdapter = require('glympse-adapter/GlympseAdapter');
	var AdapterDefines = require('glympse-adapter/GlympseAdapterDefines');
	var VersionInfo = require('glympse-adapter/VersionInfo');

	// Test app-specific
	var ViewManager = require('ViewManager');
	var Defines = require('Defines');

	var adapter, cfg, viewManager;

	// cards/invites collection/state
	var cards;
	var invitesCard;
	var invitesGlympse;

	console.log(VersionInfo.id + ' v(' + VersionInfo.version + ')');

	var stubViewer =
	{
		notify: function(msg, args)
		{
//			if (msg !== AdapterDefines.MSG.StateUpdate)
//			{
//				console.log('[Stub] StubViewer.notify(): [' + msg + '] -- ' + JSON.stringify(args));
//			}

			switch (msg)
			{
				case AdapterDefines.MSG.AdapterReady:
				{
					invitesCard = args.cards;
					invitesGlympse = args.glympses;
					console.log('--> ADAPTER READY', args);
					return;
				}

				case AdapterDefines.MSG.ViewerReady:
				{
					console.log('--> VIEWER READY');
					viewManager.cmd(Defines.CMD.InitUi, true);
					//console.log('MAP = ' + adapter.map.getMap());
					return;
				}

				case AdapterDefines.MSG.CardsInitEnd:
				{
					cards = args;
					console.log('--> FINISHED CARDS LOAD! ' + cards.length + ' total cards');
					console.log('---> First card: "' + cards[0].getIdCard() + '" (' + cards[0].getId() + '), type=' + cards[0].getTypeId());
					break;
				}

				default:
				{
					break;
				}
			}
		}
	};


	$(document).ready(function()
	{
		cfg = window.cfgApp;
		viewManager = new ViewManager(stubViewer, cfg.app);

		doResize();
		$(window).resize(doResize);

		// Add initial init delay to allow viewport to settle down
		setTimeout(init, 100);
	});

	function simpleInit()
	{
		console.log('ADAPTER INITIALIZED!!');
	}

	function doCustomMethod(args)
	{
		console.log('CALLED CUSTOM_METHOD: ' + JSON.stringify(args));
		return { passed: args, sample: 'badu!' };
	}

	function init()
	{
		if (!cfg)
		{
			console.error('No config defined');
			return;
		}

		// Insert app-specific settings before passing over
		// to the adapter to get things going
		cfg.adapter.initialize = simpleInit;
		cfg.adapter.interfaces = { customMethodExample: doCustomMethod };

		adapter = new GlympseAdapter(stubViewer, cfg);
		adapter.run($('#glympser'));

		setTimeout(doResize, 250);
	}

	function doResize(forced)
	{
		var h = $(window).height();

		$('#divLoading').css({ height: h });
		$('#glympser').css({ height: h });
	}
});
