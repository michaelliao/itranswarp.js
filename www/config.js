/*
read config files from:
  * config_default.js
  * /srv/itranswarp/config/override.js if file exist

You should override some configurations in /srv/itranswarp/config/override.js:

    // override.js:
    exports = module.exports = {
        "db": {
            "host": "192.168.0.101", // a specific IP of mysql server
            "port": 3307 // a specific port of mysql server
        }
    }
*/

const
    overrideConfigPath = '/srv/itranswarp/config/override.js',
    _ = require('lodash'),
    fs = require('fs');

var cfg = require('./config_default');

if (fs.existsSync(overrideConfigPath)) {
    console.log(`load ${overrideConfigPath}...`);
    var ovr = require(overrideConfigPath);
    cfg = _.merge(cfg, ovr);
}

cfg.version = '1.0';
// replace by deployment:
cfg.build = '$BUILD$';

console.log('configuration loaded: ' + JSON.stringify(cfg, null, '  '));

module.exports = cfg;
