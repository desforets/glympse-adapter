#The Glympse Adapter

##Overview

The Glympse Adapter (GA) is a shim to be included with any web app wanting to directly host the
Glympse viewer for direct interaction with it, and to provide its public APIs over an iframe boundary
when it is intended to be used in conjunction with a GA instance running in host mode.

In addition, the API bridge provided by the GA maintains a mostly equivalent adaption of the Glympse
viewer API, save for some differences in event handler registration and callback signatures. These
(and all, really) will be described in detail. By default, the exposed set of endpoints are those of
the core Glympse Viewer API. Apps can also extend/override the GA endpoints with their own methods,
which are published to GA consumers during setup.



##Available modules
The following AMD modules are available for use when building a module-based application.
While intended for using GA as a client-based module, there should be no surprises even
if running in host-mode.

- `glympse-adapter/GlympseAdapter`: Main module to initialize the Glympse adapter/viewer
  components. See test/app.js or test-glympse-app/Main.js for reference usage.
- `glympse-adapter/GlympseAdapterDefines`: Plain Javascript Object that contains the
  reference to all enums used by the GlympseAdapter. Strongly recommended to be used
  in conjunction with the GlympseAdapter module.
- `glympse-adapter/VersionInfo`: Plain Javascript Object with build/version
  information of the GlympseAdapter.
- `glympse-adapter/lib/utils`: Static library containing utility functions useful
  for interacting with the GlympseAdapter module. [TODO: list available methods]

##Adapter Messages/Events

The following is a description of the various notification messages (or Events, if
using GA in it's host configuration) that are sent by the adapter (defined in the
`GlympseAdapterDefines.MSG` object):

- `AdapterInit` / `{ isCard: bool, t: string }`: Indicates the adapter is beginning
  its loading sequence with the passed card invite or the specified Glympse invite
  (indicated via the `t` parameter)
- `AdapterReady` / `{ cards:[ invites ], glympses: [ invites ]}`: Specifies the
  adapter has resolved all Card and Glympse invites and will begin the process
  of loading the specified Glympse invites. It should be noted that the adapter
  may return a card that was not specified in the `AdapterInit` phase, and may
  have changed the initial Glympse invite code, or included additional Glympse
  invites. This is due to the adapter detecting a Card invite reference in the
  initial Glympse invite code, and aligning the viewer to the Card reference and
  it's child Glympse invites.
- `CardInit` / `card_invite`: Fired just before an attempt is made to load the
  Card invite.
- `CardReady` / `card_invite`: Fired once the given Card invite has completed
  loading, regardless of success. Check the passed card's instance given upon
  the `CardsInitEnd` event.
- `CardsInitEnd` / `[ card_instance0, ..., card_instanceN ]`: Sent once all
  cards have been loaded. The passed array are a set of Card.js class instances
  that can be check for various properties/state. Please reference the `Card.js`
  Data Model section for available APIs.
  - Note that in GA Host mode, Card instances are not passed
- `CardsInitStart` / `[ card_invite0, ..., card_inviteN ]`: Notification sent
  just before Card data is loaded. The passed array is a list of the Card invite
  codes that will be loaded.
- `DataUpdate` / `{ id: glympse_invite_code, owner: glympse_user_account_id, card: card_id, data: [ property_0, ..., propertyM ] }`:
  Event passed from the Glympse API for a given Glympse invite code, for unknown/custom
  properties found in the Glympse's data stream. The format of property elements
  in the array are the same format as specified in the Glympse Data stream model:
  - `t`: Time property was generated
  - `n`: Property id
  - `v`: Property value (may be default type, or a custom Object with additional members)
- `InviteAdded` / `{ id: glympse_invite_code, owner: glympse_user_account_id, card: card_id }`:
  Sent from the Glympse viewer whenever a Glympse invite has been successfully
  loaded and added to the map.
- `InviteError` / `GlympseInvite.js instance`: An error occurred while trying to
  load the Glympse Invite to retrieve invite data. Call the `getError()` API on the
  returned `GlympseInvite` instance to determine additional error state.
  - Note that in GA Host mode, GlympseInvite instances are not passed
- `InviteInit` / `glympse_invite_id`: Notification sent when a Glympse invite is to
  be loaded by the adapter to check for Card linkage. Note that is only seen during the
  initial start-up sequence of the adapter.
- `InviteReady` / `GlympseInvite.js instance`: Notification sent once a Glympse invite
  has been loaded. The `GlympseInvite.js` instance is a class that can be referenced for
  additional info on the status of the invite (i.e. if it was successfully loaded and has
  a Card reference). This is generally only needed by the adapter itself to determine if
  a card + additional Glympse invites need to be loaded. However, it will have possibly
  interesting information for the adapter host. Additional API information on the
  `GlympseInvite.js` class is found elsewhere in this documentation.
  - Note that in GA Host mode, GlympseInvite instances are not passed
- `InviteRemoved` / `{ id: glympse_invite_code, owner: glympse_user_account_id, card: card_id }`:
  Sent from the Glympse viewer whenever a Glympse invite has been removed from the map.
  No further updates will be seen from the Glympse invite via the adapter.
- `Progress` / `{ curr: int, total: int }`: Seen during the initial loading phases of
  the adapter, and stops once the final `ViewerReady` message is generated.
- `StateUpdate` / `{ id: property_id, invite: glympse_invite_id, owner: glympse_account_id, card: card_id, t: timestamp, val: property_value }`:
  Updates generated when known properties are changed in the Glympse invite. Below is the
  list on known properties that can be seen via the `StateUpdate` message. These are enumerated
  in the `GlympseAdapterDefines.STATE` object
  - `Avatar`
  - `Destination`
  - `InviteEnd`
  - `InviteStart`
  - `Eta`
  - `Message`
  - `Name`
  - `Phase`
  - `Arrived`
  - `Expired`
  - `NoInvites` (seen if no Glympse invites are successfully loaded in the map)
- `ViewerInit` / `true`: Sent when the Glympse map viewer is beginning its initialization process
- `ViewerReady` / `Glympse_viewer_instance`: Generated once the Glympse map control is
fully loaded and ready for presentation/interaction. The provided instance reference allows
for direct access to the Glympse viewer application API and all of its components.
  - Note that in GA Host mode, Glympse Viewer instances are not passed


##Message/Event flow

* params = card_invite, no glympse_invites

    	AdapterInit -> P -> CardsInitStart -> P -> CardInit -> P -> CardReady -> P -> CardsInitEnd -> P -> AdapterReady -> ViewerInit -> P -> ViewerReady -> P [Complete]

* params = no card_invite, glympse_invite (not tied to a card)

		AdapterInit -> P -> InviteInit -> P -> InviteReady -> P -> AdapterReady -> ViewerInit -> P -> ViewerReady -> P [Complete]

* params = no card_invite, glympse_invite (tied to a card)

		AdapterInit -> P -> InviteInit -> P -> InviteReady -> (move to card_invite/no glympse_invites flow)


##Adapter Endpoints
All relevent Glympse Viewer APIs are available for use with the GA. When running in client-mode,
all APIs are available, along with any instance variables that may be passed along. In host-mode,
the only Viewer APIs not available are ones relating to DOM or global environment information,
which cannot be reliably passed in an iframed environment.

Endpoints are broken out on the following components:
  - `map`: Glympse Viewer endpoints accessiable via `adapter_instance.map.*`
  - `card`: Glympse Card endpoints accessiable via `adapter_instance.card.*`
  - `ext`: Custom client-app-included endpoints accessiable via `adapter_instance.ext.*`

###GlympseAdapter.map.* endpoints (host/client-mode):

Below is a list of all of the exposed GA APIs with respect to the Glympse Viewer API, and available
to either host or client-based consumers. These endpoints are also specified in
`GlympseAdapterDefines.MAP.REQUESTS`.

Access to these endpoints can be made via the `map` property of the adapter instance (i.e.
`var eta = myAdapter.map.getInviteProperty({ idProperty: GlympseAdapterDefines.STATE.Eta })`).

- `getInviteProperies(idInvite)`: Returns all current properties for the given Glympse invite id.
  If `idInvite` is null/undefined, the first active Glympse's properties are returned.
  The returned object properties are defined in `GlympseAdapterDefines.STATE.*`.
- `getInviteProperty(cfgInvite)`: Returns the current property value of a Glympse invite.
  `cfgInvite` = `{ idProperty: name_of_property, idInvite: glympse_invite_id }`
  Note that `idInvite` can be null if the first/only tracked Glympse invite is desired.
  Available `idProperty` values are as follows (specified via `GlympseAdapterDefines.STATE.*`
  property names):
  - `Arrived`: Returns a boolean based on the active Glympse's arrival state
  - `Avatar`: String URL pointing to the Glympse sender's avatar image
  - `Destination`: Object describing current Glympse invite's destination
  - `Eta`: Current ETA (in seconds) of the Glympse sender (-1 if no destination is set)
  - `Expired`: Boolean idicating if the Glympse is still active
  - `InviteEnd`: Glympse invite end time (epoch time in ms)
  - `InviteStart`: Glympse invite start time (epoch time in ms)
  - `Message`: Message set for Glympse invite
  - `Name`: Glympse sender's username
  - `Phase`: Any relevent information related to an invite's phase property (usually just a string,
  if not null)
- `addInvites(invites)`: Accepts a semi-colon-delimited string of invites to display on the map.
  Additional configuration options are passed via comma-delimited strings, per Viewer API spec
  (found elsewhere).
- `addGroups(groups)`: Accepts a semi-colon-delimited string of Glympse group names to display on
  the map. Additional configuration options are passed via comma-delimited strings, per Viewer API
  spec (found elsewhere).
- `addMarkers(cfgMarkers)`: Adds a collection of static markers on the map, with several options.
  See below for more information on describing a marker.
- `addTwitterTopics(twitterTopics)`: Accepts a semi-colon-delimited string of Twitter topics
  (# names) to display on the map, using newer Glympse invite codes or the latest location found
  in topic tweets. Additional configuration options are passed via comma-delimited strings, per
  Viewer API spec (found elsewhere).
- `addTwitterUsers(twitterHandles)`: Accepts a semi-colon-delimited string of Twitter user names
  (@ names) to display on the map, using newer Glympse invite codes or the latest location found in
  the user's tweets. Additional configuration options are passed via comma-delimited strings, per
  Viewer API spec (found elsewhere).
- `refreshView()`: Force a viewer layout update. Useful when resizing static `div` containers
  used to host the Glympse Viewer.
- `removeInvites(invites)`: Comma-delimited string of Glympse invite codes to remove from the map.
- `setApiServices(url)`: Specifies the Glympse API datacenter to use
- `setPadding(padding)`: Used to offset the map "center" when determining map zoom based on active
  Glympses and destinations/POI. Effectively makes the centering view-port smaller than the map.
  The `padding` parameter is a 4-integer array, specifying [top, right, bottom, left] paddings
  (i.e. idential to CSS-style offset specifications).
- `updateSetting(val)`: Updates a viewer setting. Format = `{ id: setting_id, val: value_to_set }`.
  Only a few settings are accepted:
  - `attributionOffset`: Changes the vertical offset (from the bottom) of the map provider
  attribution. `val` = pixel offset from the bottom.
  - `zoomMax`: Sets max zoom level of the map for auto-zoom. `val` = Max integer zoom level.


###GlympseAdapter.map.* endpoints (client-mode-only):

The following APIs are only available to consumers of the GA when running in client-mode.
These are also specifed in `GlympseAdapterDefines.MAP.REQUESTS_LOCAL`:

- `generateRoute(cfgRoute)`: Adds a route path to the map, based on passed settings (see below for
  options). Returns a route object with the following API:
   - `run(callback)`: Initiates route load and adds it to the map
   - `setVisibility(bool)`: Show/hides route
   - `getLoaded()`: Current load status
   - `getVisibility()`: Current visibility status
- `getInvites()`: Returns an array of all GlympseInvite instances, as generated by the Glympse Viewer.
  The APIs available under a GlympseInvite will be discussed elsewhere in this document.
- `getMap()`: Returns a reference to the HERE map control used by the Glympse viewer. This reference is
  suitable for adding additional custom overlays in conjunction with the Glympse viewer's UI
  components. For more information, please refer to the [HERE Javascript APIs](https://developer.here.com/javascript-apis)
  documentation.
- `ignoreDestinations(bool)`: Hides current invite destinations. Returns a list of all affected
  destination objects.


###GlympseAdapter.cards.* endpoints (host/client-mode):

Below is a list of all of the exposed GA APIs with respect to the Glympse Cards API, and available
to either host or client-based consumers. These endpoints are also specified in
`GlympseAdapterDefines.CARDS.REQUESTS`.

Access to these endpoints can be made via the `cards` property of the adapter instance (i.e.
`var val = myAdapter.cards.someMethod(some_val)`).

- Currently, no Cards-related endpoints are available for the GA


###GlympseAdapter.cards.* endpoints (client-mode-only):

The following APIs are only available to consumers of the GA when running in client-mode.
These are also specifed in `GlympseAdapterDefines.CARDS.REQUESTS_LOCAL`:

- Currently, no Cards-related endpoints are available for the GA


###GlympseAdapter.ext.* endpoints (host/client-mode):

Below is a list of all of the exposed GA APIs with respect to custom APIs generated by the
client-mode-based application that has integrated the GA. Generally, these APIs will be available
to either host or client-based consumers.

Access to these endpoints can be made via the `ext` property of the adapter instance (i.e.
`var val = myAdapter.ext.someCustomMethod(some_val)`).

- By default, no custom endpoints are provided by the GA



[ Content above abandon all hope is current/relevent for the GlympseAdapter. Stuff below is mostly
in-line, but needs updating/refresh ]

===========================================
===========================================
===========================================
===========================================
ABANDON ALL HOPE, YE WHO ENTER
===========================================


## GA Client-Mode
Below descibes how to utilize the GA in "client-mode", where full access is available to all
Viewer components, data structures, and many customization options. However, it also requires
more care in getting going, and maintaining a clean separation from the Glympse Viewer, which
will now be partially affected by the global namespace and default styling options.

###Usage

GA usage is straight-forward, but does have a dependency on a recent version of
[jQuery](http://jquery.com). jQuery aside, all that is needed is to include the built
`GlympseAdapter` in your page, along with a bit of initialization and configuration to get
the adapter up and running:

	<script type="text/javascript" src="../dist/glympse-adapter-CURRENT_VERSION.min.js"></script>

Initialization, including inserting the viewer into your page, should be done after
the page onLoad event has fired:

	$(window).ready(function()
	{
		...
		... other init code
		...

		// Set up the adapter

		/* Global namespace */
		var adapter = new glympse.GlympseAdapter(viewer_handler_instance, cfg);
		adapter.run($('#div_viewer_container'));   // Note jQuery object reference
	});

A couple of things to note here:
- `viewer_handler_instance` is a class instance to handle events and messages generated by the Glympse Viewer (described below)
- `cfg` is a simple Javascript object that defined both adapter and Glympse Viewer configuration (described below)
- `div_viewer_container` is the id of an HTML `div` element that already exists in the local DOM. The viewer will be inserted into this element.

For the `viewer_handler_reference` class, it must provide a public method with a signature of `notify(idMessage, messageData)`.
The `idMessage` parameter is a string that will be one of the values as defined in the `glympse.GlympseAdapterDefines.MSG` object:
  - `MSG.ViewerInit`: Sent when the viewer has started its initialization process, but is still not quite ready for interaction. `messageData` should be ignored.
  - `MSG.ViewerReady`: Sent whenever the Glympse viewer is fully initialized and ready for interaction. `messageData` should be ignored.
  - `MSG.StateUpdate`: The most common message, this is generated whenever something interesting has changed with the observed invite. `messageData` defines the updated state identifier and its associated value (details given below).

The states specified in the `StateUpdate` event are as follows (ids are defined in the `glympse.GlympseAdapterDefines.STATE` object):

- `STATE.Name`: User's name of the invite (`val` = string)
- `STATE.Avatar`: User's avatar image of the invite (`val` = URL string)
- `STATE.ETA`: Time remaining before user arrives at their destination (`val` = float representing time remaining, in seconds)
- `STATE.Arrived`: Flag indicating whether the user of the invite has approximately arrived at their destination (`val` = boolean)
- `STATE.Expired`: Flag indicating whether the watched Glympse has expired (`val` = boolean)
- `STATE.Phase`: String/Object of the invite's current phase (`val` = string/object)

GVCA configuration format has two main components -- one for the Glympse viewer, and one for the adapater itself:

	cfg =
	{
		viewer: {
			.. normal viewer config settings ..
		}
		, adapter: {
			  hideEvents: false
			, hideUpdates: false
			, viewerPollInterval: 5000
			, initialize: callbackInitialize
			, interfaces: { id0: callback0, id1: callback1, ..., idN: callbackN }
		}
	}

- `viewer` configuration is the normal Glympse viewer configuration object, described elsewhere. It should be noted that a valid invite/group/Twitter handler/Twitter topic setting should be set for normal viewer initialization
- `adapter` settings are as follows:
  - `hideEvents`: Don't send event-related messages back to the `viewer_handler_reference.notify()` method. Currently, this includes the `MSG.ViewerInit` and `MSG.ViewerReady` messages.
  - `hideUpdates`: Don't send `MSG.StateUpdate` messages back to the `viewer_handler_reference.notify()` method.
  - `viewerPollInterval`: Specifies (in ms) the time between viewer queries to detect for any state updates that would generate a `MSG.StateUpdate` message.
  - `initialize`: Method to call when the adapter has successully synced with a host adapater via iframe interface. Can be null.
  - `interfaces`: Allows for local overrides/extensions of advertised Glympse viewer endpoints. More details can be found in `Custom Endpoints`.


###Custom Marker Configuration
For the `addMarkers(cfgMarkers)` API, the `cfgMarkers` object is of the following format:

	cfgMarkers = { showInfo: true|false, markers: [ marker_0_cfg, marker_1_cfg, ..., marker_N_cfg ] };

Each marker configuration is of the following format:

	marker_N_cfg = { //ext: { path: image_url, id: null, w: width, h: height  }	// do not use if using icon setting
					 icon: { id: icon_id_from_loaded_spritesheet }	// for internal
					, lat: latitude
					, lng: longitude
					, info: text_to_display // use \n in the text to force a line break
					, track: true|false		// include this marker in map centering logic
					, link: url_to_load_if_marker_clicked
					, style: {
					      fontFamily: available_font_family
						, color: CSS_color
						, fontSize: font_size
						, maxWidth: max_width_in_pixels (forcing word wrap)
						, background: null|CSS_color
						, textMargin: margin_in_pixels
						}
					};

###Custom Route Options
For the `addRoute(cfgRoute)` API, the following configuration object is used:

	cfgRoute = { start: [ lat, lng ]
				, end: [ lat, lng ]
				, useNubs: true|false	// Add nubs to the start/end points
				, nubSize: 6			// Nub radius
				, nubStroke: 0.1		// Nub stroke
				, style: { strokeColor: 'rgba(255,0,0,0.8)' }
			   };

###Custom Endpoints
While not usuaully necessary, the GVCA allows for extending and/or overriding the default set of endpoints exposed by the Glympse
viewer if you need to allow for additional functionality aside from that provided by the default Glympse viewer. As noted above,
the format for specifying custom endpoints is in the adapter's `interfaces` configuration setting:

	cfg =
	{
		viewer: {
			.. normal viewer config settings ..
		}
		, adapter: {
			.. other adapter settings ..
			, interfaces: { id0: callback0, id1: callback1, ..., idN: callbackN }
		}
	}

The `interfaces` object is an optional collection of methods to be made available for GVHA consumers, or to override existing Glympse
viewer methods. Each item in the collection is decribed in the following manner:

- `id`: The name of the interface to advertise to GVHA consumers upon initial adapter setup.
- `callback`: The method to execute when called from the GVHA consumer.

For `id`, if the name is the same as one of the pre-defined endpoints (listed above), the default implementation is replaced with this
custom version. However, the default is still available via the id with the same name, but with a `base_` prefix (i.e. `base_getValue`
to reach the Glympse viewer's implementation).

Almost any valid Javascript name can be used, save for the default public method names of the GVCA. To be safe, prefix the name of your
custom endpoints with a unique name (i.e. "my" would work wonderfully).

For now, your customized endpoints should return some value directly, if expected by the caller. The current version of the GVCA does
not support deferred responses. In the next version, a Promise-based return value will allow for async handling for delayed results (i.e.
Ajax-based calls).

And for reference, the test app pair of `index-dist.html` and `test/app.js` show an example custom endpoint of `customMethodExample`.
This can be easily extended and/or enhanced for your needs.


###Preview
A sample of setting up a GVCA-based webapp can be found in `index-test.html`, which leverages a sample test app found under the
`src/test/` directory in this repo. It demonstrates a simple `viewer_handler_reference` class, along with a default viewer initialization.

`index-dist.html` demonstrates the use of the GVCA with it's GVHA counterpart. However, some setup is required to alias the
local machine to point to the `indext-test.html` through a localhost alias of test.localhost.


###Installation

The recommended method for using the GVCA component is with the build GlympseViewerClientAdapter-CURRENT_VERSION.min.js file
found in the `builds/` directory of this repo. Usually, the highest version is the one to use.


## GA Host-Mode
Below descibes how to utilize the GA in "host-mode", with limited access to Viewer components
and data structures. It runs in an iframe-based environment, providing a clean separation to the
rest of the page in which it is embedded. That said, the communication channel established with the
View-Mode-based GA control is fairly robust and can handle a number of data types (including such
things as image data).

###Usage

Host-Mode usage is straight-forward. It has been designed to replicate the Glympse Viewer
and Cards APIs, adding a bit of initialization and configuration to get the adapter up and
running. All that is needed is to include the built GlympseAdapter.js in your page:

	<script type="text/javascript" src="../dist/GlympseAdapter-VERSION.min.js"></script>

Initialization, including inserting the viewer into your page, should be done after
the page onLoad event has fired:

	$(window).ready(function()
	{
		...
		... other init code
		...

		// Set up the adapter
		
		/* Global namespace */
		var adapter = new glympse.GlympseAdapter();
		
		/* AMD module format */
		//var GlympseAdapter = require('glympse-adapter/GlympseAdapter');
		//var adapter = new GlympseAdapter();
		
		var el = adapter.runHost({
			url: 'http://glympse.com/INVITE_CODE?partnerid=MY_PARTNER_ID',
			initialize: clientInitialized,
			connect: clientConnected,
			events:
			{
				StateUpdate: stateUpdate,
				ViewerInit: viewerInit,
				ViewerReady: viewerReady
			}
		});

		$(el).css({ width: '100%', height: '100%' });
		$('#divSandbox').append(el);

		...
	});

A couple of things to note here:
- A GlympseAdapter instance reference is needed
- The iframed viewer is created when calling the GA instance's `runHost()` method, with configuration

The configuration options are as follows:

- `url`: The Glympse invite URL. Generally this is the same as what is shared when sending a normal
  Glympse.
  - `partnerid`: Your app's registered PartnerId given to you by your Glympse representative
- `initialize`: Callback to handle iframe loaded event. Note that the Glympse viewer is not yet
  ready at this point, only that the page has been successfully loaded.
- `connect`: Callback to handle when the loaded Glympse viewer has registered itself with your
  hosting adapter. It is still not ready for action.
- `events`: Additional events to be used for updates coming from the Glympse viewer:
  - `StateUpdate`: Called whenever something interesting has changed with the observed invite (more
  details, below)
  - `ViewerInit`: Handles when the Glympse viewer has started up it's viewing sequence, but is still
  not quite ready for interaction
  - `ViewerReady`: Called when the Glympse viewer is fully initialized and ready for interaction.

It should be noted that the only *required* parameter in the above configuration is the `url`
parameter, which initializes the Glympse viewer iframe.

All API calls return a Promise, allowing for async handling of all results. These should be
treated like any baseline [Promise/A+](https://promisesaplus.com/) system:

	adapter.map.getInviteProperty({ idProperty: GlympseAdapterDefines.STATE.Name }).then(function(data)
	{
		console.log('Glympse invite sender's name: ' + data);
	}

A more detailed description of all of the available Glympse viewer APIs is described elsewhere in
this document. Additionally, refer to `app/test-host/index-host.html` as a reference for using all
available APIs with the GA running in host-mode.


###Supported Hosting Events
A couple of specific events have been added to detect proper loading and initialization
steps during the course of loading an iframe'd Glympse viewer. Both of these settings are
specified in the GVHA.init() configuration:

- `Initialize`: Invoked whenever the iframe html has been loaded and registered with the host container.
- `Connect`: Sent once the hosted viewer has application has loaded and initialized its interfaces with the host container. The callback is passed a Javascript object containing the invite code used by the viewer and a list of additional custom methods available (default = `null`).


###Mapped Viewer Events
Several Glympse Viewer-specific events are available for use within your application. A couple are
only used during viewer intialization, with only one event currently in use during the lifetime of
the viewer while it is active:

- `ViewerInit`: Called when the viewer has begun is component loading and registration process.
- `ViewerReady`: Called when the viewer has fully loaded all components and map information and is fully ready to display the Glympse map.
- `StateUpdate`: Sent whenever changes occur on the watched Glympse invite. The data sent is a Javascript Object with the following members:
  - `id`: String identifier of the state change (values described below).
  - `val`: Value pertaining to the specified state change. It can be of varying types.

The range of values for the `StateUpdate` update that will be as follows:

- `Arrived`: Flag indicating whether the user of the invite has approximately arrived at their destination (`val` = boolean)
- `Avatar`: User's avatar image of the invite (`val` = URL string)
- `Eta`: Time remaining before user arrives at their destination (`val` = float representing time remaining, in seconds)
- `Expired`: Flag indicating whether the watched Glympse has expired (`val` = boolean)
- `Name`: User's name of the invite (`val` = string)
- `Phase`: String/Object of the invite's current phase (`val` = string/object)




##Project Notes
This project leverages [oasis.js](https://github.com/tildeio/oasis.js) and [rsvp.js](https://github.com/tildeio/rsvp.js) for
hosting and communication semantics. Unfortunately, due to each of their development approaches, a snapshot of their transpiled
Require.js-based sources must be included with this project to properly use their functionality. For future maintenance, the
latest commits used in this snapshot are `4c657d15` and `5cfda622` of the `tildeio/oasis.js` and `tildeio/rsvp.js` repos
respectively.
