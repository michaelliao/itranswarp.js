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
    $incr = thunkify(memcached.incr),
    $get = thunkify(memcached.get),
    $set = thunkify(memcached.set),
    $del = thunkify(memcached.del),
    $getMulti = thunkify(memcached.getMulti);

module.exports = {

    $incr: function* (key, initial) {
        if (initial === undefined) {
            initial = 0;
        }
        var data = yield $incr(k, 1);
        if (data === false) {
            yield $set(k, initial + 1, DEFAULT_LIFETIME);
            data = initial + 1;
        }
        return data;
    },

    $count: function* (key) {
        var num = yield $get(CACHE_PREFIX + key);
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
            data = yield $getMulti(multiKeys);
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
            data = yield $get(k);
        if (data) {
            return data;
        }
        if (defaultValueOrFn) {
            if (typeof (defaultValueOrFn) === 'function') {
                lifetime = lifetime || DEFAULT_LIFETIME;
                if (defaultValueOrFn.constructor.name === 'GeneratorFunction') {
                    data = yield defaultValueOrFn;
                }
                else {
                    data = defaultValueOrFn();
                }
                yield $set(k, data, lifetime);
            }
            else {
                data = defaultValueOrFn;
            }
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
            data = yield $getMulti(multiKeys);
        return _.map(multiKeys, function (key) {
            return data[key] || null;
        });
    },

    $set: function* (key, value, lifetime) {
        yield $set(CACHE_PREFIX + key, value, lifetime || DEFAULT_LIFETIME);
    },

    $remove: function* (key) {
        yield $del(CACHE_PREFIX + key);
    }
};
