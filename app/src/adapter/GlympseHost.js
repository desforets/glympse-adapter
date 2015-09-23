// App entry point
define(function(require, exports, module)
{
    'use strict';

	// imports
	var Oasis = require('oasis');


	function GlympseHost(controller)
	{
		// state
		var svc;
		var cfg;

		var extClientInitialized;	// Channel created
		var extClientConnected;		// Channel established


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.init = function(settings)
		{
			cfg = settings;

			extClientInitialized = cfg.initialize;
			extClientConnected = cfg.connect;

			var events = cfg.events || {};
			events.Connected = connect;

			svc = Oasis.Service.extend(
				{
					initialize: initialize,
					events: events,
					requests:
					{
						getInfo: requestGetInfo
						//, ping: requestPing
					}
				});

			return svc;
		};


		///////////////////////////////////////////////////////////////////////////////
		// INTERNAL
		///////////////////////////////////////////////////////////////////////////////

		function logEvent(msg, args)
		{
			console.log(msg + ((args) ? (': ' + JSON.stringify(args)) : ''));
		}

		function initialize(port, name)
		{
			//logEvent('GlympseHost initialized --- "' + name + '"');
			if (extClientInitialized)
			{
				extClientInitialized(name);
			}
		}

		function connect(data)
		{
			//logEvent('GlympseHost connect --- data', data);
			controller.clientConnected(data);
			if (extClientConnected)
			{
				extClientConnected(data);
			}
		}

		function requestGetInfo(infoType)
		{
			logEvent('[request.getInfo]', infoType);
			switch (infoType)
			{
				default:
				{
					return { error: 'Unknown infoType "' + infoType + '"' };
				}
			}
		}

/*		function requestPing(str)
		{
			return new Oasis.RSVP.Promise(function(resolve, reject)
			{
				var delay = 100;
				setTimeout(function()
				{
					resolve('PONG - ' + str + ' (delayed ' + delay + 'ms)');
				}, delay);
			});
		}*/
	}


	module.exports = GlympseHost;
});
