'use strict';

// init memcache:

var
    _ = require('lodash'),
    thunkify = require('thunkify'),
    Memcached = require('memcached'),
    config = require('./config');

// init memcached:
console.log('init memcache...');

var
    DEFAULT_LIFETIME = 86400, // 24h
    CACHE_PREFIX = config.cache.prefix,
    memcached = new Memcached(config.cache.host + ':' + config.cache.port, {
        'timeout': config.cache.timeout,
        'retries': config.cache.retries
    }),
    $m_incr = thunkify(function (key, inc, callback) {
        memcached.incr(key, inc, callback);
    }),
    $m_get = thunkify(function (key, callback) {
        memcached.get(key, callback);
    }),
    $m_set = thunkify(function (key, value, lifetime, callback) {
        memcached.set(key, value, lifetime, callback);
    }),
    $m_del = thunkify(function (key, callback) {
        memcached.del(key, callback);
    }),
    $m_getMulti = thunkify(function (keys, callback) {
        memcached.getMulti(keys, callback);
    });

module.exports = {

    $incr: function* (key, initial) {
        var
            k = CACHE_PREFIX + key,
            data = yield $m_incr(k, 1);
        if (data === false) {
            if (initial === undefined) {
                initial = 0;
            }
            yield $m_set(k, initial + 1, DEFAULT_LIFETIME);
            data = initial + 1;
        }
        return data;
    },

    $count: function* (key) {
        var
            k = CACHE_PREFIX + key,
            num = yield $m_get(k);
        return (num === false) ? 0 : num;
    },

    $counts: function* (keys) {
        if (keys.length === 0) {
            return [];
        }
        var
            multiKeys = _.map(keys, function (key) {
                return CACHE_PREFIX + key;
            }),
            data = yield $m_getMulti(multiKeys);
        return _.map(multiKeys, function (key) {
            return data[key] || 0;
        });
    },

    $get: function* (key, defaultValueOrFn, lifetime) {
        /**
         * get value from cache by key. If key not exist:
         *   return default value if defaultValueOrFn is not a function,
         *   otherwise call defaultValueOfFn, put the result into cache
         *   and return as value.
         */
        var
            k = CACHE_PREFIX + key,
            data = yield $m_get(k);
        if (data) {
            // console.log('[cache] hit: ' + key);
            return data;
        }
        console.log('[Cache] NOT hit: ' + key);
        if (defaultValueOrFn) {
            lifetime = lifetime || DEFAULT_LIFETIME;
            if (typeof (defaultValueOrFn) === 'function') {
                if (defaultValueOrFn.constructor.name === 'GeneratorFunction') {
                    console.log('yield generator to fill cache...');
                    data = yield defaultValueOrFn();
                    console.log('yield generator ok.')
                }
                else {
                    console.log('call function to fill cache...');
                    data = defaultValueOrFn();
                    console.log('call function ok.');
                }
            }
            else {
                data = defaultValueOrFn;
            }
            yield $m_set(k, data, lifetime);
            console.log('[cache] cache set for key: ' + key);
        }
        else {
            data = null;
        }
        return data;
    },

    $gets: function* (keys) {
        if (keys.length === 0) {
            return [];
        }
        var
            multiKeys = _.map(keys, function (key) {
                return CACHE_PREFIX + key;
            }),
            data = yield $m_getMulti(multiKeys);
        return _.map(multiKeys, function (key) {
            return data[key] || null;
        });
    },

    $set: function* (key, value, lifetime) {
        var k = CACHE_PREFIX + key;
        yield $m_set(k, value, lifetime || DEFAULT_LIFETIME);
    },

    $remove: function* (key) {
        var k = CACHE_PREFIX + key;
        yield $m_del(k);
    }
};
