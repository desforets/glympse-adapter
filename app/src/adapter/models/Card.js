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
		var svr = cfg.svcGlympse;

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
			, 'inviter'
			, 'invitee'
			, 'details'
		];


		///////////////////////////////////////////////////////////////////////////////
		// PROPERTIES
		///////////////////////////////////////////////////////////////////////////////

		// NOTE: some properties created via lib.mapProps

		this.getMembers = function()
		{
			return members;
		};

		this.getMemberById = function(id) {
			return getMemberById(id);
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
			var mem, member;

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

		this.setDataFromStream = function(streamArray, time) {
			var cardId = this.getIdCard();
			var newMembers = [],
				newJoinCardInvites = [],
				updateResult,
				action,
				member,
				i, len;

			var mem, msg, members;
			var cleanActions = {};
			var cleanStream = [];

			// Loop through the updates, culling out entries where only the
			// latest update matters (i.e. ticket invites shared).
			// Hash on action, then members under the action
			for (i = 0, len = streamArray.length; i < len; i++)
			{
				action = streamArray[i];
				var actionType = action.type;

				// Pass anything that isn't a share for now
				if (actionType !== 'member_started_sharing')
				{
					cleanStream.push(action);
					continue;
				}

				var ref = cleanActions[actionType];
				mem = action.data.member_id || action.member_id;

				if (!ref)
				{
					members = {};
					members[mem] = action;
					cleanActions[action.type] = members;
				}
				else
				{
					msg = ref[mem];
					if (!msg)
					{
						ref[mem] = action;
					}
					else
					{
						if (msg.last_modified < action.last_modified)
						{
							ref[mem] = action;
						}
					}
				}
			}

			// Re-add the final pruned items
			for (i in cleanActions)
			{
				members = cleanActions[i];
				for (mem in members)
				{
					cleanStream.push(members[mem]);
				}
			}

			// Finally, process the cleaned up actions
			for (i = 0, len = cleanStream.length; i < len; i++)
			{
				action = cleanStream[i];
				updateResult = {
					card: this,
					action: action.type,
					t: time
				};

				switch (action.type)
				{
					case 'member_added':
						newMembers.push(action.data.member_id);
						break;
					case 'member_removed':
						member = removeMemberById(action.data ? action.data.member_id : action.member_id);
						updateResult.member = member;
						updateResult.userId = action.data ? action.data.user_id : action.user_id;
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
						if (!member)
						{
							member = addMember($.extend({ id: action.member_id }, action.data));
						}
						else
						{
							//remove previous invite code if member was sharing lately
							removeMemberInviteCode(member);
							member.setData(action.data);
						}
						updateResult.invite = checkMemberInviteCode(member);
						updateResult.userId = action.user_id;
						controller.notify(m.CardUpdated, updateResult);
						break;
					case 'member_stopped_sharing':
						member = getMemberById(action.member_id);
						updateResult.invite = getMemberInviteCode(member);
						updateResult.userId = action.user_id;
						controller.notify(m.CardUpdated, updateResult);
						break;
					case 'card_modified':
						//mark to update on next poll
						this.dirty = true;
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
					newMember = getMemberById(result.response.id);
					if (newMember)
					{
						newMember.setData(result.response);
					}
					else
					{
						newMember = addMember(result.response);
					}
					controller.notify(m.CardUpdated, {
						card: that,
						action: 'member_added',
						member: newMember
					});
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
					controller.notify(m.CardUpdated, {
						card: that,
						action: 'invite_added',
						invite: newInvite
					});
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

			if (typeof memberIndex === 'undefined')
			{
				dbg('!!! no member to delete', id, 3);
				return null;
			}

			delete membersIndex[id];
			removedMember = members.splice(memberIndex, 1)[0];

			// update index
			for (var i = memberIndex, len = members.length; i < len; i++)
			{
				membersIndex[members[i].getId()] = i;
			}

			return removedMember || null;
		}

		function checkMemberInviteCode(member) {
			var inviteCode = getMemberInviteCode(member);

			if (inviteCode && typeof inviteCodesIndex[inviteCode] === 'undefined')
			{
				return addInviteCode(inviteCode);
			}

			return inviteCode;
		}

		function getMemberInviteCode(member) {
			if (!member)
			{
				dbg('!!! can\'t get invite: no member provided', member, 3);
				return undefined;
			}
			var ticket = member.getTicket();
			return ticket && ticket.getInviteCode();
		}

		function removeMemberInviteCode(member) {
			var inviteCode = getMemberInviteCode(member);

			if (inviteCode && inviteCodesIndex[inviteCode])
			{
				return removeInviteCode(inviteCode);
			}
		}

		function addInviteCode(inviteCode)
		{
			// Ensure an invite is specified only once for each card
			if (inviteCodesIndex[inviteCode])
			{
				return inviteCode;
			}

			inviteCodesIndex[inviteCode] = inviteCodes.length;
			inviteCodes.push(inviteCode);

			return inviteCode;
		}

		function removeInviteCode(inviteCode) {
			var inviteIndex = inviteCodesIndex[inviteCode],
				removedInviteCode;

			if (typeof inviteIndex === 'undefined')
			{
				dbg('!!! no invite to delete', inviteCode, 3);
				return null;
			}

			delete inviteCodesIndex[inviteCode];
			removedInviteCode = inviteCodes.splice(inviteIndex, 1)[0];

			// update index
			for (var i = inviteIndex, len = inviteCodes.length; i < len; i++)
			{
				inviteCodesIndex[inviteCodes[i]] = i;
			}

			return removedInviteCode || null;
		}

		function addJoinInvite(inviteData) {
			var invite = inviteData;

			joinInvitesIndex[inviteData.id] = joinInvites.length;
			joinInvites.push(invite);

			return invite;
		}

		function removeJoinInviteById(inviteId) {
			var inviteIndex = joinInvitesIndex[inviteId],
				removedInvite;

			if (typeof inviteIndex === 'undefined')
			{
				dbg('!!! no join invite to delete', inviteId, 3);
				return null;
			}

			delete joinInvitesIndex[inviteId];
			removedInvite = joinInvites.splice(inviteIndex, 1)[0];

			// update index
			for (var i = inviteIndex, len = joinInvites.length; i < len; i++)
			{
				joinInvitesIndex[joinInvites[i]] = i;
			}

			return removedInvite || null;
		}

		///////////////////////////////////////////////////////////////////////////////
		// CTOR
		///////////////////////////////////////////////////////////////////////////////
	}

	// Card defines


	module.exports = Card;
});
