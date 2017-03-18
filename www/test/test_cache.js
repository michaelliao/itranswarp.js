'use strict';

/**
 * Test cache.js. Make sure memcached is running on localhost:11211.
 */

const
    _ = require('lodash'),
    expect = require('chai').expect,
    sleep = require('sleep-promise'),
    cache = require('../cache'),
    keyPrefix = require('uuid/v4')().replace(/\-/g, '');

function toKeys(keys) {
    if (typeof(keys)==='string') {
        return keyPrefix + keys;
    }
    return keys.map((key) => {
        return keyPrefix + key;
    });
}

describe('#cache', () => {

    it('get cache but missing', async () => {
        let
            keys = toKeys(['aa', 'bb', 'cc']),
            aa = await cache.get(keys[0]),
            bb = await cache.get(keys[1]),
            cc = await cache.get(keys[2]);
        expect(aa===null).to.be.true;
        expect(bb===null).to.be.true;
        expect(cc===null).to.be.true;
    });

    it('get missing value with default value', async () => {
        let
            key1 = keyPrefix + 'k1',
            data = await cache.get(key1, 'DEFAULT-1');
        expect(data==='DEFAULT-1').to.be.true;
        // expect in cache:
        let data2 = await cache.get(key1);
        expect(data==='DEFAULT-1').to.be.true;
    });

    it('get by function value', async () => {
        let
            key1 = keyPrefix + 'f1',
            data = await cache.get(key1, () => {
                return ['F1', null, { 't': 999 }];
            });
        expect(data).to.be.instanceof(Array).and.have.lengthOf(3);
        expect(data[0]).to.equal('F1');
        expect(data[1]===null).to.be.true;
        expect(data[2]).to.be.instanceof(Object);
        expect(data[2].t).to.equal(999);
        // should in cache:
        let data2 = await cache.get(key1);
        expect(data2).to.be.instanceof(Array).and.have.lengthOf(3);
        expect(data2[0]).to.equal('F1');
        expect(data2[1]).to.be.null;
        expect(data2[2]).to.be.instanceof(Object);
        expect(data2[2].t).to.equal(999);
    });

    it('get by async function', async () => {
        let
            key1 = keyPrefix + 'g1',
            data = await cache.get(key1, async () => {
                await sleep(500);
                return 'G1';
            });
        expect(data!==null).to.be.true;
        expect(data).to.equal('G1');
        // should in cache:
        let data2 = await cache.get(key1);
        expect(data2!==null).to.be.true;
        expect(data2).to.equal('G1');
    });

    it('set and get', async () => {
        let key1 = keyPrefix + 'set1';
        await cache.set(key1, 'Value1');
        // get:
        let data = await cache.get(key1, '@@@');
        expect(data==='Value1').to.be.true;
    });

    it('set and get then expires', async () => {
        let key1 = keyPrefix + 'exp1';
        await cache.set(key1, { expires: 1500 }, 2);
        // get:
        let data = await cache.get(key1);
        expect(data).to.be.ok;
        expect(data.expires).to.equal(1500);
        // wait 3 seconds:
        await sleep(3000);
        // get again:
        let data2 = await cache.get(key1);
        expect(data2===null).to.be.true;
    });

    it('gets multikeys', async () => {
        let
            key1 = keyPrefix + 'multi-1',
            key2 = keyPrefix + 'multi-2',
            key3 = keyPrefix + 'multi-3',
            keys = [key1, key2, key3],
            data = await cache.gets(keys);
        expect(data).to.be.instanceof(Array).and.have.lengthOf(3);
        expect(data[0]===null).to.be.true;
        expect(data[1]===null).to.be.true;
        expect(data[2]===null).to.be.true;
        await cache.set(key1, 'Multi');
        await cache.set(key3, 'END');
        // gets again:
        let data2 = await cache.gets(keys);
        expect(data2).to.be.instanceof(Array).and.have.lengthOf(3);
        expect(data2[0]==='Multi').to.be.true;
        expect(data2[1]===null).to.be.true;
        expect(data2[2]==='END').to.be.true;
    });

    it('incr counter', async () => {
        let
            key1 = keyPrefix + 'inc1',
            num = await cache.incr(key1);
        expect(num===1).to.be.true;
        // should get as 1:
        let data = await cache.get(key1);
        expect(data===1).to.be.true;
    });

    it('set initial and incr', async () => {
        let
            key1 = keyPrefix + 'countFrom100',
            num = await cache.incr(key1, 100);
        expect(num===101).to.be.true;
    });

    it('count as 0', async () => {
        let
            key1 = keyPrefix + 'notFoundButCount0',
            num = await cache.count(key1);
        expect(num).to.equal(0);
    });

    it('incr and counts', async () => {
        let
            key1 = keyPrefix + 'countMe',
            num = await cache.incr(key1, 20);
        expect(num===21).to.be.true;
        // should get as 21:
        let data = await cache.count(key1);
        expect(data===21).to.be.true;
        // counts:
        let nums = await cache.counts([key1, 'count2', 'count3']);
        expect(nums!==null).to.be.true;
        expect(nums).to.be.instanceof(Array).and.have.lengthOf(3);
        expect(nums[0]===21).to.be.true;
        expect(nums[1]===0).to.be.true;
        expect(nums[2]===0).to.be.true;
    });

    it('remove key', async () => {
        let key1 = keyPrefix + 'rm1';
        await cache.set(key1, 'To be removed');
        // get:
        let data = await cache.get(key1);
        expect(data).to.equal('To be removed');
        // remove:
        await cache.remove(key1);
        // get again:
        let data2 = await cache.get(key1);
        expect(data2===null).to.be.true;
    });

});
