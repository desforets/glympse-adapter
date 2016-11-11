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
		var dbg = lib.dbg('GlympseAdapter', cfgApp.dbg);

		var client;			// client mode
		var host;			// host mode
		var hostElement;	// host mode
		var oasisLocal;


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

		this.loadViewer = function(cfgNew, viewer)
		{
			return (client && client.loadViewer(cfgNew, viewer));
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

		this.client = function(viewerHtmlElement)
		{
			if (host || client)
			{
				return;
			}

			client = new Client(this
							   , oasisLocal
							   , controller
							   , cfg
							   , viewerHtmlElement && viewerHtmlElement[0]
							   );

			client.init({ id: VersionInfo.id
						, version: VersionInfo.version
						});
		};


		///////////////////////////////////////////////////////////////////////////////
		// INTERNAL
		///////////////////////////////////////////////////////////////////////////////


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
