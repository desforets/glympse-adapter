define(function(require, exports, module)
{
	'use strict';

	var lib = require('glympse-adapter/lib/utils');
	var ajax = require('glympse-adapter/lib/ajax');
	var Member = require('glympse-adapter/adapter/models/Member');
	var Defines = require('glympse-adapter/GlympseAdapterDefines');
	var m = Defines.MSG;


	// Exported class
	function Card(controller, idCard, account, cfg)
	{
		var svr = (cfg.svcCards || '//api.cards.glympse.com/api/v1/');
		// state
		var data;
		var loaded = false;
		//members collection
		var members = [];
		var membersIndex = {};
		//inviteCodes collection
		var inviteCodes = [];
		var inviteCodesIndex = {};

		var that = this;
		var lastUpdated;

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

			for (var i = 0, len = mems.length; i < len; i++)
			{
				mem = mems[i];
				member = addMember(mem);

				controller.notify(m.CardUpdated, {
					card: that,
					action: 'member_added',
					member: member
				});

				var addedInviteCode = checkMemberInviteCode(member);

				controller.notify(m.CardUpdated, {
					card: that,
					action: 'invite_code_found',
					invite: addedInviteCode
				});
			}

			dbg('Card "' + this.getName() + '" ready with ' + members.length + ' members');
		};

		this.setDataFromStream = function(streamArray) {
			var cardId = this.getIdCard();
			var newMembers = [],
				updateResult,
				action,
				member,
				invite,
				inviteCode,
				i, len;
			for (i = 0, len = streamArray.length; i < len; i++)
			{
				action = streamArray[i];
				updateResult = {
					card: this,
					action: action.type,
					data: action.data
				};
				switch (action.type){
					case 'member_added':
						newMembers.push(action.data.member_id);
						break;
					case 'member_removed':
						member = removeMemberById(action.data.member_id);
						updateResult.member = member;
						controller.notify(m.CardUpdated, updateResult);
						break;
					// case 'invite_added':
					// case 'invite_removed':
					// 	controller.notify(m.CardUpdated, updateResult);
					// 	break;

					case 'member_started_sharing':
						member = getMemberById(action.member_id);
						member.setData(action.data);
						updateResult.invite = checkMemberInviteCode(member);
						controller.notify(m.CardUpdated, updateResult);
						break;
					case 'member_stopped_sharing':
						member = getMemberById(action.member_id);
						updateResult.invite = removeMemberInviteCode(member);
						controller.notify(m.CardUpdated, updateResult);
						break;

					default:
						controller.notify(m.CardUpdated, updateResult);
				}
			}

			for (i = 0, len = newMembers.length; i < len; i++)
			{
				//need to implement batch;
				ajax.get(svr + 'cards/' + cardId + '/members/' + newMembers[i], null, account)
					.then(processResult);
			}

			function processResult(result)
			{
				var newMember;
				if (result.status)
				{
					newMember = addMember(result.response);
					updateResult.member = newMember;
					controller.notify(m.CardUpdated, updateResult);
					checkMemberInviteCode(newMember);
				}
				else
				{
					controller.notify(m.CardUpdated, result);
				}
			}
		};

		this.getInvites = function()
		{
			return inviteCodes;
		};

		this.setLastUpdatingTime = function(time) {
			lastUpdated = time;
		};

		this.getLastUpdatingTime = function() {
			return lastUpdated;
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

		function addMember(memberData) {
			var member = new Member(memberData, cfg);
			membersIndex[memberData.id] = members.length;
			members.push(member);

			return member;
		}

		function getMemberById(id) {
			var memberIndex = membersIndex[id];
			return memberIndex >= 0 ? members[memberIndex] : null;
		}

		function removeMemberById(id) {
			var memberIndex = membersIndex[id],
				removedMember;

			delete membersIndex[id];
			removedMember = members.splice(memberIndex, 1)[0];

			return removedMember || null;
		}

		function checkMemberInviteCode(member) {
			var ticket = member.getTicket();
			var inviteCode = ticket && ticket.getInviteCode();

			if (inviteCode && typeof inviteCodesIndex[inviteCode] === 'undefined')
			{
				return addInviteCode(inviteCode);
			}

			return inviteCode;
		}

		function removeMemberInviteCode(member) {
			var ticket = member.getTicket();
			var inviteCode = ticket && ticket.getInviteCode();

			if (inviteCode && inviteCodesIndex[inviteCode])
			{
				return removeInviteCode(inviteCode);
			}
		}

		function addInviteCode(inviteCode) {

			inviteCodesIndex[inviteCode] = inviteCodes.length;
			inviteCodes.push(inviteCode);

			return inviteCode;
		}

		function removeInviteCode(inviteCode) {
			var inviteIndex = inviteCodesIndex[inviteCode],
				removedInviteCode;

			delete inviteCodesIndex[inviteCode];
			removedInviteCode = inviteCodes.splice(inviteIndex, 1)[0];

			return removedInviteCode || null;
		}

		///////////////////////////////////////////////////////////////////////////////
		// CTOR
		///////////////////////////////////////////////////////////////////////////////
	}

	// Card defines


	module.exports = Card;
});
