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


	function processResponse()
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

					that.request.resolve(result);

					return;
				}

				if (data.result === 'failure')
				{
					var meta = data.meta || {};

					if (meta.error === 'oauth_token')
					{
						//FixMe: [oauth_token] deal with expired/invalid tokens here
						// need to generate new token for account & retry request
						result.invalidToken = true;
					}

					result.response = meta;
					// check if we need them, left for now for backward compatibility
					result.error = meta.error;
					result.errorDetail = meta.error_detail;

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
		 */
		makeRequest: function makeRequest(jqOptions, authToken, retryOnError)
		{
			var options = $.extend(
				{},
				DEFAULT_OPTIONS.ALL,
				jqOptions
			);
			if (authToken)
			{
				options.beforeSend = function(request)
				{
					request.setRequestHeader('Authorization', 'Bearer ' + authToken);
				};
			}

			var context = {
				request: $.Deferred(),
				attempts: ((retryOnError === false) ? 1 : MAX_ATTEMPTS),
				retry: function()
				{
					//TODO: remove debug info
					console.warn('[ajax] retry', options);
					$.ajax(options).always(processResponse.call(context));
				}
			};

			$.ajax(options).always(processResponse.call(context));

			return context.request;
		},

		/**
		 * @function ajax.get
		 */
		get: function reqGet(url, data, authToken, jqOptions, retryOnError)
		{
			var options = $.extend(
				{
					url: url,
					type: 'GET',
					data: data
				},
				jqOptions
			);
			return api.makeRequest(options, authToken, retryOnError);
		},

		/**
		 * @function ajax.post
		 */
		post: function reqPost(url, data, authToken, jqOptions, retryOnError)
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

			return api.makeRequest(options, authToken, retryOnError);
		},

		/**
		 * @function ajax.delete
		 */
		delete: function reqDelete(url, authToken, jqOptions, retryOnError)
		{
			var options = $.extend(
				{
					url: url,
					type: 'DELETE'
				},
				DEFAULT_OPTIONS.POST,
				jqOptions
			);
			return api.makeRequest(options, authToken, retryOnError);
		}

	};

	module.exports = api;

});
