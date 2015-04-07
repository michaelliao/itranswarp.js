'use strict';

// test memcache:

var
    _ = require('lodash'),
    should = require('should'),
    thunkify = require('thunkify'),
    cache = require('../cache');

var keyPrefix = require('node-uuid').v4().replace(/\-/g, '');

function toKeys(keys) {
    if (typeof(keys)==='string') {
        return keyPrefix + keys;
    }
    return _.map(keys, function (key) {
        return keyPrefix + key;
    });
}

var $sleep = thunkify(function (ms, callback) {
    setTimeout(function () {
        callback(null, 'done');
    }, ms);
});

describe('#cache', function () {

    it('get cache but missing', function* () {
        var keys = toKeys(['aa', 'bb', 'cc']);
        var aa = yield cache.$get(keys[0]);
        var bb = yield cache.$get(keys[1]);
        var cc = yield cache.$get(keys[2]);
        should(aa===null).be.true;
        should(bb===null).be.true;
        should(cc===null).be.true;
    });

    it('get missing value with default value', function* () {
        var key1 = keyPrefix + 'k1';
        var data = yield cache.$get(key1, 'DEFAULT-1');
        should(data==='DEFAULT-1').be.true;
        // should not in cache:
        var data2 = yield cache.$get(key1);
        should(data2===null).be.true;
    });

    it('get by function value', function* () {
        var key1 = keyPrefix + 'f1';
        var data = yield cache.$get(key1, function () {
            return ['F1', null, { 't': 999 }];
        });
        data.should.be.instanceof(Array).and.have.lengthOf(3);
        data[0].should.equal('F1');
        should(data[1]===null).be.true;
        data[2].should.be.instanceof(Object);
        data[2].t.should.equal(999);
        // should in cache:
        var data2 = yield cache.$get(key1);
        data2.should.be.instanceof(Array).and.have.lengthOf(3);
        data2[0].should.equal('F1');
        should(data2[1]===null).be.true;
        data2[2].should.be.instanceof(Object);
        data2[2].t.should.equal(999);
    });

    it('get by generator function', function* () {
        var key1 = keyPrefix + 'g1';
        var data = yield cache.$get(key1, function* () {
            yield $sleep(500);
            return 'G1';
        });
        should(data!==null).be.true;
        data.should.be.equal('G1');
        // should in cache:
        var data2 = yield cache.$get(key1);
        should(data2!==null).be.true;
        data2.should.be.equal('G1');
    });

    it('set and get', function* () {
        var key1 = keyPrefix + 'set1';
        yield cache.$set(key1, 'Value1');
        // get:
        var data = yield cache.$get(key1, '@@@');
        should(data==='Value1').be.true;
    });

    it('gets multikeys', function* () {
        var key1 = keyPrefix + 'multi-1';
        var key2 = keyPrefix + 'multi-2';
        var key3 = keyPrefix + 'multi-3';
        var keys = [key1, key2, key3];
        var data = yield cache.$gets(keys);
        data.should.be.instanceof(Array).and.have.lengthOf(3);
        should(data[0]===null).be.true;
        should(data[1]===null).be.true;
        should(data[2]===null).be.true;
        yield cache.$set(key1, 'Multi');
        // gets again:
        var data2 = yield cache.$gets(keys);
        data2.should.be.instanceof(Array).and.have.lengthOf(3);
        should(data2[0]==='Multi').be.true;
        should(data2[1]===null).be.true;
        should(data2[2]===null).be.true;
    });

    it('set and get then expires', function* () {
        var key1 = keyPrefix + 'exp1';
        yield cache.$set(key1, { expires: 1234 }, 2);
        // get:
        var data = yield cache.$get(key1);
        data.should.be.ok;
        data.expires.should.equal(1234);
        // wait 3 seconds:
        yield $sleep(3000);
        // get again:
        var data2 = yield cache.$get(key1);
        should(data2===null).be.true;
    });

    it('incr counter', function* () {
        var key1 = keyPrefix + 'inc1';
        var num = yield cache.$incr(key1);
        should(num===1).be.true;
        // should get as 1:
        var data = yield cache.$get(key1);
        should(data===1).be.true;
    });

    it('set initial and incr', function* () {
        var key1 = keyPrefix + 'countFrom100';
        var num = yield cache.$incr(key1, 100);
        should(num===101).be.true;
    });

    it('count as 0', function* () {
        var key1 = keyPrefix + 'notFoundButCount0';
        var num = yield cache.$count(key1);
        should(num===0).be.true;
    });

    it('incr and counts', function* () {
        var key1 = keyPrefix + 'countMe';
        var num = yield cache.$incr(key1, 20);
        should(num===21).be.true;
        // should get as 21:
        var data = yield cache.$count(key1);
        should(data===21).be.true;
        // counts:
        var nums = yield cache.$counts([key1, 'count2', 'count3']);
        should(nums!==null).be.true;
        nums.should.be.instanceof(Array).and.have.lengthOf(3);
        should(nums[0]===21).be.true;
        should(nums[1]===0).be.true;
        should(nums[2]===0).be.true;
    });

    it('remove key', function* () {
        var key1 = keyPrefix + 'rm1';
        yield cache.$set(key1, 'To be removed');
        // get:
        var data = yield cache.$get(key1);
        data.should.equal('To be removed');
        // remove:
        yield cache.$remove(key1);
        // get again:
        var data2 = yield cache.$get(key1);
        should(data2===null).be.true;
    });

});
