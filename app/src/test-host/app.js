// App entry point
define(function(require, exports, module)
{
    'use strict';

    // import dependencies
	var Main = require('Main');
	var ViewManager = require('ViewManager');

	var cfg;
	var main;
	var vm;


	$(document).ready(function()
	{
		cfg = window.cfgApp;

		vm = new ViewManager(cfg.app);
		main = new Main(vm, cfg);
	});
});
