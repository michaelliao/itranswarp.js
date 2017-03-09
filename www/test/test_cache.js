/**
 * Test cache.js. Make sure memcached is running on localhost:11211.
 */

var
    _ = require('lodash'),
    expect = require('chai').expect,
    sleep = require('sleep-promise'),
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

describe('#cache', () => {

    it('get cache but missing', async () => {
        var keys = toKeys(['aa', 'bb', 'cc']);
        var aa = await cache.get(keys[0]);
        var bb = await cache.get(keys[1]);
        var cc = await cache.get(keys[2]);
        expect(aa===null).to.be.true;
        expect(bb===null).to.be.true;
        expect(cc===null).to.be.true;
    });

    it('get missing value with default value', async () => {
        var key1 = keyPrefix + 'k1';
        var data = await cache.get(key1, 'DEFAULT-1');
        expect(data==='DEFAULT-1').to.be.true;
        // expect in cache:
        var data2 = await cache.get(key1);
        expect(data==='DEFAULT-1').to.be.true;
    });

    it('get by function value', async () => {
        var key1 = keyPrefix + 'f1';
        var data = await cache.get(key1, () => {
            return ['F1', null, { 't': 999 }];
        });
        expect(data).to.be.instanceof(Array).and.have.lengthOf(3);
        expect(data[0]).to.equal('F1');
        expect(data[1]===null).to.be.true;
        expect(data[2]).to.be.instanceof(Object);
        expect(data[2].t).to.equal(999);
        // should in cache:
        var data2 = await cache.get(key1);
        expect(data2).to.be.instanceof(Array).and.have.lengthOf(3);
        expect(data2[0]).to.equal('F1');
        expect(data2[1]).to.be.null;
        expect(data2[2]).to.be.instanceof(Object);
        expect(data2[2].t).to.equal(999);
    });

    it('get by async function', async () => {
        var key1 = keyPrefix + 'g1';
        var data = await cache.get(key1, async () => {
            await sleep(500);
            return 'G1';
        });
        expect(data!==null).to.be.true;
        expect(data).to.equal('G1');
        // should in cache:
        var data2 = await cache.get(key1);
        expect(data2!==null).to.be.true;
        expect(data2).to.equal('G1');
    });

    it('set and get', async () => {
        var key1 = keyPrefix + 'set1';
        await cache.set(key1, 'Value1');
        // get:
        var data = await cache.get(key1, '@@@');
        expect(data==='Value1').to.be.true;
    });

    it('set and get then expires', async () => {
        var key1 = keyPrefix + 'exp1';
        await cache.set(key1, { expires: 1234 }, 2);
        // get:
        var data = await cache.get(key1);
        expect(data).to.be.ok;
        expect(data.expires).to.equal(1234);
        // wait 2 seconds:
        await sleep(2000);
        // get again:
        var data2 = await cache.get(key1);
        expect(data2===null).to.be.true;
    });

    it('gets multikeys', async () => {
        var key1 = keyPrefix + 'multi-1';
        var key2 = keyPrefix + 'multi-2';
        var key3 = keyPrefix + 'multi-3';
        var keys = [key1, key2, key3];
        var data = await cache.gets(keys);
        expect(data).to.be.instanceof(Array).and.have.lengthOf(3);
        expect(data[0]===null).to.be.true;
        expect(data[1]===null).to.be.true;
        expect(data[2]===null).to.be.true;
        await cache.set(key1, 'Multi');
        await cache.set(key3, 'END');
        // gets again:
        var data2 = await cache.gets(keys);
        expect(data2).to.be.instanceof(Array).and.have.lengthOf(3);
        expect(data2[0]==='Multi').to.be.true;
        expect(data2[1]===null).to.be.true;
        expect(data2[2]==='END').to.be.true;
    });

    it('incr counter', async () => {
        var key1 = keyPrefix + 'inc1';
        var num = await cache.incr(key1);
        expect(num===1).to.be.true;
        // should get as 1:
        var data = await cache.get(key1);
        expect(data===1).to.be.true;
    });

    it('set initial and incr', async () => {
        var key1 = keyPrefix + 'countFrom100';
        var num = await cache.incr(key1, 100);
        expect(num===101).to.be.true;
    });

    it('count as 0', async () => {
        var key1 = keyPrefix + 'notFoundButCount0';
        var num = await cache.count(key1);
        expect(num).to.equal(0);
    });

    it('incr and counts', async () => {
        var key1 = keyPrefix + 'countMe';
        var num = await cache.incr(key1, 20);
        expect(num===21).to.be.true;
        // should get as 21:
        var data = await cache.count(key1);
        expect(data===21).to.be.true;
        // counts:
        var nums = await cache.counts([key1, 'count2', 'count3']);
        expect(nums!==null).to.be.true;
        expect(nums).to.be.instanceof(Array).and.have.lengthOf(3);
        expect(nums[0]===21).to.be.true;
        expect(nums[1]===0).to.be.true;
        expect(nums[2]===0).to.be.true;
    });

    it('remove key', async () => {
        var key1 = keyPrefix + 'rm1';
        await cache.set(key1, 'To be removed');
        // get:
        var data = await cache.get(key1);
        expect(data).to.equal('To be removed');
        // remove:
        await cache.remove(key1);
        // get again:
        var data2 = await cache.get(key1);
        expect(data2===null).to.be.true;
    });

});
