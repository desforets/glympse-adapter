///////////////////////////////////////////////////////////////////////////////
// AJAX requests utilities
///////////////////////////////////////////////////////////////////////////////

define(function(require, exports, module)
{

	'use strict';

	var lib = require('glympse-adapter/lib/utils');

	var MAX_ATTEMPTS = 3;
	var DEFAULT_OPTIONS = {
		ALL: {
			dataType: 'json'
		},

		POST: {
			contentType: 'application/json'
		}
	};


	function processResponse(account)
	{
		var that = this;

		return function(data)
		{
			// arguments
			// data|jqXHR, textStatus, jqXHR|errorThrown

			var result = {
				status: false,
				response: {}
			};

			that.attempts--;

			if (data && data.response)
			{
				if (data.result === 'ok')
				{
					result.status = true;
					result.response = data.response;
					result.time = data.meta && data.meta.time;

					that.request.resolve(result);

					return;
				}

				if (data.result === 'failure')
				{
					var meta = data.meta || {};

					result.response = meta;
					// check if we need them, left for now for backward compatibility
					result.error = meta.error;
					result.errorDetail = meta.error_detail;

					// in case of token error try to get new token & re-run action
					if (meta.error === 'oauth_token')
					{
						if (account)
						{
							account.generateToken(function(authResult)
							{
								if (authResult.status)
								{
									if (that.retry)
									{
										that.retry();
									}
								}
								else
								{
									result.authResult = authResult;

									that.request.resolve(result);
								}
							});

							return;
						}
						else
						{
							// should never happen
							console.warn('[ajax] invalid token for not authorized request!');
							result.invalidToken = true;
						}
					}

					that.request.resolve(result);

					return;
				}
			}

			if (that.retry && that.attempts > 0)
			{
				var attempt = (MAX_ATTEMPTS - that.attempts);
				setTimeout(
					function()
					{
						that.retry();
					},
					// Incremental + random offset delay between retry in case of short availability outage
					(attempt * (500 + Math.round(1000 * Math.random())))
				);

				result.info = { attempt: attempt, result: data };

				that.request.notify(result);

				return;
			}

			result.info = { status: 'max_attempts', lastResult: data };

			that.request.resolve(result);
		};
	}

	var api = {
		/**
		 * @function ajax.makeRequest
		 *
		 * @param {object} jqOptions - options for jQuery ajax method
		 * @param {object} [auth] - authorization data (required for auth requests)
		 * @param {object} [auth.account] - account instance
		 * @param {boolean} [auth.useBearer] - if should use bearer auth header instead of url param (default: true)
		 * @param {boolean} [retryOnError] - if should re-try on temporary server errors (default: true)
		 *
		 * @returns {$.Deferred}
		 */
		makeRequest: function makeRequest(jqOptions, auth, retryOnError)
		{
			var options = $.extend(
				{},
				DEFAULT_OPTIONS.ALL,
				jqOptions
			);
			var account;
			if (auth)
			{
				var useBearer = true;
				if (auth.account)
				{
					account = auth.account;
					useBearer = (auth.useBearer === false);
				}
				else
				{
					account = auth;
				}
				if (useBearer === false)
				{
					if (options.url.indexOf('?') === -1)
					{
						options.url += '?';
					}
					else
					{
						options.url += '&';
					}
					options.url += ('oauth_token=' + account.getToken());
				}
				else
				{
					options.beforeSend = function(request)
					{
						request.setRequestHeader('Authorization', 'Bearer ' + account.getToken());
					};
				}
			}

			var context = {
				request: $.Deferred(),
				attempts: ((retryOnError === false) ? 1 : MAX_ATTEMPTS),
				retry: function()
				{
					// console.debug('[ajax] retry', options);
					$.ajax(options).always(processResponse.call(context, account));
				}
			};

			$.ajax(options).always(processResponse.call(context, account));

			return context.request;
		},

		/**
		 * @function ajax.get
		 */
		get: function reqGet(url, data, auth, jqOptions, retryOnError)
		{
			var options = $.extend(
				{
					url: url,
					type: 'GET',
					data: data
				},
				jqOptions
			);
			return api.makeRequest(options, auth, retryOnError);
		},

		/**
		 * @function ajax.post
		 */
		post: function reqPost(url, data, auth, jqOptions, retryOnError)
		{
			var options = $.extend(
				{
					url: url,
					type: 'POST'
				},
				DEFAULT_OPTIONS.POST,
				jqOptions
			);

			if (data)
			{
				if (options.contentType === 'application/json')
				{
					data = JSON.stringify(data);
				}
				options.data = data;
			}

			return api.makeRequest(options, auth, retryOnError);
		},

		/**
		 * @function ajax.delete
		 */
		delete: function reqDelete(url, auth, jqOptions, retryOnError)
		{
			var options = $.extend(
				{
					url: url,
					type: 'DELETE'
				},
				DEFAULT_OPTIONS.POST,
				jqOptions
			);
			return api.makeRequest(options, auth, retryOnError);
		}

	};

	module.exports = api;

});
