define(function(require, exports, module)
{
    'use strict';

	var lib = require('glympse-adapter/lib/utils');
	var cAcctTokenName = 't0';
	var cApiKey = 'api_key';
	var cMaxAttempts = 3;
	var cPassword = 'p0';
	var cTokenName = 'access_token';
	var cUserName = 'n0';
	var cAnonExchange = 'anon_exchange';


	// Exported class
	function Account(controller, cfg)
	{
		// state
		var attempts = 0;
		var isAnon = !cfg.apiKey;
		var token;

		// consts
		var dbg = lib.dbg('Account', cfg.dbg);
		var svr = (cfg.svcGlympse || '//api.glympse.com/v2/');
		var account = { username: 'viewer', password: 'password' };
		//var apiKey = (cfg.sandbox) ? 'nXQ44D38OdVzEC34' : 'nXQ44D38OdVzEC34';
		var apiKey = cfg.apiKey || ((cfg.sandbox) ? 'eHXSnRf0slRRxGpC' : 'TDuy3X0PfQAyYjTt');
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
			if (!isAnon)
			{
				token = lib.getCfgVal(cAcctTokenName);
				if (token)
				{
					return true;
				}
			}

			attempts = 0;

			if (isAnon)
			{
				token = lib.getCfgVal(cTokenName);
				if (token)
				{
					return true;
				}

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

		this.handleExpiredToken = function()
		{
			dbg('>>>> EXPIRED anon=' + isAnon + ', token=' + token);
			if (isAnon && token)
			{
				account[cAnonExchange] = token;
			}

			getNewToken();
		};

		this.handleInvalidToken = function()
		{
			dbg('>>>> INVALID anon=' + isAnon + ', token=' + token);
			if (isAnon && token)
			{
				token = null;
				account[cAnonExchange] = undefined;
			}

			getNewToken();
		};

		this.create = function ()
		{
			if (!isAnon)
			{
				createAccount();
			}
			else
			{
				dbg('Creating account failed, anonymous mode ON');
			}
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

					lib.setCfgVal((isAnon) ? cTokenName : cAcctTokenName, token);
					if (cfg.anon)
					{
						lib.setCookie(cTokenName, token, 365);
					}

					//dbg('>> new token: ' + token);

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
			$.getJSON(urlCreate, { api_key: account.api_key })
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
				controller.notify(Account.AccountCreateStatus, data);
				if (resp && data.result === 'ok')
				{
					var id = resp.id;
					var pw = resp.password;

					account.username = id;
					account.password = pw;
					lib.setCfgVal(cUserName, id);
					lib.setCfgVal(cPassword, pw);
					//dbg('>> new account: ' + id + ' / ' + pw);

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
	Account.AccountCreateStatus = 'AccountCreateStatus';


	module.exports = Account;
});
