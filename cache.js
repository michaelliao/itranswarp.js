// init memcache:

console.log('init memcache...');

var config = require('./config');
var Memcached = require('memcached');

// init memcached:
var memcached = new Memcached(config.cache.host + config.cache.port, {
    'timeout': config.cache.timeout,
    'retries': config.cache.retries
});

function get(key, defaultValue, callback) {
    //
}

function set(key, value, lifetime, callback) {
    if (arguments===3) {
        callback = lifetime;
        lifetime = 86400;
    }
    memcached.set(key, value, lifetime, callback);
}

function del(key, callback) {
    memcached.del(key, callback);
}

exports = module.exports = dict;
