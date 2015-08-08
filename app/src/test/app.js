// App entry point
define(function(require, exports, module)
{
    'use strict';

    // import dependencies
	var GlympseAdapter = require('glympse-adapter/GlympseAdapter');
	var AdapterDefines = require('glympse-adapter/GlympseAdapterDefines');

	// Test app-specific
	var ViewManager = require('test/ViewManager');
	var Defines = require('test/Defines');

	var adapter, cfg, viewManager;

	// cards/invites collection/state
	var cards, invites;

	var stubViewer =
	{
		notify: function(msg, args)
		{
			switch (msg)
			{
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
					invites = [];
					console.log('--> FINISHED CARDS LOAD! ' + cards.length + ' total cards');

					for (var i = 0, len = cards.length; i < len; i++)
					{
						var card = cards[i];
						var members = card.getMembers();
						//console.log('[' + i + ']: ' + card.getName() + ' with ' + members.length + ' members');
						for (var j = 0, mlen = members.length; j < mlen; j++)
						{
							var member = members[j];
							var invite = member.getTicket().getInviteCode();
							//console.log('  [' + j + ']: ' + invite);
							if (invite)
							{
								invites.push(invite);
							}
						}
					}

					if (invites.length > 0)
					{
						console.log('---> Loading invites: ' + invites);
						cfg.viewer.t = invites.join(';');
						adapter.loadViewer(cfg.cfgViewer);
					}
					//console.log('--> ' + JSON.stringify(args));
					break;
				}

				default:
				{
					console.log('[OTHER] StubViewer.notify(): [' + msg + '] -- ' + JSON.stringify(args));
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
		//var w = $(window).width();
		var h = $(window).height();// - $('#hdrApp').height();

		//var isDefault = (true/*autoSize*/ && (h == 444 || h == 356 || w == 444 || w == 356));
		//var baseHeight = ((!isDefault) ? h : ((w > h) ? 267 : h + 60));
		//var offset = h;

		//var app = glympse.viewer.apps[cfg.viewer.appId];
		/*if (app && (typeof forced) !== 'boolean' && h === baseHeight)
		{
			setTimeout(function()
			{
				doResize(true);
				app.refreshView();
			}, 500);
			return;
		}*/

		$('#divLoading').css({ height: $(window).height() + 0*1 });
		$('#glympser').css({ height: h });
	}
});
