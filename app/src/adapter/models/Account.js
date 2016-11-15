define(function(require, exports, module)
{
    'use strict';

	var lib = require('glympse-adapter/lib/utils');
	var cAcctTokenName = 't0';
	var cApiKey = 'api_key';
	var cMaxAttempts = 3;
	var cPassword = 'p0';
	var cUserName = 'n0';
	var cSvcPassword = 'password';
	var cSvcUserName = 'username';
	var cSvcError = 'error';
	var cSvcErrorDetail = 'error_detail';


	// Exported class
	function Account(controller, cfg)
	{
		// consts
		var dbg = lib.dbg('Account', cfg.dbg);
		var svr = (cfg.svcGlympse || '//api.glympse.com/v2/');
		var sandbox = cfg.sandbox;
		var idEnvironment = (sandbox) ? Account.EnvSandbox : Account.EnvProduction;

		var account = {};
		//var apiKey = cfg.apiKey || ((sandbox) ? 'eHXSnRf0slRRxGpC' : 'TDuy3X0PfQAyYjTt');
		var apiKey = cfg.apiKey || ((sandbox) ? 'eHXSnRf0slRRxGpC' : 'nXQ44D38OdVzEC34'); //(sandbox) ? 'nXQ44D38OdVzEC34' : 'nXQ44D38OdVzEC34';
		var urlCreate = (svr + 'account/create');
		var urlLogin = (svr + 'account/login');

		// state
		var attempts = 0;
		var isAnon = !cfg.apiKey;
		var settings;
		var token;

		account[cApiKey] = apiKey;
		account[cSvcPassword] = 'password';
		account[cSvcUserName] = 'viewer';


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
			settings = lib.getCfgVal(idEnvironment) || {};

			//dbg('isAnon = ' + isAnon + ', settings', settings);
			cfg.isAnon = isAnon;


			token = settings[cAcctTokenName];
			if (token)
			{
				controller.notify(Account.InitComplete, { status: true, token: token });
				return true;
			}

			// If not anonymous, add saved username/password to token request
			if (!isAnon)
			{
				var u = settings[cUserName];
				var p = settings[cPassword];

				if (!u || !p)
				{
					controller.notify(Account.InitComplete, { status: false, error: 'no_account', errorDetail: 'No account exists for the current apiKey.' });
					return false;
				}

				account[cSvcUserName] = u;
				account[cSvcPassword] = p;
			}

			attempts = 0;
			getNewToken();

			return false;
		};

		this.generateToken = function()
		{
			token = null;
			attempts = 0;
			getNewToken();
		};

		this.create = function()
		{
			if (!isAnon)
			{
				createAccount();
			}
			else
			{
				dbg('Creating account failed, no API key available');
			}
		};

		this.setName = function (newName)
		{
			console.log('[account] set name');

			var apiUrl = (svr + 'users/self/update');

			$.getJSON(apiUrl, { oauth_token: token, name: newName })
				.done(processUserNameResponse)
				.fail(processUserNameResponse);

			function processUserNameResponse(data)
			{
				var result = {
					status: false,
					response: data
				};
				if (data && data.response)
				{
					if (data.result === 'ok')
					{
						result.status = true;
					}
					result.response = data.response;
				}
				controller.notify(Account.UserNameUpdateStatus, result);
			}
		};

		this.setAvatar = function (urlOrAvatarDataArray)
		{
			console.log('[account] set avatar', urlOrAvatarDataArray);

			if(typeof urlOrAvatarDataArray === 'string')
			{
				var that = this;
				var oReq = new XMLHttpRequest();
				oReq.open("GET", urlOrAvatarDataArray, true);
				oReq.responseType = "arraybuffer";

				oReq.onload = function()
				{
					var arrayBuffer = oReq.response; // Note: not oReq.responseText
					if (arrayBuffer) {
						that.setAvatar(arrayBuffer);
					}
				};

				oReq.onerror = function (error) {
					var result = {
						status: false,
						errorDetail: 'Could not load image by url',
						error: error
					};
					controller.notify(Account.UserAvatarUpdateStatus, result);
				};


				oReq.send(null);
				return;
			}

			//ToDo: need to resize image using utility helper (ENG-11495)

			var apiUrl = (svr + 'users/self/upload_avatar?oauth_token=' + token);
			$.ajax({
				url: apiUrl,
				type: 'POST',
				contentType: 'image/png',
				data: new Uint8Array(urlOrAvatarDataArray),
				processData: false
			})
				.done(processResponse)
				.fail(processResponse);

			function processResponse(data)
			{
				var result = {
					status: false,
					response: data
				};
				if (data && data.response)
				{
					if (data.result === 'ok')
					{
						result.status = true;
					}
					result.response = data.response;
				}
				controller.notify(Account.UserAvatarUpdateStatus, result);
			}
		};


		///////////////////////////////////////////////////////////////////////////////
		// UTILITY
		///////////////////////////////////////////////////////////////////////////////

		function saveSettings()
		{
			lib.setCfgVal(idEnvironment, settings);
		}

		function getNewToken()
		{
			$.getJSON(urlLogin, account)
				.done(processLogin)
				.fail(processLogin);
		}

		function processLogin(data)
		{
			var result = { status: false };

			attempts++;

			try
			{
				if (data && data.response)
				{
					if (data.result === 'ok')
					{
						token = data.response.access_token;

						settings[cAcctTokenName] = token;
						saveSettings();

						//dbg('>> new token: ' + token);

						result.status = true;
						result.token = token;

						controller.notify(Account.InitComplete, result);

						return;
					}

					if (data.result === 'failure')
					{
						var meta = data.meta || {};
						result.error = meta[cSvcError];
						result.errorDetail = meta[cSvcErrorDetail];

						controller.notify(Account.InitComplete, result);

						return;
					}
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
			result.info = { mode: 'login', status: 'max_attempts', lastResult: data };
			controller.notify(Account.InitComplete, result);
		}

		function createAccount()
		{
			var opts = {};

			opts[cApiKey] = account[cApiKey];

			$.getJSON(urlCreate, opts)
				.done(processCreateAccount)
				.fail(processCreateAccount);
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

					account[cSvcUserName] = id;
					account[cSvcPassword] = pw;

					settings[cUserName] = id;
					settings[cPassword] = pw;
					saveSettings();
					//dbg('>> new account: ' + id + ' / ' + pw);

					result.status = true;
					result.data = data;

					controller.notify(Account.CreateStatus, result);

					// Now, go ahead and get an authToken
					attempts = 0;
					token = null;
					getNewToken();

					return;
				}
			}
			catch (e)
			{
				dbg('Error parsing ' + urlCreate, e);
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
			result.info = { mode: 'create_account', status: 'max_attempts', lastResult: data };
			controller.notify(Account.CreateStatus, result);
		}
	}

	// Account defines
	// Events
	Account.InitComplete = 'AccountInitComplete';
	Account.CreateStatus = 'AccountCreateStatus';
	Account.UserNameUpdateStatus = 'UserNameUpdateStatus';
	Account.UserAvatarUpdateStatus = 'UserAvatarUpdateStatus';

	// Environment
	Account.EnvProduction = 'prod';
	Account.EnvSandbox = 'sbox';



	module.exports = Account;
});
