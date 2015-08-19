define(function(require, exports, module)
{
    'use strict';

	var lib = require('glympse-adapter/lib/utils');
	var MemberInvite = require('glympse-adapter/adapter/models/MemberInvite');
	var MemberPermissions = require('glympse-adapter/adapter/models/MemberPermissions');
	var MemberTicket = require('glympse-adapter/adapter/models/MemberTicket');


	// Exported class
	function Member(data, cfg)
	{
		// state
		var invite;
		var permissions;
		var ticket;

		// consts
		var dbg = lib.dbg('Member', cfg.dbg);

		// TODO: Just map data props directly??
		//	---> Only want immediate non-Objects/Arrays
		var props = [ 'status'
					, 'card_id'
					, 'alias'
					, 'last_modified'
					, 'created_time'
					, 'id'
					];



		///////////////////////////////////////////////////////////////////////////////
		// PROPERTIES
		///////////////////////////////////////////////////////////////////////////////

		// NOTE: some properties created via lib.mapProps

		this.getInvite = function()
		{
			return invite;
		};

		this.getPermissions = function()
		{
			return permissions;
		};

		this.getTicket = function()
		{
			return ticket;
		};

		this.getMetaData = function()
		{
			return data.metadata;
		};

		this.getData = function()
		{
			return data;
		};

		this.setData = function(val)
		{
			data = val;
			lib.mapProps(this, props, data);

			//invite = (data.invite) ? new MemberInvite(data.invite, cfg) : {};
			//ticket = (data.ticket) ? new MemberTicket(data.ticket, cfg) : {};
			//permissions = (data.permissions) ? new MemberPermissions(data.permissions, cfg) : {};
			invite = new MemberInvite(data.invite, cfg);
			ticket = new MemberTicket(data.ticket, cfg);
			permissions = new MemberPermissions(data.permissions, cfg);
		};



		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////

		this.toJSON = function()
		{
			return data;
		};


		///////////////////////////////////////////////////////////////////////////////
		// UTILITY
		///////////////////////////////////////////////////////////////////////////////


		///////////////////////////////////////////////////////////////////////////////
		// CTOR
		///////////////////////////////////////////////////////////////////////////////

		this.setData(data);
	}

	// Member defines


	module.exports = Member;
});
