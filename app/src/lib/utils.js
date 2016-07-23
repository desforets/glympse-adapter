///////////////////////////////////////////////////////////////////////////////
// General utilities
///////////////////////////////////////////////////////////////////////////////

define(function(require, exports, module)
{
	var defCfg = '__gacfg';

	function returnVal(data, propId)
	{
		return function()
		{
			return (data && data[propId]);
		};
	}

	function returnDataStreamVal(data, propId)
	{
		return function()
		{
			var p = (data && data[propId]);
			return (p && (p.v || p));
		};
	}

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
							 + (((data !== undefined) && (': ' + JSON.stringify(data, null, '  '))) || ''));
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

		, setCfgVal: function(name, value, idCfg, daysExpire)
		{
			var cfg = (idCfg || defCfg);
			var cookie = utils.getCookie(cfg);

			cookie = (cookie) ? JSON.parse(cookie) : {};
			cookie[name] = value;

			utils.setCookie(cfg, JSON.stringify(cookie), daysExpire);
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

		, mapProps: function(targ, props, data, dataStreamProp)
		{
			for (var i = 0, len = props.length; i < len; i++)
			{
				var prop = props[i];
				targ['get' + utils.toUpperCamel(prop)] = (dataStreamProp) ? returnDataStreamVal(data, prop)
																		  : returnVal(data, prop);
			}
		}

		, simplifyInvite: function(invite)
		{
			return (invite && invite.toLowerCase().split('-').join('')) || '';
		}

		, normalizeInvite: function(invite)
		{
			if (invite)
			{
				invite = invite.toUpperCase();
				var ilen = invite.length;
				var ilen2 = ilen / 2;

				if (ilen === 6 || ilen === 8)
				{
					invite = invite.substr(0, ilen2) + '-' + invite.substr(ilen2, ilen2);
				}
			}

			return invite;
		}

		, cleanInvites: function(invites)
		{
			invites = invites || [];
			for (var i = 0, len = invites.length; i < len; i++)
			{
				invites[i] = utils.simplifyInvite(invites[i]);
			}

			return invites;
		}

	};


	module.exports = utils;
});
