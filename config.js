/**

read config files:
  * config_default.js
  * config_override.js if exist

You should override some configurations in your own 'config_override.js', e.g.:

    // config_override.js:
    module.exports = {
        'db': {
            'host': '192.168.0.101', // a specific IP of mysql server
            'port': 3307 // a specific port of mysql server
        }
    }

**/

var
    _ = require('underscore'),
    fs = require('fs'),
    cfg = require('./config_default');

function merge(target, source) {
    _.each(source, function(value, key, dict) {
        if (typeof value=='object') {
            // recursive merge:
            if (key in target && (typeof target[key]=='object')) {
                merge(target[key], value);
            }
            else {
                target[key] = value;
            }
        }
        else {
            target[key] = value;
        }
    });
}

if (fs.existsSync(__dirname + '/config_override.js')) {
    console.log('loading config_override.js...');
    var ovr = require('./config_override');
    merge(cfg, ovr);
}

console.log('configuration loaded:');
console.log(JSON.stringify(cfg));

module.exports = cfg;
