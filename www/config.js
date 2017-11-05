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

let cfg = require('./config_default');

if (env) {
    let overrideFile = 'config_' + env;
    logger.info(`will load override config: ${overrideFile}...`);
    try {
        let ovr = require('./' + overrideFile);
        cfg = _.merge(cfg, ovr);
        logger.info(`override config ${overrideFile} loaded ok.`);
    } catch (e) {
        logger.warn(`failed to load override config ${overrideFile}.`, e);
    }
}

logger.debug('configuration loaded: ' + JSON.stringify(cfg, null, '  '));

module.exports = cfg;
