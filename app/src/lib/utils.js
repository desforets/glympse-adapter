///////////////////////////////////////////////////////////////////////////////
// General utilities
///////////////////////////////////////////////////////////////////////////////

define(function(require, exports, module)
{
	var defCfg = '__gacfg';

	// Simple lib export
	var utils =
	{
		dbg: function(id, minLevel)
		{
			return function(info, data, level)
			{
				// Never allow logging if minLevel < 0
				// Allow all logging if minLevel is !truthy
				// Otherwise, must match min level on a log request
				if (!minLevel || (minLevel >= 0 && level >= minLevel))
				{
					console.log('[' + id + '] ' + info
							 + (((arguments.length > 1) && (': ' + JSON.stringify(data, null, '  '))) || ''));
				}
			};
		}

		, domain: window.location.hostname
		, getCookie: function(cName)
		{
			var c, i, idx, x, y;
			var cookies = document.cookie.split(';');

			for (i = 0; i < cookies.length; i++)
			{
				c = cookies[i];
				idx = c.indexOf('=');
				x = c.substr(0, idx);
				y = c.substr(idx + 1);

				if (x.replace(/^\s+|\s+$/g, '') === cName)
				{
					return window.unescape(y);
				}
			}

			return null;
		}

		, setCookie: function(cName, value, daysExpire)
		{
			var d = new Date();
			d.setTime(d.getTime() + (daysExpire || 365) * 24 * 3600 * 1000);
			document.cookie = cName + '=' + (value + '; expires=' + d.toGMTString() + '; domain=' + utils.domain + '; path=/');
		}

		, getCfgVal: function(name, idCfg)
		{
			var cookie = utils.getCookie(idCfg || defCfg);
			//console.log('cookie = ' + cookie + ' -- ' + name + ' -- ' + (JSON.parse(cookie))[name]);
			return (cookie) ? (JSON.parse(cookie))[name] : null;
		}

		, setCfgVal: function(name, value, idCfg)
		{
			var cfg = (idCfg || defCfg);
			var cookie = utils.getCookie(cfg);

			cookie = (cookie) ? JSON.parse(cookie) : {};
			cookie[name] = value;

			utils.setCookie(cfg, JSON.stringify(cookie));
		}

		, capFirst: function(str)
		{
			return (str && (str.charAt(0).toUpperCase() + str.slice(1)));
		}

		, toUpperCamel: function(str)
		{
			var words = ((str && str.split('_')) || '');
			var out = '';

			for (var i = 0, len = words.length; i < len; i++)
			{
				out += utils.capFirst(words[i]);
			}

			return out;
		}

		, mapProps: function(targ, props, data)
		{
			function returnVal(propId)
			{
				return function()
				{
					return (data && data[propId]);
				};
			}

			for (var i = 0, len = props.length; i < len; i++)
			{
				var prop = props[i];
				targ['get' + utils.toUpperCamel(prop)] = returnVal(prop);
			}
		}

	};


	module.exports = utils;
});
