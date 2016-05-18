// App entry point
define(function(require, exports, module)
{
    'use strict';

    // import dependencies
	var AdapterDefines = require('glympse-adapter/GlympseAdapterDefines');
	var GlympseLoader = require('glympse-adapter/adapter/GlympseLoader');

	var cfg;


	$(document).ready(function()
	{
		cfg = window.cfgApp || {};

		var dbg = cfg.dbg;
		var cfgAdapter = cfg.adapter || {};
		var styleName = 'font-weight:bold;';
		var styleValue = 'color:#800000; font-style:italic;';

		cfgAdapter.dbg = dbg;

		var handler = {
			notify: function(msg, args)
			{
				if (msg === AdapterDefines.MSG.InviteReady)
				{
					//console.log('args: ', args);
					if (!args.isLoaded()) {
						console.log('Error loading invite "' + cfgAdapter.t + '": %c' + JSON.stringify(args.getError()), styleValue);
						return;
					}

					console.log(msg + ' -- "' + args.getIdInvite() + '" properties:');

					var props = args.getProperties();
					for (var i = 0, len = ((props && props.length) || 0); i < len; i++)
					{
						var p = props[i];
						console.log(' %c' + p.n + ': %c' + JSON.stringify(p.v), styleName, styleValue);
					}
				}
			}
		};

		var loader = new GlympseLoader(handler, cfgAdapter);
		loader.init(cfgAdapter.t);
	});
});
