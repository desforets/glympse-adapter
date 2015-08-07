define(function(require, exports, module)
{
    'use strict';

	var lib = require('glympse-adapter/lib/utils');
	var cApiKey = 'api_key';
	var cMaxAttempts = 3;
	var cPassword = 'p0';
	var cTokenName = 'access_token';
	var cUserName = 'n0';


	// Exported class
	function Account(controller, cfg)
	{
		// state
		var attempts = 0;
		var token;

		// consts
		var dbg = lib.dbg('Account', cfg.dbg);
		var svr = (cfg.svcGlympse || '//api.glympse.com/v2/');
		var account = { username: 'viewer', password: 'password' };
		//var apiKey = (cfg.sandbox) ? 'nXQ44D38OdVzEC34' : 'nXQ44D38OdVzEC34';
		var apiKey = (cfg.sandbox) ? 'eHXSnRf0slRRxGpC' : 'TDuy3X0PfQAyYjTt';
		var urlCreate = (svr + 'account/create');
		var urlLogin = (svr + 'account/login');

		account[cApiKey] = apiKey;


		///////////////////////////////////////////////////////////////////////////////
		// PROPERTIES
		///////////////////////////////////////////////////////////////////////////////

		this.getToken = function()
		{
			return token;
		};


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.init = function()
		{
			token = lib.getCfgVal(cTokenName);
			if (token)
			{
				return true;
			}

			attempts = 0;

			if (cfg.anon)
			{
				token = lib.getCookie(cTokenName);
				if (token)
				{
					lib.setCfgVal(cTokenName, token);
					return true;
				}
			}
			else
			{
				var u = lib.getCfgVal(cUserName);
				var p = lib.getCfgVal(cPassword);

				if (!u || !p)
				{
					createAccount();
					return false;
				}

				account.username = u;
				account.password = p;
			}

			getNewToken();

			return false;
		};


		///////////////////////////////////////////////////////////////////////////////
		// UTILITY
		///////////////////////////////////////////////////////////////////////////////

		function getNewToken()
		{
			$.getJSON(urlLogin, account)
			.done(function(data)
			{
				processLogin(data);
			})
			.fail(function(xOptions, status)
			{
				processLogin(null);
			});
		}

		function processLogin(data)
		{
			var result = { status: false };

			attempts++;

			try
			{
				if (data && data.response && data.result === 'ok')
				{
					token = data.response.access_token;
					//dbg('>> new token: ' + token);
					lib.setCfgVal(cTokenName, token);
					lib.setCookie(cTokenName, token, 365);

					result.status = true;
					result.token = token;

					controller.notify(Account.InitComplete, result);
					return;
				}
			}
			catch (e)
			{
				dbg('Error parsing login', e);
			}

			//dbg('attempt: ' + attempts + ', last data', data);

			if (attempts < cMaxAttempts)
			{
				setTimeout(function()
				{
					getNewToken();
				}, attempts * (500 + Math.round(1000 * Math.random()))	// Incremental + random offset delay between retry in case of short availability outage
				);

				return;
			}

			//dbg('Max attempts: (' + attempts + ') -- ' + ((data && data.result) || 'data=null'));
			result.info = { mode: 'login', status: 'max_attempts', lastResult: (data && data.result) };
			controller.notify(Account.InitComplete, result);
		}

		function createAccount()
		{
			$.getJSON(urlCreate, account)
			.done(function(data)
			{
				processCreateAccount(data);
			})
			.fail(function(xOptions, status)
			{
				processCreateAccount(null);
			});
		}

		function processCreateAccount(data)
		{
			var result = { status: false };

			attempts++;

			try
			{
				var resp = (data && data.response);
				if (resp && data.result === 'ok')
				{
					var id = resp.id;
					var pw = resp.password;

					account.username = id;
					account.password = pw;
					lib.setCfgVal(cUserName, id);
					lib.setCfgVal(cPassword, pw);
					dbg('>> new account: ' + id + ' / ' + pw);

					// Now, log in
					attempts = 0;
					getNewToken();

					return;
				}
			}
			catch (e)
			{
				dbg('Error parsing create', e);
			}

			//dbg('attempt: ' + attempts + ', last data', data);

			if (attempts < cMaxAttempts)
			{
				setTimeout(function()
				{
					createAccount();
				}, attempts * (500 + Math.round(1000 * Math.random()))	// Incremental + random offset delay between retry in case of short availability outage
				);

				return;
			}

			//dbg('Max attempts: (' + attempts + ') -- ' + ((data && data.result) || 'data=null'));
			result.info = { mode: 'create_account', status: 'max_attempts', lastResult: (data && data.result) };
			controller.notify(Account.InitComplete, result);
		}
	}

	// Account defines
	Account.InitComplete = 'AccountInitComplete';


	module.exports = Account;
});
