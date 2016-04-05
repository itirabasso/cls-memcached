'use strict';

var test = require('tap').test;

test("CLS + memcached without shim = sadness", function (t) {
  t.plan(4);

  var cls = require('continuation-local-storage');
  var ns = cls.createNamespace('test');

  var memcached = require('memcached');
  var client = new memcached("localhost:11211");

  this.tearDown(function () {
    client.end();
  });

  function fetch(key, done) {
    t.equal(ns.get('id'), key, 'cls ID matches passed key');

    client.get(key, function (error, reply) {
      if (error) {
        t.fail(error);
        return t.end();
      }

      var parsed = JSON.parse(reply);
      t.equal(parsed.id, key, "retrieved correct value");
      t.notOk(ns.get('id'), "inner context value isn't available");

      done(parsed);
    });
  }

  function test() {
    ns.run(function(){
      ns.set('id', 1);

      fetch(ns.get('id'), function () {
        t.notOk(ns.get('id'), "inner context value is lost at finish");
      });
    });
  }

  ns.run(function () {
    var data = JSON.stringify({id : 1});
    client.set(1, data, 0, function next(error) {
      if (error) {
        t.fail(error);
        return t.end();
      }

      process.nextTick(test);
    });
  });
});

test("CLS + memcached with shim = satisfaction", function (t) {
  t.plan(4);

  var cls = require('continuation-local-storage');
  var ns = cls.createNamespace('test');

  var patchMemcached = require('../shim.js');
  patchMemcached(ns);

  var memcached = require('memcached');
  var client = new memcached("localhost:11211");
  
  this.tearDown(function () {
    client.end();
  });

  function fetch(key, done) {
    t.equal(ns.get('id'), key, 'cls ID matches passed key');

    client.get(key, function (error, reply) {
      if (error) {
        t.fail(error);
        return t.end();
      }

      var parsed = JSON.parse(reply);
      t.equal(parsed.id, key, "retrieved correct value");
      t.equal(ns.get('id'), parsed.id, "inner context value is correct");

      done(parsed);
    });
  }

  function test() {
    ns.run(function(){
      ns.set('id', 1);

      fetch(ns.get('id'), function (data) {
        t.equal(ns.get('id'), data.id, "correct inner context value at finish");
      });
    });
  }

  ns.run(function () {
    var data = JSON.stringify({id : 1});
    client.set(1, data, 0, function next(error) {
      if (error) {
        t.fail(error);
        return t.end();
      }

      process.nextTick(test);
    });
  });
});
