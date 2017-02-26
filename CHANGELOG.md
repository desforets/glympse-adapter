#[Changelog] glympse-adapter

version |date        |notes
:-------|:-----------|:------
2.1.0/1 | 2017/02/26 | Cleaned up support for `sandbox=1` setting. Removed `svcCards` setting (only `svcGlympse` is necessary now). Point to correct viewer base URL.
2.0.2	| 2017/02/17 | Add `invitee` property on the Card model for proper handling of *card_request* invite types
2.0.1	| 2017/02/15 | Updated to use LocalStorage instead of cookies, if available
2.0.0   | 2017/02/10 | Revamp of internal architecture + addition of Glympse Cards APIs. Biggest imact for ticket invite usage: must specify apiKey param and set isAnon=true config setting for regular viewing of ticket invites.
1.4.2   | 2016/11/12 | *InviteClicked* event propagation fix
1.4.1   | 2016/11/09 | Add *InviteClicked* event
1.4.0   | 2016/11/08 | Remove `adapter.getViewer()`, add client-only `adapter.map.getMapContainer()` method
1.3.10  | 2016/07/23 | Expire option for `setCfgVal()`: `lib.setCfgVal(name, val, daysExpire)` _(default: 365)_
...     | ...        | **\[ _Need to pull in from tagged version release notes, as available_ \]**
1.0.0   | 2015/08/11 | Initial release
