'use strict';

// test memcache:

var
    _ = require('lodash'),
    async = require('async'),
    should = require('should');

var cache = require('../cache');

var keyPrefix = require('node-uuid').v4().replace(/\-/g, '');

function toKeys(keys) {
    if (typeof(keys)==='string') {
        return keyPrefix + keys;
    }
    return _.map(keys, function (key) {
        return keyPrefix + key;
    });
}

describe('#cache', function () {

    it('#get', function (done) {
        var keys = toKeys(['aa', 'bb', 'cc']);
        async.series({
            aa: function (callback) {
                cache.get(keys[0], callback);
            },
            bb: function (callback) {
                cache.get(keys[1], callback);
            },
            cc: function (callback) {
                cache.get(keys[2], callback);
            }
        }, function (err, data) {
            should(err===null).be.true;
            should(data).be.ok;
            should(data.aa===null).be.true;
            should(data.bb===null).be.true;
            should(data.cc===null).be.true;
            done();
        });
    });

    it('#getByDefaultValue', function (done) {
        var key1 = keyPrefix + 'k1';
        cache.get(key1, 'DEFAULT-1', function (err, data) {
            should(err===null).be.true;
            should(data==='DEFAULT-1').be.true;
            // should not in cache:
            cache.get(key1, function (err, data2) {
                should(err===null).be.true;
                should(data2===null).be.true;
                done();
            });
        });
    });

    it('#getByFunctionValue', function (done) {
        var key1 = keyPrefix + 'f1';
        cache.get(key1, function () { return ['F1', null, {}] }, function (err, data) {
            should(err===null).be.true;
            data.should.be.instanceof(Array).and.have.lengthOf(3);
            data[0].should.equal('F1');
            should(data[1]===null).be.true;
            data[2].should.be.instanceof(Object);
            // should in cache:
            cache.get(key1, function (err, data2) {
                should(err===null).be.true;
                data2.should.be.instanceof(Array).and.have.lengthOf(3);
                data2[0].should.equal('F1');
                should(data2[1]===null).be.true;
                data2[2].should.be.instanceof(Object);
                done();
            });
        });
    });

    it('#getByCallbackFunction', function (done) {
        var key1 = keyPrefix + 'callback1';
        cache.get(key1, function (callback) {
            setTimeout(function () {
                callback(null, 'Callback Value');
            }, 500);
        }, function (err, data) {
            should(err===null).be.true;
            should(data!==null).be.true;
            data.should.be.equal('Callback Value');
            // should in cache:
            cache.get(key1, function (err, data2) {
                should(err===null).be.true;
                should(data2!==null).be.true;
                data2.should.be.equal('Callback Value');
                done();
            });
        });
    });

    it('#setAndGet', function (done) {
        var key1 = keyPrefix + 'set1';
        cache.set(key1, 'Value1', function (err) {
            should(err===null).be.true;
            // get:
            cache.get(key1, function (err, data) {
                should(err===null).be.true;
                should(data==='Value1').be.true;
                done();
            });
        });
    });

    it('#gets', function (done) {
        var key1 = keyPrefix + 'multi-1';
        var key2 = keyPrefix + 'multi-2';
        var key3 = keyPrefix + 'multi-3';
        var keys = [key1, key2, key3];
        cache.gets(keys, function (err, data) {
            should(err===null).be.ok;
            data.should.be.instanceof(Array).and.have.lengthOf(3);
            should(data[0]===null).be.true;
            should(data[1]===null).be.true;
            should(data[2]===null).be.true;
            cache.set(key1, 'Multi', function (err) {
                should(err===null).be.true;
                // gets again:
                cache.gets(keys, function (err, data2) {
                    should(err===null).be.ok;
                    data2.should.be.instanceof(Array).and.have.lengthOf(3);
                    should(data2[0]==='Multi').be.true;
                    should(data2[1]===null).be.true;
                    should(data2[2]===null).be.true;
                    done();
                });
            });
        });
    });

    it('#setAndGetThenExpires', function (done) {
        var key1 = keyPrefix + 'exp1';
        cache.set(key1, { expires: 1234 }, 2, function (err) {
            should(err===null).be.true;
            // get:
            cache.get(key1, function (err, data) {
                should(err===null).be.true;
                data.should.be.ok;
                data.expires.should.equal(1234);
                setTimeout(function () {
                    cache.get(key1, function (err, data2) {
                        should(err===null).be.true;
                        should(data2===null).be.true;
                        done();
                    });
                }, 2100);
            });
        });
    });

    it('#incr', function (done) {
        var key1 = keyPrefix + 'inc1';
        cache.incr(key1, function (err, num) {
            should(err===null).be.true;
            should(num===1).be.true;
            // should get as 1:
            cache.get('CT@' + key1, function (err, data) {
                should(err===null).be.true;
                should(data===1).be.true;
                done();
            });
        });
    });

    it('#setInitialAndIncr', function (done) {
        var key1 = keyPrefix + 'countFrom100';
        cache.incr(key1, 100, function (err, num) {
            should(err===null).be.true;
            should(num===101).be.true;
            done();
        });
    });

    it('#countAs0', function (done) {
        var key1 = keyPrefix + 'notFoundButCount0';
        cache.count(key1, function (err, data) {
            should(err===null).be.true;
            should(data===0).be.true;
            done();
        });
    });

    it('#incrAndCounts', function (done) {
        var key1 = keyPrefix + 'countMe';
        cache.incr(key1, 20, function (err, num) {
            should(err===null).be.true;
            should(num===21).be.true;
            // should get as 21:
            cache.count(key1, function (err, data) {
                should(err===null).be.true;
                should(data===21).be.true;
                // counts:
                cache.counts([key1, 'count2', 'count3'], function (err, nums) {
                    should(err===null).be.true;
                    should(nums!==null).be.true;
                    nums.should.be.instanceof(Array).and.have.lengthOf(3);
                    should(nums[0]===21).be.true;
                    should(nums[1]===0).be.true;
                    should(nums[2]===0).be.true;
                    done();
                });
            });
        });
    });

    it('#remove', function (done) {
        var key1 = keyPrefix + 'rm1';
        cache.set(key1, 'To be removed', function (err) {
            should(err===null).be.true;
            // get:
            cache.get(key1, function (err, data) {
                should(err===null).be.true;
                data.should.equal('To be removed');
                // remove:
                cache.remove(key1, function (err) {
                    should(err===null).be.true;
                    // get again:
                    cache.get(key1, function (err, data) {
                        should(err===null).be.true;
                        should(data===null).be.true;
                        done();
                    });
                });
            });
        });
    });

});
