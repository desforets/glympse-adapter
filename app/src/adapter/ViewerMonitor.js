define(function(require, exports, module)
{
    'use strict';

	// defines
	var Defines = require('glympse-adapter/GlympseAdapterDefines');
	var m = Defines.MSG;
	var s = Defines.STATE;
	var r = Defines.REQUESTS;


	// Exported class
	function ViewerMonitor(controller, cfg)
	{
		// consts
		var glyEvents = window.glympse.events;

		// state
		var app;
//		var interval = cfg.autoUpdateInterval;
		var queryTimer;
		var etaTimer;
		var viewer;

		var that = this;
		var lastActive;
		var etaCount = -1;
		var etaStart = -1;
		var etaTarg = null;
		var isViewerReady = false;
		var cmdQueue = [];

		var idEta = s.Eta;

		var props = { };
		props[s.Avatar] = null;
		props[s.Expired] = false;
		props[s.Name] = null;
		props[s.Phase] = null;
		props[idEta] = -1;			// Special handling


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
		};

		this.shutdown = function()
		{
			viewer.removeEventListener(glyEvents.DATA, viewerData, false);
			viewer.removeEventListener(glyEvents.PROPERTIES, viewerData, false);
			schedule(false);
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
					// For now, we only allow for left padding
					var padding = args;
					if (!(args instanceof Array))
					{
						if (typeof args === 'number')
						{
							// Replicate old paddingLeft semantics for now
							padding = [null,null,null,args[3]];
						}
						else
						{
							return 'Invalid paddingArray type!';
						}
					}

					return app.setPadding(padding);
				}

				default:
				{
					return app[cmd](args);
				}
			}

			return null;
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
			isViewerReady = true;

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

			//dbg('**** VIEWER READY **** - app=' + app);
			checkViewerStatus();
			controller.notify(m.ViewerReady, app);
		}

		function viewerData(e)
		{
			//dbg('** GOT DATA: ** ' + e.detail.id + ' -- ' + JSON.stringify(e.detail.data));
			// FIXME: Remove this timeout once viewer raises DATA/PROPERTIES event
			// when invite data is properly updated with new property data
			setTimeout(function()
			{
				if (isViewerReady)
				{
					checkViewerStatus();
				}

				// Format of e.detail:
				// { id: "invite_code"
				// , data: [ invite_property_update0,
				//			 invite_property_update1,
				//			 ...
				//			 invite_property_updateN
				//		   ]
				// }
				controller.notify(m.DataUpdate, e.detail);
			}, 100);
		}


		///////////////////////////////////////////////////////////////////////////////////
		// INTERNAL
		///////////////////////////////////////////////////////////////////////////////////

		function dbg(msg, args)
		{
			console.log('[ViewerMonitor] ' + msg + ((args) ? (': ' + JSON.stringify(args)) : ''));
		}

		function schedule(run)
		{
			if (run && !etaTimer)
			{
				etaTimer = setInterval(updateEta, 1000);
			}
			else if (!run && etaTimer)
			{
				clearInterval(etaTimer);
				etaTimer = null;
			}
		}

		function updateEta()
		{
			if (etaTarg !== null)
			{
				etaCount = (etaTarg - new Date().getTime()) / 1000;
				controller.infoUpdate(idEta, (etaCount > 0) ? etaCount : 0);
			}
		}

		function checkViewerStatus()
		{
			var invites = app.getInvites();

			//console.log('**** invites: ' + invites);

			// Notify if no invites found
			if (!invites || invites.length === 0)
			{
				etaTarg = null;
				controller.infoUpdate(s.NoInvites, null);
				return;
			}

			// Re-query the invites list in case the first invite has changed
			// as could happen in the case of groups, where a user sends a new
			// invite to the group (which replaces the old one).
			var invFull, inv = null;
			for (var i = 0, len = invites.length; i < len; i++)
			{
				invFull = invites[i];
				inv = (invFull && invFull.getInvite());

				if (!inv)
				{
					continue;
				}

				//console.log('Invite[' + i + ']: ' + inv
				//	+ '\nName: ' + inv.name
				//	+ '\nAvatar: ' + inv.avatarUrl
				//	+ '\nDest: ' + JSON.stringify(inv.destination)
				//	+ '\nDestLatLng: ' + inv.destinationLatLng.lat + ',' + inv.destinationLatLng.lng
				//	+ '\nPosition: ' + inv.locationLatLng.lat + ',' + inv.locationLatLng.lng
				//	+ '\nETA: ' + inv.eta + ' / ' + inv.etaStart
				//);

				// FUTURE: Check destination distance?

				// See if we can find an active user in the group
				if (!inv.isActive)
				{
					if (lastActive && inv != lastActive)
					{
						inv = lastActive;
					}

					continue;
				}

				break;
			}

			lastActive = inv;

			if (!inv)
			{
				etaTarg = null;
			}
			else
			{
				//console.log('location: ' + JSON.stringify(inv.location));
				var id = s.Expired;
				var val = inv.isActive;
				if (val != (!props[id]))
				{
					props[id] = !val;
					controller.infoUpdate(id, !val);
				}

				id = s.Name;
				val = inv.name;
				if (val !== props[id])
				{
					props[id] = val;
					controller.infoUpdate(id, val);
				}

				id = s.Phase;
				val = inv.phase;
				if (val !== props[id])
				{
					props[id] = val;
					controller.infoUpdate(id, val);
				}

				id = s.Avatar;
				val = inv.avatarUrl;
				if (val !== props[id])
				{
					props[id] = val;
					controller.infoUpdate(id, val);
				}

				//console.log("inv.IsActive:" + inv.isActive + " -- " + inv.eta + ' -- ' + inv.etaStart);
				//console.log("etaStatus:" + invFull.getEtaStatus());
				id = s.Eta;
				val = inv.eta;
				if (inv.isActive && val && (val != props[id] || inv.etaStart / 1000 != etaStart))
				{
					//console.log("START eta=" + inv.eta);
					schedule(true);
					props[id] = val;
					etaStart = inv.etaStart / 1000;
					etaCount = props[id] - etaStart;
					etaTarg = new Date().getTime() + etaCount * 1000;

					controller.infoUpdate(id, etaCount);
				}
			}
		}
	}


	module.exports = ViewerMonitor;
});
