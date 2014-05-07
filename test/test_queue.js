// test memcache:

var
    _ = require('lodash'),
    async = require('async'),
    should = require('should');

var createQueue = require('../queue');

var queue = createQueue(require('node-uuid').v4().replace(/\-/g, ''));

function createPushFunction(value) {
    return function (callback) {
        queue.push(value, function(err) {
            should(err === null).be.true;
            callback(null);
        });
    };
}

function createPopFunction(expected) {
    return function (callback) {
        queue.pop(function(err, value) {
            should(err === null).be.true;
            should(typeof value === typeof expected).be.true;
            _.isEqual(expected, value).should.be.true;
            callback(null);
        });
    };
}

function createCheckSizeFunction(expected) {
    return function (callback) {
        queue.size(function (err, num) {
            should(err === null).be.true;
            num.should.equal(expected);
            callback(null);
        })
    };
}

describe('#queue', function () {

    it('#pushAndPop', function (done) {
        async.series([
            createCheckSizeFunction(0),
            createPushFunction('MSG-1'),
            createCheckSizeFunction(1),
            createPopFunction('MSG-1'),
            createCheckSizeFunction(0)
        ], function(err, r) {
            should(err === null).be.true;
            done();
        });
    });

    it('#pushAndPopObject', function (done) {
        var obj = {
            key1: 'blabla...',
            key2: ['A', 'B', 'C'],
            key3: null,
            key4: true,
            key5: false,
            t: Date.now()
        };
        async.series([
            createCheckSizeFunction(0),
            createPushFunction(obj),
            createCheckSizeFunction(1),
            createPopFunction(obj),
            createCheckSizeFunction(0),
            createPopFunction(null),
            createCheckSizeFunction(0)
        ], function(err, r) {
            should(err === null).be.true;
            done();
        });
    });

});
