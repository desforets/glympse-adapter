define(function(require, exports, module)
{
    'use strict';

	var lib = require('glympse-adapter/lib/utils');
	var ajax = require('glympse-adapter/lib/ajax');
	var Defines = require('glympse-adapter/GlympseAdapterDefines');
	var m = Defines.MSG;
	var cModuleId = 'GlympseInvite';


	// Exported class
	function GlympseInvite(controller, idInvite, account, cfg)
	{
		// consts
		var dbg = lib.dbg(cModuleId, cfg.dbg);
		var svr = (cfg.svcGlympse || '//api.glympse.com/v2/');
		var inviteUrl = (svr + 'invites/' + idInvite);
		var cMaxAttempts = 3;

		// state
		var next = 0;
		var data;
		var error;
		var loaded = false;
		var that = this;
		var inviteParams = { 'no_count': true, 'next': next };

		// TODO: Just map data props directly??
		//	---> Only want immediate non-Objects/Arrays
		var props = [ 'first'
					, 'last'
					, 'next'
					, 'properties'
					, 'type'
					];


		///////////////////////////////////////////////////////////////////////////////
		// PROPERTIES
		///////////////////////////////////////////////////////////////////////////////

		// NOTE: some properties created via lib.mapProps

		this.isLoaded = function()
		{
			return loaded;
		};

		this.getIdInvite = function()
		{
			return idInvite;
		};

		this.getError = function()
		{
			return error;
		};

		this.getData = function()
		{
			return data;
		};

		// NOTE: make available in case of invalid invite
		this.getReference = function()
		{
			return data && data.reference;
		};

		this.setData = function(val)
		{
			data = val;
			data.location = null;	// Don't cache location!
			lib.mapProps(this, props, data);

			//dbg('Invite "' + this.getIdInvite() + '" loaded (reference: "' + this.getReference() + '")');
		};

		this.setAccount = function(val)
		{
			account = val;
		};


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.load = function()
		{
			if (!idInvite || !account)
			{
				return false;
			}

			// Kick off invite load
			error = null;

			loadInvite();

			return true;
		};

		this.toString = function()
		{
			return '[' + cModuleId + ']: ' + JSON.stringify(data);
		};

		this.toJSON = function()
		{
			return data || error;
		};


		///////////////////////////////////////////////////////////////////////////////
		// UTILITY
		///////////////////////////////////////////////////////////////////////////////

		function loadInvite()
		{
			controller.notify(m.InviteInit, idInvite);

			ajax.get(inviteUrl, inviteParams, account)
				.then(function(result)
				{
					if (result.status)
					{
						loaded = true;
						that.setData(result.response);
					}
					// max attempts
					else if (result.info)
					{
						// left as it was before for now
						error = {
							error: 'load_failure',
							error_detail: 'Failed ' + cMaxAttempts + ' attempts'
						};
					}
					else
					{
						error = result.response;
						error.id = lib.normalizeInvite(idInvite);
					}

					controller.notify(m.InviteReady, that);
				});
		}


		///////////////////////////////////////////////////////////////////////////////
		// CTOR
		///////////////////////////////////////////////////////////////////////////////
	}

	// GlympseInvite defines


	module.exports = GlympseInvite;
});
