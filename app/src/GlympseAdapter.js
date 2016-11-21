// App entry point
define(function(require, exports, module)
{
	'use strict';

	// Polyfills - external
	require('UUID');
	require('kamino');
	require('MessageChannel');

	// imports
	var lib = require('glympse-adapter/lib/utils');
	var Oasis = require('oasis');
	var VersionInfo = require('glympse-adapter/VersionInfo');
	var Client = require('glympse-adapter/adapter/Client');
	var Host = require('glympse-adapter/adapter/Host');


	// Faked AMD module setup -- necessary??
	if (!window.Oasis)
	{
		window.Oasis = Oasis;			// Needed for some Oasis modules
	}


	function GlympseAdapter(controller, cfg)
	{
		var cfgApp = (cfg && cfg.app) || {};
		var cfgAdapter = (cfg && cfg.adapter) || {};
		var dbg = lib.dbg('GlympseAdapter', cfgApp.dbg);

		var client;			// client mode
		var host;			// host mode
		var hostElement;	// host mode
		var oasisLocal;
		var that = this;

		var glympserLoader = null;


		///////////////////////////////////////////////////////////////////////////////
		// API endpoint namespace (updated at runtime)
		///////////////////////////////////////////////////////////////////////////////

		this.map = {};
		this.cards = {};
		this.ext = {};
		this.core = {};


		///////////////////////////////////////////////////////////////////////////////
		// PROPERTIES
		///////////////////////////////////////////////////////////////////////////////

		//this.getViewer = function()
		//{
		//	return (client && client.getViewer());
		//};


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.loadViewer = function(cfgNew, mapHtmlElement)
		{
			if (!glympserLoader)
			{
				dbg('adapter must be initialized in in client mode first', null, 3);
				return;
			}
			glympserLoader.done(function()
			{
				client.loadViewer(cfgNew, mapHtmlElement);
			});
		};

		this.host = function(cfgHost)
		{
			if (host || client)
			{
				return hostElement;
			}

			host = new Host(this, oasisLocal, cfg);
			hostElement = host.init(cfgHost);

			return hostElement;
		};

		this.client = function(mapHtmlElement)
		{
			if (host || client)
			{
				return;
			}

			glympserLoader = loadGlympser();

			glympserLoader.done(function()
			{
				client = new Client(that
					, oasisLocal
					, controller
					, cfg
					, (mapHtmlElement && mapHtmlElement[0])
				);

				client.init({
					id: VersionInfo.id
					, version: VersionInfo.version
				});
			});
		};


		///////////////////////////////////////////////////////////////////////////////
		// INTERNAL
		///////////////////////////////////////////////////////////////////////////////

		function loadGlympser()
		{
			var loader = $.Deferred();
			if ($.fn.glympser)
			{
				dbg('glympser loader is already included in the page - use existing.');
				loader.resolve();
			}
			else
			{
				var loaderUrl = getGlympserLoaderUrl();
				dbg('loading glympser loader from', loaderUrl);
				$.getScript(loaderUrl)
					.done(function()
					{
						loader.resolve();
					})
					.fail(function()
					{
						dbg('Failed to load Loader script:', arguments, 3);
						loader.reject();
					});
			}
			return loader;
		}

		function getGlympserLoaderUrl()
		{
			if (cfgAdapter.loaderPath)
			{
				return cfgAdapter.loaderPath;
			}

			var env = (cfgAdapter.loaderEnvironment === 'sandbox' ? 'dev.' : '');
			var version = (cfgAdapter.loaderVersion || 'latest');

			return '//' + env + 'glympse.com/js/loader/' + version + '/jquery.glympser.min.js';
		}

		///////////////////////////////////////////////////////////////////////////////
		// CTOR
		///////////////////////////////////////////////////////////////////////////////

		oasisLocal = new Oasis();			// Found in minified source
		oasisLocal.autoInitializeSandbox();	// Found in minified source
		oasisLocal.configure('allowSameOrigin', true);
	}


	// Global namespace registration
	if (!window.glympse)
	{
		window.glympse = {};
	}

	if (!window.glympse.GlympseAdapter)
	{
		window.glympse.GlympseAdapter = GlympseAdapter;
	}

	module.exports = GlympseAdapter;
});
