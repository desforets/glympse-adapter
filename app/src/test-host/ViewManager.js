define(function(require, exports, module)
{
    'use strict';

	// views
	var Defines = require('Defines');

	var c = Defines.CMD;


	// Exported class
	function ViewManager(cfg)
	{
		// state
		var controller;

		// ui - general
		var divLoading = $('#divLoading');
		var outputText = $('#outputText');
		var uiAdapter = $('#' + cfg.elementAdapter);
		var input = $('#txtInput');


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
					forceResize();
					break;
				}

				case c.LogEvent:
				{
					logEvent(args.id, args.data);
					break;
				}

				case c.SetAdapterUi:
				{
					$(args).css({ width: '100%', height: '100%' });
					uiAdapter.append(args);
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

		function logEvent(tag, data)
		{
			var div = $(document.createElement('div'));
			div.text(tag + ((!data) ? '' : (': ' + ((typeof data === 'string') ? data : JSON.stringify(data)))));
			outputText.append(div);
			outputText.stop().animate({ scrollTop: outputText[0].scrollHeight }, 250);
		}

		function doGetValue(param, output)
		{
			console.log('getInviteProperty: ' + param + ' -- ' + cfg.adapter.map.getInviteProperty({ idProperty: param }));
			//cfg.adapter.getValue(param).then(function(data)
			cfg.adapter.map.getInviteProperty({ idProperty: param }).then(function(data)
			{
				if (typeof data === 'boolean') data = data.toString();
				else if (data === null) data = 'null';
				logEvent('[get' + output + ']', data);
			});
		}

		function doInput(method, output)
		{
			var val = input.val();
			if (val)
			{
				cfg.adapter.map[method](val).then(function(data) { logEvent('[' + output + '] val=' + val, data); });
				input.val('');
			}
			else
			{
				logEvent('[' + output + '] ERROR: Need input!');
			}
		}

		function clearOutput()
		{
			outputText.empty();
		}

		function refreshView()
		{
			cfg.adapter.map.refreshView().then(function(data) { logEvent('[Refresh]', data); });
		}

		function setPadding()
		{
			var tag = '[Padding]';
			var val = input.val();
			if (val)
			{
				try {
					var padding = JSON.parse(val);
					logEvent(tag + ' isArray:' + (padding instanceof Array) + ', typeof:' + (typeof padding));
					cfg.adapter.map.setPadding(padding).then(function(data) { logEvent(tag, data); });;
					input.val('');
				}
				catch(e)
				{
					logEvent(tag + ' ERROR: Invalid padding param: ' + val);
				}
			}
			else
			{
				logEvent(tag + ' ERROR: Need input - integer or 4 integer array')
			}
		}


		///////////////////////////////////////////////////////////////////////////
		// CALLBACKS
		///////////////////////////////////////////////////////////////////////////


		///////////////////////////////////////////////////////////////////////////
		// INIT
		///////////////////////////////////////////////////////////////////////////

		$('#getArrived').click(function() { doGetValue('Arrived', 'Arrived'); });
		$('#getAvatar').click(function() { doGetValue('avatar', 'Avatar'); });
		$('#getEta').click(function() { doGetValue('eta', 'ETA'); });
		$('#getExpired').click(function() { doGetValue('Expired', 'Expired'); });
		$('#getName').click(function() { doGetValue('name', 'Name'); });
		$('#getPhase').click(function() { doGetValue('phase', 'Phase'); });


		// Commands
		$('#addInvite').click(function() { doInput('addInvites', 'AddInvites'); });
		$('#addGroup').click(function() { doInput('addGroups', 'AddGroups'); });
		$('#addTopic').click(function() { doInput('addTwitterTopics', 'AddTwitterTopics'); });
		$('#addUser').click(function() { doInput('addTwitterUsers', 'AddTwitterUsers'); });
		$('#removeInvite').click(function() { doInput('removeInvites', 'RemoveInvites'); });
		$('#setApiUrl').click(function() { doInput('setApiServices', 'SetApiServices'); });
		$('#sendRefresh').click(refreshView);
		$('#setPadding').click(setPadding);
		$('#btnOutputClear').click(clearOutput);
	}


	module.exports = ViewManager;
});
