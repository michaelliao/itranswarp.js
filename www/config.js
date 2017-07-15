'use strict';

/*
read config files from:
  * config_default.js (built-in)
  * config_override.js (if file exist)

You should override some configurations in config_override.js:

    // config_override.js:
    exports = module.exports = {
        "db": {
            "host": "192.168.0.101", // a specific IP of mysql server
            "port": 3307 // a specific port of mysql server
        }
    }
*/

const
    _ = require('lodash'),
    logger = require('./logger');

let cfg = require('./config_default');

try {
    let ovr = require('./config_override');
    cfg = _.merge(cfg, ovr);
    logger.warn('loaded config_override.');
} catch (e) {
    logger.warn('Cannot read config_override.');
}

logger.debug('configuration loaded: ' + JSON.stringify(cfg, null, '  '));

module.exports = cfg;
