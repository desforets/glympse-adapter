// App entry point
define(function(require, exports, module)
{
    'use strict';

	var Defines =
	{
		MAP: {

			/////////////////////////////////////////
			// API Endpoints - host and client
			/////////////////////////////////////////

			REQUESTS: {
				  addInvites: 'addInvites'
				, addGroups: 'addGroups'
				, addMarkers: 'addMarkers'
				, addTwitterTopics: 'addTwitterTopics'
				, addTwitterUsers: 'addTwitterUsers'
				, generateRoute: 'generateRoute'
				, ignoreDestinations: 'ignoreDestinations'
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
			}
		}

		, CARDS: {

			/////////////////////////////////////////
			// API Endpoints - host and client
			/////////////////////////////////////////

			REQUESTS: {
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
			}
		}


		/////////////////////////////////////////
		// Notification messages
		/////////////////////////////////////////

		, MSG: {
			  AdapterInit: 'AdapterInit'
			, AdapterReady: 'AdapterReady'
			, CardInit: 'CardInit'
			, CardReady: 'CardReady'
			, CardsInitEnd: 'CardsInitEnd'
			, CardsInitStart: 'CardsInitStart'
			, DataUpdate: 'DataUpdate'
			, InviteAdded: 'InviteAdded'
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
			, EndTime: 'end_time'
			, Eta: 'eta'
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
