// App entry point
define(function(require, exports, module)
{
    'use strict';

	var Defines =
	{
		PORT: 'glympse'
		, MAP: {

			/////////////////////////////////////////
			// API Endpoints - host and client
			/////////////////////////////////////////

			REQUESTS: {
				  addInvites: 'addInvites'
				, addGroups: 'addGroups'
				, addMarkers: 'addMarkers'
				, addTwitterTopics: 'addTwitterTopics'
				, addTwitterUsers: 'addTwitterUsers'
				, refreshView: 'refreshView'
				, removeInvites: 'removeInvites'
				, setApiServices: 'setApiServices'
				, setPadding: 'setPadding'
				, setUserInfo: 'setUserInfo'	// Send-only... break it out?
				, updateSetting: 'updateSetting'
			}


			/////////////////////////////////////////
			// API Endpoints: client-only
			/////////////////////////////////////////

			, REQUESTS_LOCAL: {
				  getInvites: 'getInvites'
				, getMap: 'getMap'
				, getMapContainer: 'getMapContainer'
				, generateRoute: 'generateRoute'
				, ignoreDestinations: 'ignoreDestinations'
			}
		}

		, CARDS: {

			/////////////////////////////////////////
			// API Endpoints - host and client
			/////////////////////////////////////////

			REQUESTS: {
				requestCards: 'requestCards'
				//  addInvites: 'addInvites'
				//, getInvites: 'getInvites'
				//, removeInvites: 'removeInvites'
				//, setServices: 'setServices'
				//, updateSetting: 'updateSetting'
			}


			/////////////////////////////////////////
			// API Endpoints: client-only
			/////////////////////////////////////////

			, REQUESTS_LOCAL: {
				getCards: 'getCards'
				, joinRequest: 'joinRequest'
			}

			/////////////////////////////////////////
			// API Endpoints: client-only
			/////////////////////////////////////////

			, REQUEST_TYPES: {
				LINK: 'link'
				, CLIPBOARD: 'clipboard'
				, SMS: 'sms'
				, EMAIL: 'email'
				, ACCOUNT: 'account'
			}
		}

		, CORE: {

			/////////////////////////////////////////
			// API Endpoints - host and client
			/////////////////////////////////////////

			REQUESTS: {
			}


			/////////////////////////////////////////
			// API Endpoints: client-only
			/////////////////////////////////////////

			, REQUESTS_LOCAL: {
				accountCreate: 'accountCreate'
				, getUserInfo: 'getUserInfo'
				, setUserName: 'setUserName'
				, setUserAvatar: 'setUserAvatar'
			}
		}


		/////////////////////////////////////////
		// Notification messages
		/////////////////////////////////////////

		, MSG: {
			//Account Events
			  AccountCreateStatus: 'AccountCreateStatus'
		    , AccountInit: 'AccountInitComplete'
			, UserNameUpdateStatus: 'UserNameUpdateStatus'
			, UserAvatarUpdateStatus: 'UserAvatarUpdateStatus'
			, UserInfoStatus: 'UserInfoStatus'

		    , AdapterInit: 'AdapterInit'
			, AdapterReady: 'AdapterReady'

			//Card events
			, CardInit: 'CardInit'
			, CardReady: 'CardReady'
			, CardsInitEnd: 'CardsInitEnd'
			, CardsInitStart: 'CardsInitStart'
			, CardUpdated: 'CardUpdated'
			, CardAdded: 'CardAdded'
			, CardRemoved: 'CardRemoved'
			, CardsJoinRequestStatus: 'CardsJoinRequestStatus'

			, DataUpdate: 'DataUpdate'
			, InviteAdded: 'InviteAdded'
			, InviteClicked: 'InviteClicked'
			, InviteError: 'InviteError'
			, InviteInit: 'InviteInit'
			, InviteReady: 'InviteReady'
			, InviteRemoved: 'InviteRemoved'
			, Progress: 'Progress'
			, StateUpdate: 'StateUpdate'
			, ViewerInit: 'ViewerInit'
			, ViewerReady: 'ViewerReady'
		}


		///////////////////////////////////////////////////
		// State updates -- probably will move/remove
		///////////////////////////////////////////////////

		, STATE: {
			// Known data stream properties
			  Avatar: 'avatar'
			, Destination: 'destination'
			, Eta: 'eta'
			, InviteEnd: 'end_time'
			, InviteStart: 'start_time'
			, Message: 'message'
			, Name: 'name'
			, Owner: 'owner'
			, Phase: 'phase'

			// Additional meta-data state
			, Arrived: 'Arrived'	// needed?
			, Expired: 'Expired'
			, NoInvites: 'NoInvites'
		}
	};


	// Global namespace registration
	if (!window.glympse)
	{
		window.glympse = {};
	}

	if (!window.glympse.GlympseAdapterDefines)
	{
		window.glympse.GlympseAdapterDefines = Defines;
	}


	module.exports = Defines;
});
