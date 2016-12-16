define(function(require, exports, module)
{
	var w = window;
	var initted = false;

	//(function(w)
	//{
	/**
	 * Emulate window.setInterval via RAF, if available. Polyfills to
	 * regular window.setInterval if RAF is not available. Assumes RAF
	 * has already been polyfilled as necessary.
	 * @param   {function} fn    Callback with time interval is complete
	 * @param   {number}   delay Delay, in milliseconds
	 * @returns {object}   Timeout handle
	 */
	function rafSetInterval(fn, delay, handle)
	{
		if (!initted)
		{
			initted = true;
			var syncRaf = (glympse && glympse.lib && glympse.lib.syncRAF);
			if (syncRaf)
			{
				syncRaf();
			}
		}

		var raf = w.requestAnimationFrame;
		if (!raf || !w.cancelAnimationFrame)
		{
			return w.setInterval(fn, delay);
		}

		var start = delay + new Date().getTime();
		handle = handle || {};	// Update previous reference

		function run()
		{
			if (start <= new Date().getTime())
			{
				fn.call();
				rafSetInterval(fn, delay, handle);
				return;
			}

			handle.raf = raf(run);
		}

		handle.raf = raf(run);
		return handle;
	}

	/**
	 * Emulate window.clearInterval via RAF, if available. Polyfills to
	 * default window.clearInterval if RAF is not available. Assumes RAF has
	 * already been polyfilled as necessary.
	 * @param {object} handle Handle returned from window.rafInterval
	 */
	//w.clearRafInterval = function(handle)
	function rafClearInterval(handle)
	{
		if (handle && handle.raf)
		{
			w.cancelAnimationFrame(handle.raf);
		}
		else
		{
			w.clearInterval(handle);
		}
	}

	module.exports = { setInterval: rafSetInterval,
					   clearInterval: rafClearInterval
					 };
});
