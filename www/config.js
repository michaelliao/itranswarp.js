'use strict';

/*
read config files from:
  * config_default.js (built-in)
  * config_<NODE_ENV>.js (if file exist)

You should override some configurations in config_<NODE_ENV>.js.

For example, suppose NODE_ENV=production, the override file is config_production.js:

    // config_production.js:
    exports = module.exports = {
        "db": {
            "host": "192.168.0.101", // a specific IP of mysql server
            "port": 3307 // a specific port of mysql server
        }
    }
*/

const
    _ = require('lodash'),
    logger = require('./logger'),
    env = process.env.NODE_ENV || '';

logger.info(`load config with env = ${env}...`)

let defaultCfg = require('./config_default');

function getEnvOrDefault(key, defaultValue) {
    let value = process.env[key.toUpperCase()];
    if (value === undefined) {
        return defaultValue;
    }
    return value;
}

// override key with key = domain, value = getEnvOrDefault(DOMAIN, defaultValue)
let cfg = {};

_.each(defaultCfg, (value, key) => {
    cfg[key] = getEnvOrDefault(key, value);
});

logger.info('configuration loaded: ' + JSON.stringify(cfg, null, '  '));

module.exports = cfg;
