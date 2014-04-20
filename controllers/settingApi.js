// setting api

var
    _ = require('lodash'),
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    utils = require('./_utils'),
    constants = require('../constants');

var
    Setting = db.setting,
    warp = db.warp,
    next_id = db.next_id;

// default setting for website:
var website = {
    name: 'My Website',
    description: 'Powered by iTranswarp.js',
    custom_header: '<!-- custom header --> AAA <script> alert </script> haha',
    custom_footer: '<!-- custom footer --> AAA <script> alert </script> haha',
};

var RE_KEY = /^(\w{1,50})\:(\w{1,50})$/;

function getNavigationMenus(callback) {
    callback(null, [{
        name: 'Custom',
        url: 'http://'
    }]);
}

function getSettings(group, callback) {
    // get settings by group, return object with key - value,
    // prefix of key has been removed:
    // 'group1:key1' ==> 'key1'
    Setting.findAll({
        where: '`group`=?',
        params: [group]
    }, function(err, entities) {
        if (err) {
            return callback(err);
        }
        var obj = {};
        var n = group.length + 1;
        _.each(entities, function(s) {
            obj[s.key.substring(n)] = s.value;
        });
        return callback(null, obj);
    });
}

function getSetting(key, defaultValue, callback) {
    if (arguments.length===2) {
        callback = defaultValue;
        defaultValue = undefined;
    }
    Setting.find({
        where: '`key`=?',
        params: [key]
    }, function(err, s) {
        if (err) {
            return callback(err);
        }
        if (s===null) {
            return callback(null, defaultValue);
        }
        return callback(null, s.value);
    });
}

function setSetting(key, value, callback) {
    var m = key.match(RE_KEY);
    if (m===null) {
        return callback(api.invalidParam('key'));
    }
    var group = m[1];
    async.series([
        function(callback) {
            warp.update('delete from settings where `key`=?', [key], callback);
        },
        function(callback) {
            Setting.create({
                group: group,
                key: key,
                value: value
            }, callback);
        }
    ], function(err, results) {
        callback(err);
    });
}

function setSettings(group, settings, callback) {
    var tasks = [function(callback) {
        warp.update('delete from settings where `group`=?', [group], callback);
    }];
    _.each(settings, function(value, key) {
        tasks.push(function(callback) {
            Setting.create({
                group: group,
                key: group + ':' + key,
                value: value
            }, callback);
        });
    });
    async.series(tasks, function(err, results) {
        return callback(err);
    });
}

function getSettingsByDefaults(name, defaults, callback) {
    getSettings(name, function(err, settings) {
        if (err) {
            return callback(err);
        }
        var s = {};
        for (key in defaults) {
            s[key] = settings[key] || defaults[key];
        }
        return callback(null, s);
    });
}

exports = module.exports = {

    defaultSettings: {
        website: website
    },

    getNavigationMenus: getNavigationMenus,

    getSettings: getSettings,

    getSetting: getSetting,

    setSetting: setSetting,

    setSettings: setSettings,

    getSettingsByDefaults: getSettingsByDefaults
}
