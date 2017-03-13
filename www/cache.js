'use strict';

/**
 * Cache object to operate cache (memcached as underlying service).
 * 
 * author: Michael Liao
 */
const
    _ = require('lodash'),
    bluebird = require('bluebird'),
    Memcached = require('memcached'),
    logger = require('./logger'),
    config = require('./config');

// init memcached:
logger.info('init memcache:\n' + JSON.stringify(config.cache, null, ' '));

const
    DEFAULT_LIFETIME = 86400, // 24h
    CACHE_PREFIX = config.cache.prefix,
    memcached = new Memcached(config.cache.host + ':' + config.cache.port, {
        'timeout': config.cache.timeout,
        'retries': config.cache.retries
    }),
    _incr = bluebird.promisify(memcached.incr, { context: memcached }),
    _get = bluebird.promisify(memcached.get, { context: memcached }),
    _set = bluebird.promisify(memcached.set, { context: memcached }),
    _del = bluebird.promisify(memcached.del, { context: memcached }),
    _getMulti = bluebird.promisify(memcached.getMulti, { context: memcached });

module.exports = {
    incr: async (key, initial=0) => {
        let
            k = CACHE_PREFIX + key,
            data = await _incr(k, 1);
        if (data === false) {
            await _set(k, initial+1, DEFAULT_LIFETIME);
            data = initial + 1;
        }
        return data;
    },

    get: async (key, defaultValueOrFn, lifetime=DEFAULT_LIFETIME) => {
        /**
         * get value from cache by key. If key not exist:
         *   return default value if defaultValueOrFn is not a function,
         *   otherwise call defaultValueOfFn, put the result into cache
         *   and return as value.
         */
        let
            k = CACHE_PREFIX + key,
            data = await _get(k);
        if (data) {
            return data;
        }
        if (defaultValueOrFn) {
            if (typeof (defaultValueOrFn) === 'function') {
                if (defaultValueOrFn.constructor.name === 'AsyncFunction') {
                    data = await defaultValueOrFn();
                }
                else {
                    data = defaultValueOrFn();
                }
            }
            else {
                data = defaultValueOrFn;
            }
            await _set(k, data, lifetime);
        }
        else {
            data = null;
        }
        return data;
    },

    gets: async (keys) => {
        if (keys.length === 0) {
            return [];
        }
        let
            multiKeys = _.map(keys, (key) => {
                return CACHE_PREFIX + key;
            }),
            data = await _getMulti(multiKeys);
        return _.map(multiKeys, (key) => {
            return data[key] || null;
        });
    },

    set: async (key, value, lifetime=DEFAULT_LIFETIME) => {
        let k = CACHE_PREFIX + key;
        await _set(k, value, lifetime);
    },

    remove: async (key) => {
        let k = CACHE_PREFIX + key;
        await _del(k);
    },

    count: async (key) => {
        let
            k = CACHE_PREFIX + key,
            num = await _get(k);
        return num ? num : 0;
    },

    counts: async (keys) => {
        if (keys.length === 0) {
            return [];
        }
        let
            multiKeys = _.map(keys, (key) => {
                return CACHE_PREFIX + key;
            }),
            data = await _getMulti(multiKeys);
        return _.map(multiKeys, (key) => {
            return data[key] || 0;
        });
    }
};
