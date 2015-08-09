define(function(require, exports, module)
{
    'use strict';

	// views
	var Defines = require('Defines');

	var c = Defines.CMD;


	// Exported class
	function ViewManager(controller, cfg)
	{
		// ui - general
		var divLoading = $('#divLoading');


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.cmd = function(cmd, args)
		{
			switch (cmd)
			{
				case c.InitUi:
				{
					divLoading.hide();
					forceResize();
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

		function forceResize()
		{
			// Hack for viewer display
			setTimeout(function()
			{
				$(window).trigger('resize');
			}, 100);
		}


		///////////////////////////////////////////////////////////////////////////
		// CALLBACKS
		///////////////////////////////////////////////////////////////////////////
	}


	module.exports = ViewManager;
});
