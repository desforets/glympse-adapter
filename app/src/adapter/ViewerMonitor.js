define(function(require, exports, module)
{
    'use strict';

	// defines
	var Defines = require('glympse-adapter/GlympseAdapterDefines');
	var m = Defines.MSG;
	var s = Defines.STATE;
	var r = Defines.MAP.REQUESTS;


	// Exported class
	function ViewerMonitor(controller, cfg)
	{
		// consts
		var glyEvents = window.glympse.events;

		// state
		var app;
		var timerEnd;
		var viewer;

		var that = this;
		var cmdQueue = [];
		var props = { };


		///////////////////////////////////////////////////////////////////////////////
		// PROPERTIES
		///////////////////////////////////////////////////////////////////////////////


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.run = function()
		{
			if (!cfg.viewer)
			{
				dbg('No viewer set. Aborting...');
				return;
			}

			// Set up handlers
			viewer = cfg.viewer;
			viewer.addEventListener(glyEvents.INIT, viewerInit, false);
			viewer.addEventListener(glyEvents.READY, viewerReady, false);
			viewer.addEventListener(glyEvents.DATA, viewerData, false);
			viewer.addEventListener(glyEvents.PROPERTIES, viewerData, false);
			viewer.addEventListener(glyEvents.ETA, viewerEta, false);
		};

		this.shutdown = function()
		{
			viewer.removeEventListener(glyEvents.DATA, viewerData, false);
			viewer.removeEventListener(glyEvents.PROPERTIES, viewerData, false);
			viewer.removeEventListener(glyEvents.ETA, viewerEta, false);
		};

		this.getCurrentValue = function(id)
		{
			if (id && props.hasOwnProperty(id))
			{
				return props[id];
			}

			return 'Unknown id "' + id + '"';
		};

		this.cmd = function(cmd, args)
		{
			if (!app)
			{
				cmdQueue.push({ cmd: cmd, args: args });
				return null;
			}

			switch (cmd)
			{
				case r.setPadding:
				{
					if (!(args instanceof Array))
					{
						if (typeof args === 'number')
						{
							// Replicate old paddingLeft semantics for now
							args = [ null, null, null, args ];
						}
						else
						{
							return 'Invalid paddingArray type!';
						}
					}
				}

				default:
				{
					break;
				}
			}

			return app[cmd](args);
		};



		///////////////////////////////////////////////////////////////////////////////////
		// EVENT HANDLERS
		///////////////////////////////////////////////////////////////////////////////////

		function viewerInit(e)
		{
			//dbg('**** VIEWER INIT **** - app=' + e.detail.app);
			viewer.removeEventListener(glyEvents.INIT, viewerInit, false);
			controller.notify(m.ViewerInit, true);
		}

		function viewerReady(e)
		{
			//dbg('!!!!!!!! READY !!!!!!!!');
			viewer.removeEventListener(glyEvents.READY, viewerReady, false);

			app = e.detail.app;
			if (!app)
			{
				dbg('Error getting viewer. Aborting!');
				return;
			}

			// Process any queued commands issued before VIEWER_READY fired
			for (var i = 0; i < cmdQueue.length; i++)
			{
				var o = cmdQueue[i];
				that.cmd(o.cmd, o.args);
			}

			controller.notify(m.ViewerReady, app);

			// Notify if no invites found
			var invites = app.getInvites();
			if (!invites || invites.length === 0)
			{
				controller.infoUpdate(s.NoInvites, null);
			}
		}

		function viewerData(e)
		{
			var detail = e.detail;
			var idInvite = detail.id;
			var data = detail.data;

			var unknowns = [];	// Unknown properties that are passed along
			var maps = [ s.Avatar, s.Destination, s.EndTime, s.Eta, s.Message, s.Name, s.Phase ];	// Known/tracked properties

			if (!props[idInvite])
			{
				props[idInvite] = { };
				console.log('New props for ' + idInvite);
			}

			var prop = props[idInvite];

			//console.log('DATA: ' + JSON.stringify(detail, null, '  '));

			for (var i = 0, len = data.length; i < len; i++)
			{
				var val = data[i];
				var v = val.v;
				var n = val.n;
				var t = val.t;
				var found = false;

				for (var j = 0, jlen = maps.length; j < jlen; j++)
				{
					var id = maps[j];
					if (n === id)
					{
						found = true;
						if (prop[id] !== v)
						{
							prop[id] = v;
							controller.infoUpdate(id, { id: idInvite, val: v, t: t });
							break;
						}
					}
				}

				// Check for additional processing
				if (n === s.EndTime)
				{
					notifyExpired(idInvite);
				}

				if (!found)
				{
					unknowns.push(val);
				}
			}

			if (unknowns.length > 0)
			{
				detail.data = unknowns;
				controller.notify(m.DataUpdate, detail);
			}
		}

		function viewerEta(e)
		{
			var etaCount = e.detail.data;
			//dbg('** GOT ETA: ** ' + e.detail.id + ' -- ' + JSON.stringify(etaCount));
			controller.infoUpdate(s.Eta, (etaCount > 0) ? etaCount : 0);
		}


		///////////////////////////////////////////////////////////////////////////////////
		// INTERNAL
		///////////////////////////////////////////////////////////////////////////////////

		function dbg(msg, args)
		{
			console.log('[ViewerMonitor] ' + msg + ((args) ? (': ' + JSON.stringify(args)) : ''));
		}

		function notifyExpired(idInvite)
		{
			if (timerEnd)
			{
				clearTimeout(timerEnd);
				timerEnd = 0;
			}

			// One last check
			var t = new Date().getTime();
			var eTime = props[s.EndTime];
			if (eTime > t)
			{
				timerEnd = setTimeout(notifyExpired, (eTime - t));
			}

			controller.infoUpdate(s.Expired, { id: idInvite, val: eTime <= t });
		}
	}


	module.exports = ViewerMonitor;
});
