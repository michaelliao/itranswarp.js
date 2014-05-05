// init memcache:

var _ = require('lodash');

var config = require('./config');
var Memcached = require('memcached');

// init memcached:
console.log('init memcache...');
var memcached = new Memcached(config.cache.host + ':' + config.cache.port, {
    'timeout': config.cache.timeout,
    'retries': config.cache.retries
});

var DEFAULT_LIFETIME = 86400; // 24h
var COUNTER_PREFIX = 'CT@';

function incr(key, initial, callback) {
    if (arguments.length===2) {
        callback = initial;
        initial = 0;
    }
    var k = COUNTER_PREFIX + key;
    memcached.incr(k, 1, function(err, data) {
        if (err) {
            callback && callback(err);
            return;
        }
        if (data===false) {
            memcached.set(k, initial + 1, DEFAULT_LIFETIME * 10, function(err) {
                if (err) {
                    callback && callback(err);
                }
                else {
                    callback && callback(null, initial + 1);
                }
            });
            return;
        }
        callback && callback(null, data);
    });
}

function count(key, callback) {
    memcached.get(COUNTER_PREFIX + key, function(err, num) {
        if (err) {
            return callback(err);
        }
        return callback(null, num===false ? 0 : num);
    });
}

function counts(keys, callback) {
    var multiKeys = _.map(keys, function(key) {
        return COUNTER_PREFIX + key;
    });
    memcached.getMulti(multiKeys, function(err, data) {
        if (err) {
            return callback(err);
        }
        callback(null, _.map(multiKeys, function(key) {
            return data[key] || 0;
        }));
    });
}

function gets(keys, callback) {
    memcached.getMulti(keys, function(err, data) {
        if (err) {
            return callback(err);
        }
        return callback(null, _.map(keys, function(key) {
            return data[key] || null;
        }));
    });
}

function get(key, defaultValueOrFn, callback) {
    if (arguments.length===2) {
        callback = defaultValueOrFn;
        defaultValueOrFn = undefined;
    }
    memcached.get(key, function(err, data) {
        if (err) {
            return callback(err);
        }
        if (data) {
            return callback(null, data);
        }
        if (defaultValueOrFn) {
            var isFn = typeof(defaultValueOrFn)==='function';
            var value = isFn ? defaultValueOrFn() : defaultValueOrFn;
            if (isFn) {
                set(key, value, defaultValueOrFn.lifetime || DEFAULT_LIFETIME, function(err) {
                    callback(null, value);
                });
            }
            else {
                callback(null, value);
            }
            return;
        }
        return callback(null, null);
    });
}

function set(key, value, lifetime, callback) {
    if (arguments.length===3) {
        callback = lifetime;
        lifetime = DEFAULT_LIFETIME;
    }
    memcached.set(key, value, lifetime, function(err) {
        callback && callback(err ? err : null);
    });
}

function remove(key, callback) {
    memcached.del(key, function(err) {
        if (err) {
            callback && callback(err);
        }
        else {
            callback && callback(null);
        }
    });
}

exports = module.exports = {
    get: get,
    gets: gets,
    set: set,
    remove: remove,
    incr: incr,
    count: count,
    counts: counts,
};
