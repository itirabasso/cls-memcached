'use strict';

var shimmer = require('shimmer');

function slice(args) {
  /**
   * Usefully nerfed version of slice for use in instrumentation. Way faster
   * than using [].slice.call, and maybe putting it in here (instead of the
   * same module context where it will be used) will make it faster by
   * defeating inlining.
   *
   *   http://jsperf.com/array-slice-call-arguments-2
   *
   *  for untrustworthy benchmark numbers. Only useful for copying whole
   *  arrays, and really only meant to be used with the arguments arraylike.
   *
   *  Also putting this comment inside the function in an effort to defeat
   *  inlining.
   */
  var length = args.length, array = [], i;

  for (i = 0; i < length; i++) array[i] = args[i];

  return array;
}

module.exports = function patchMemcached(ns) {
  var memcached = require('memcached');
  var proto = memcached.prototype;
  shimmer.wrap(proto, 'command', function (command) {
    return function wrapped() {
      console.log("Called command");
      var args     = slice(arguments);
      var last     = args.length - 1;
      var callback = args[last];
      var tail     = callback;

      if (typeof callback === 'function') {
        args[last] = ns.bind(callback);
      } else if (Array.isArray(tail) && typeof tail[tail.length - 1] === 'function') {
        last = tail.length - 1;
        tail[last] = ns.bind(tail[last]);
      }
      var ret = command.apply(this, args);
      console.log("Done command");
      return ret;
    };

  });
};
