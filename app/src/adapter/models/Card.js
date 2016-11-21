define(function(require, exports, module)
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
		var members = [];
		var membersIndex = {};
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

		this.getMembers = function()
		{
			return members;
		};

		this.getMetaData = function()
		{
			return data.metadata;
		};

		this.isLoaded = function()
		{
			return loaded;
		};

		this.getIdCard = function()
		{
			return idCard;
		};

		this.getData = function()
		{
			return data;
		};

		this.setData = function(val)
		{
			loaded = true;

			data = val;
			lib.mapProps(this, props, data);

			var mems = data.members || [];
			var mem, member, invite;
			var allMembersIds = [];
			var allShares = [];
			for (var i = 0, len = mems.length; i < len; i++)
			{
				mem = mems[i];
				allMembersIds.push(mem.id);
				if (membersIndex[mem.id])
				{
					member = membersIndex[mem.id];
				}
				else
				{
					member = new Member(mem, cfg);
					membersIndex[mem.id] = member;
					members.push(member);

					controller.notify(m.CardUpdated, {
						card: that,
						action: 'member_added',
						member: member
					});
				}

				invite = member.getTicket().getInviteCode();
				//console.log('  [' + j + ']: ' + invite);
				if (invite)
				{
					allShares.push(invite);
					if (currentlySharing.indexOf(invite) === -1)
					{
						currentlySharing.push(invite);

						controller.notify(m.CardUpdated, {
							card: that,
							action: 'invite_added',
							invite: invite
						});
					}
				}
			}
			// (use while to allow deleting in the loop)
			i = currentlySharing.length;
			while (i--)
			{
				invite = currentlySharing[i];
				if (allShares.indexOf(invite) === -1)
				{
					currentlySharing.splice(i, 1);

					controller.notify(m.CardUpdated, {
						card: that,
						action: 'invite_removed',
						invite: invite
					});
				}
			}
			i = members.length;
			while (i--)
			{
				member = members[i];
				if (allMembersIds.indexOf(member.getId()) === -1)
				{
					members.splice(i, 1);
					delete membersIndex[member.getId()];

					controller.notify(m.CardUpdated, {
						card: that,
						action: 'member_removed',
						member: member
					});
				}
			}

			dbg('Card "' + this.getName() + '" ready with ' + members.length + ' members');
		};

		this.getInvites = function()
		{
			return currentlySharing;
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
	}

	// Card defines


	module.exports = Card;
});
