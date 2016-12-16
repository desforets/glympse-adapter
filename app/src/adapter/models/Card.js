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
		//card join invites collection
		var joinInvites = [];
		var joinInvitesIndex = {};

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

				if (addedInviteCode)
				{
					controller.notify(m.CardUpdated, {
						card: that,
						action: 'invite_code_found',
						invite: addedInviteCode
					});
				}
			}

			dbg('Card "' + this.getName() + '" ready with ' + members.length + ' members');
		};

		this.setDataFromStream = function(streamArray) {
			var cardId = this.getIdCard();
			var newMembers = [],
				newJoinCardInvites = [],
				updateResult,
				action,
				member,
				i, len;
			for (i = 0, len = streamArray.length; i < len; i++)
			{
				action = streamArray[i];
				updateResult = {
					card: this,
					action: action.type
				};
				switch (action.type)
				{
					case 'member_added':
						newMembers.push(action.data.member_id);
						break;
					case 'member_removed':
						member = removeMemberById(action.data ? action.data.member_id : action.member_id);
						updateResult.member = member;
						controller.notify(m.CardUpdated, updateResult);
						break;
					case 'invite_added':
						newJoinCardInvites.push(action.data.invite_id);
						break;
					case 'invite_removed':
						updateResult.invite = removeJoinInviteById(action.data.invite_id);
						controller.notify(m.CardUpdated, updateResult);
						break;
					case 'member_started_sharing':
						member = getMemberById(action.member_id);
						member.setData(action.data);
						updateResult.invite = checkMemberInviteCode(member);
						updateResult.userId = action.user_id;
						controller.notify(m.CardUpdated, updateResult);
						break;
					case 'member_stopped_sharing':
						member = getMemberById(action.member_id);
						updateResult.invite = removeMemberInviteCode(member);
						updateResult.userId = action.user_id;
						controller.notify(m.CardUpdated, updateResult);
						break;

					default:
						updateResult.data = action;
						controller.notify(m.CardUpdated, updateResult);
				}
			}

			var batchRequests = [];

			for (i = 0, len = newMembers.length; i < len; i++)
			{
				batchRequests.push({
					name: 'members',
					url: 'cards/' + cardId + '/members/' + newMembers[i],
					method: 'GET'
				});
			}

			for (i = 0, len = newJoinCardInvites.length; i < len; i++)
			{
				batchRequests.push({
					name: 'invites',
					url: 'cards/' + cardId + '/invites/' + newJoinCardInvites[i],
					method: 'GET'
				});
			}

			// Batch request
			if (batchRequests.length) {
				ajax.batch(svr + 'batch', batchRequests, account)
					.then(function(responses) {
						var response;
						for (i = 0, len = responses.length; i < len; i++)
						{
							response = responses[i];
							switch (response.name) {
								case 'invites':
									processInviteResult(response.result);
									break;
								case 'members':
									processMemberResult(response.result);
									break;
							}
						}
					});
			}

			function processMemberResult(result)
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

			function processInviteResult(result)
			{
				var newInvite;
				if (result.status)
				{
					newInvite = addJoinInvite(result.response);
					updateResult.invite = newInvite;
					controller.notify(m.CardUpdated, updateResult);
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

		function addJoinInvite(inviteData) {
			var invite = inviteData;

			joinInvitesIndex[inviteData.invite_id] = joinInvites.length;
			joinInvites.push(invite);

			return invite;
		}

		function removeJoinInviteById(inviteId) {
			var inviteIndex = joinInvitesIndex[inviteId],
				removedInvite;

			delete joinInvitesIndex[inviteId];
			removedInvite = inviteCodes.splice(inviteIndex, 1)[0];

			return removedInvite || null;
		}

		///////////////////////////////////////////////////////////////////////////////
		// CTOR
		///////////////////////////////////////////////////////////////////////////////
	}

	// Card defines


	module.exports = Card;
});
