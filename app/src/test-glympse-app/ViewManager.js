define(function(require, exports, module)
{
    'use strict';

	// imports
	var AdapterDefines = require('glympse-adapter/GlympseAdapterDefines');
	var Defines = require('Defines');

	var c = Defines.CMD;
	var appMSG = AdapterDefines.MSG;


	// Exported class
	function ViewManager(cfg)
	{
		// state
		var controller;
		var cards;
		var invites;

		// ui - general
		var divLoading = $('#divLoading');
		var glympser = $('#glympser');


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.init = function(appController)
		{
			controller = appController;
		};

		this.cmd = function(cmd, args)
		{
			switch (cmd)
			{
				case c.InitUi:
				{
					divLoading.hide();
					doResize();

					cards = args.cards;
					invites = args.invites;

					dbg('Cards: ' + cards + ', invites: ' + invites);

					if (!cards || cards.length === 0)
					{
						dbg('--> Glympse viewer only: ' + cfg.adapter.map.getInvites().length + ' invites');
					}

					break;
				}

				case appMSG.StateUpdate:
				{
					//dbg('args', args);
					dbg('[' + args.val.id + '] ' + args.id + ' - ', args.val.val);
					break;
				}

				case appMSG.DataUpdate:
				{
					dbg('[' + args.id + '] DATA', args.data);
					break;
				}

				default:
				{
					dbg('cmd() - unknown cmd: "' + cmd + '"', args);
					break;
				}
			}

			return null;
		};


		///////////////////////////////////////////////////////////////////////////
		// UTILITY
		///////////////////////////////////////////////////////////////////////////

		function dbg(msg, args)
		{
			console.log('[ViewManager] ' + msg + ((args) ? (': ' + JSON.stringify(args)) : ''));
		}

		function doResize(forced)
		{
			//var w = $(window).width();
			var h = $(window).height();// - $('#hdrApp').height();

			divLoading.css({ height: $(window).height() + 0*1 });
			glympser.css({ height: h });
		}


		///////////////////////////////////////////////////////////////////////////
		// CALLBACKS
		///////////////////////////////////////////////////////////////////////////


		///////////////////////////////////////////////////////////////////////////
		// CTOR
		///////////////////////////////////////////////////////////////////////////

		doResize();
		$(window).resize(doResize);
	}


	module.exports = ViewManager;
});
