// App entry point
define(function(require, exports, module)
{
    'use strict';

	var Defines =
	{
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

		, REQUEST_LOCAL: {
			  getInvites: 'getInvites'
			, getMap: 'getMap'
		}


		/////////////////////////////////////////
		// Notification messages
		/////////////////////////////////////////

		, MSG: {
			  DataUpdate: 'DataUpdate'
			, StateUpdate: 'StateUpdate'
			, ViewerInit: 'ViewerInit'
			, ViewerReady: 'ViewerReady'
		}


		///////////////////////////////////////////////////
		// State updates -- probably will move/remove
		///////////////////////////////////////////////////

		, STATE: {
			  Arrived: 'Arrived'
			, Avatar: 'Avatar'
			, Eta: 'Eta'
			, Expired: 'Expired'
			, Name: 'Name'
			, NoInvites: 'NoInvites'
			, Phase: 'Phase'
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
