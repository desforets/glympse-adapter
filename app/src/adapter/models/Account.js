define(function(require, exports, module)
{
    'use strict';

	var lib = require('glympse-adapter/lib/utils');
	var Defines = require('glympse-adapter/GlympseAdapterDefines');
	var imageProcessing = require('glympse-adapter/lib/image');

	var m = Defines.MSG;
	var REQUEST_TYPES = Defines.CARDS.REQUEST_TYPES;

	var cAcctTokenName = 't0';
	var cApiKey = 'api_key';
	var cMaxAttempts = 3;
	var cPassword = 'p0';
	var cUserName = 'n0';
	var cSvcPassword = 'password';
	var cSvcUserName = 'username';
	var cSvcError = 'error';
	var cSvcErrorDetail = 'error_detail';
	var cAccountInfo = 'accountInfo';

	var anonymousUserName = 'viewer';
	var anonymousPassword = 'password';

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
		var token;

		var settings;
		var currentEnvKeys;
		var currentKeySettings;

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
			getSettings();

			cfg.isAnon = isAnon;

			// If not anonymous, add saved username/password to token request
			if (!isAnon)
			{
				var u = currentKeySettings[cUserName];
				var p = currentKeySettings[cPassword];

				if (!u || !p)
				{
					controller.notify(m.AccountLoginStatus, { status: false, error: 'no_account', errorDetail: 'No account exists for the current apiKey.' });
					return false;
				}

				account[cSvcUserName] = u;
				account[cSvcPassword] = p;
			}
			else
			{
				account[cSvcUserName] = anonymousUserName;
				account[cSvcPassword] = anonymousPassword;
			}

			// check for token after checking for user/password as they are required for getting new token (after expiration or smth)
			token = currentKeySettings[cAcctTokenName];
			if (token)
			{
				// validate token before sending init event
				getUserInfo(null, true);
				return true;
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

		this.setName = function(newName)
		{
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
						result.response = data.response;
					}
					else
					{
						result.response = data.meta;
					}
				}
				controller.notify(m.UserNameUpdateStatus, result);
			}
		};

		this.setAvatar = function(urlOrAvatarDataArray)
		{
			var that = this;
			var avatarCfg = cfg.avatar || {};

			if (typeof urlOrAvatarDataArray === 'string')
			{
				imageProcessing.loadDataArrayByUrl(urlOrAvatarDataArray, loadImageCallback);
				return false;
			}

			var imageScaleConfig = {
				minSize: [
					avatarCfg.minSize || 120,
					avatarCfg.minSize || 120
				],
				maxSize: [
					avatarCfg.maxSize || 512,
					avatarCfg.maxSize || 512
				],
				maintainAspectRatio: true,
				sidebandFill: '#fff',
				convertAlpha: '#fff'
			};

			imageProcessing.imageScale(urlOrAvatarDataArray, imageScaleConfig, imageScaleCallback);

			function loadImageCallback(dataArray, error)
			{
				if (dataArray)
				{
					that.setAvatar(dataArray);
				}
				else
				{
					controller.notify(m.UserAvatarUpdateStatus, error);
				}
			}

			function imageScaleCallback(dataArray)
			{
				var apiUrl = (svr + 'users/self/upload_avatar?oauth_token=' + token);
				$.ajax({
					url: apiUrl,
					type: 'POST',
					contentType: 'image/jpeg',
					data: new Uint8Array(dataArray),
					processData: false
				})
					.done(processResponse)
					.fail(processResponse);
			}

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
						result.response = data.response;
					}
					else
					{
						result.response = data.meta;
					}
				}
				controller.notify(m.UserAvatarUpdateStatus, result);
			}
		};

		this.getUserInfo = getUserInfo;

		this.hasAccount = function()
		{
			getSettings();

			return !!(!isAnon && currentKeySettings[cUserName] && currentKeySettings[cPassword]);
		};

		/**
		 * Allow logged in user to generate a sharing request.
		 * @param {Object} config endpoint options
		 * request_params format:
		 * {
         *  type: string,     // Type of request -- email|sms|link|account|app ---> only accepts/uses "link" for now
         *  subtype: string,  // [OPTIONAL] Subtype of "app" types (50 char max) --> unused for now
         *  address: string,  // [OPTIONAL] Address of recipient for some types of requests (256 char max) --> unused for now
         *  name: string,     // [OPTIONAL] A friendly display name to be associated with the requestee. (150 char max)
         *  text: string,     // [OPTIONAL] Message to send --> unused for now
         *  send: string,     // [OPTIONAL] Values server|client --> unused for now
         *  locale: string,   // [OPTIONAL] Locale for localized resources --> unused for now
         *  brand: string,    // [OPTIONAL] Defines any sub-brand customization for the invite --> unused for now
         * }
		 */
		this.createRequest = function(config)
		{
			if (!config || !config.type || config.type !== REQUEST_TYPES.LINK)
			{
				dbg('"type" must be provided (NOTE: only Defines.CARDS.REQUEST_TYPES.LINK type is supported for now)', config, 3);
				return;
			}

			var url = svr + 'users/self/create_request?' + $.param(config);

			$.ajax({
				url: url,
				method: 'POST',
				beforeSend: function(request)
				{
					request.setRequestHeader('Authorization', 'Bearer ' + token);
				},
				dataType: 'json',
				contentType: 'application/json'
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
						result.response = data.response;
					}
					else
					{
						result.response = data.meta;
					}
				}
				controller.notify(m.CreateRequestStatus, result);
			}
		};

		this.delete = function() {
			//delete all storages for this account
			deleteSettings();

			controller.notify(m.AccountDeleteStatus, { status: true });
		};

		///////////////////////////////////////////////////////////////////////////////
		// UTILITY
		///////////////////////////////////////////////////////////////////////////////

		function saveSettings()
		{
			currentEnvKeys[apiKey] = currentKeySettings;
			settings[idEnvironment] = currentEnvKeys;
			lib.setCfgVal(cAccountInfo, settings);
		}

		function getSettings()
		{
			settings = lib.getCfgVal(cAccountInfo) || {};
			currentEnvKeys = settings[idEnvironment] || {};
			currentKeySettings = currentEnvKeys[apiKey] || {};
		}

		function deleteSettings() {
			getSettings();
			currentKeySettings = {};
			saveSettings();
		}

		function getNewToken(callback)
		{
			$.getJSON(urlLogin, account)
				.done(function(data)
				{
					processLogin(data, callback);
				})
				.fail(processLogin);
		}

		function processLogin(data, callback)
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

						currentKeySettings[cAcctTokenName] = token;
						saveSettings();

						//dbg('>> new token: ' + token);

						controller.notify(m.AccountLoginStatus, { status: true, token: token, id: account[cSvcUserName] });

						if (callback)
						{
							callback();
						}

						return;
					}

					if (data.result === 'failure')
					{
						var meta = data.meta || {};
						result.error = meta[cSvcError];
						result.errorDetail = meta[cSvcErrorDetail];

						controller.notify(m.AccountLoginStatus, result);

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
			controller.notify(m.AccountLoginStatus, result);
		}

		function getUserInfo(userId, checkToken)
		{
			var apiUrl = svr + 'users/' + (userId || 'self');

			$.getJSON(apiUrl, { oauth_token: token })
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
						result.response = data.response;
						result.response.userId = userId;
					}
					else if (data.meta && data.meta.error === 'oauth_token')
					{
						getNewToken(function()
						{
							getUserInfo(userId);
						});
						// do not send failure -> get new token and retry
						return;
					}
					else
					{
						result.response = data.meta;
					}
				}
				if (checkToken)
				{
					controller.notify(m.AccountLoginStatus, {
						status: true,
						token: token,
						id: currentKeySettings[cUserName]
					});
				}
				else
				{
					controller.notify(m.UserInfoStatus, result);
				}
			}
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

					currentKeySettings[cUserName] = id;
					currentKeySettings[cPassword] = pw;
					saveSettings();
					//dbg('>> new account: ' + id + ' / ' + pw);

					result.status = true;
					result.response = resp;

					controller.notify(m.AccountCreateStatus, result);

					// AuthToken will be loaded on next request requiring authentication
					// ---> Avoids race conditions if app reacts to AccountCreateStatus without
					//      waiting for AccountLoginStatus
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
			controller.notify(m.AccountCreateStatus, result);
		}
	}

	// Account defines

	// Environment
	Account.EnvProduction = 'prod';
	Account.EnvSandbox = 'sbox';



	module.exports = Account;
});
