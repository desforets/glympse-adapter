define(function (require, exports, module)
{
	'use strict';

	var lib = require('glympse-adapter/lib/utils');
	var Member = require('glympse-adapter/adapter/models/Member');
	var Defines = require('glympse-adapter/GlympseAdapterDefines');
	var m = Defines.MSG;


	// Exported class
	function Card(controller, idCard, cfg)
	{
		// state
		var data;
		var loaded = false;
		var members;
		var currentlySharing = [];
		var that = this;

		// constants
		var dbg = lib.dbg('Card', cfg.dbg);

		// TODO: Just map data props directly??
		//	---> Only want immediate non-Objects/Arrays
		var props = [
			'name'
			, 'type_id'
			, 'last_modified'
			, 'created_time'
			, 'id'
			, 'metadata_etag'
		];


		///////////////////////////////////////////////////////////////////////////////
		// PROPERTIES
		///////////////////////////////////////////////////////////////////////////////

		// NOTE: some properties created via lib.mapProps

		this.getMembers = function ()
		{
			return members;
		};

		this.getMetaData = function ()
		{
			return data.metadata;
		};

		this.isLoaded = function ()
		{
			return loaded;
		};

		this.getIdCard = function ()
		{
			return idCard;
		};

		this.getData = function ()
		{
			return data;
		};

		//TODO: merge members & send CardUpdated event
		this.setData = function (val)
		{
			loaded = true;

			data = val;
			lib.mapProps(this, props, data);

			var mems = data.members;
			var member, invite;
			var allShares = [];
			members = [];
			for (var i = 0, len = ((mems && mems.length) || 0); i < len; i++)
			{
				member = new Member(mems[i], cfg);
				members.push(member);
				invite = member.getTicket().getInviteCode();
				//console.log('  [' + j + ']: ' + invite);
				if (invite)
				{
					allShares.push(invite);
					if (currentlySharing.indexOf(invite) === -1)
					{
						currentlySharing.push(invite);
						//TODO: fill data on what happened, e.g. invite added/removed
						controller.notify(m.CardUpdated, that);
					}
				}
			}
			for (i = 0, len = currentlySharing.length; i < len; i++)
			{
				invite = currentlySharing[i];
				if (allShares.indexOf(invite) === -1)
				{
					currentlySharing.splice(i, 1);
					//TODO: fill data on what happened, e.g. invite added/removed
					controller.notify(m.CardUpdated, that);
				}
			}

			dbg('Card "' + this.getName() + '" ready with ' + members.length + ' members');
		};

		this.getInvites = function () {
			return currentlySharing;
		};


		///////////////////////////////////////////////////////////////////////////////
		// PUBLICS
		///////////////////////////////////////////////////////////////////////////////


		this.toJSON = function ()
		{
			return data;
		};


		///////////////////////////////////////////////////////////////////////////////
		// UTILITY
		///////////////////////////////////////////////////////////////////////////////


		///////////////////////////////////////////////////////////////////////////////
		// CTOR
		///////////////////////////////////////////////////////////////////////////////
	}

	// Card defines


	module.exports = Card;
});
