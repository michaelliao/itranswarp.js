'use strict';

// setting api

var
    _ = require('lodash'),
    api = require('../api'),
    db = require('../db');

var
    Setting = db.setting,
    warp = db.warp,
    next_id = db.next_id;

// default setting for website:
var website = {
    name: 'My Website',
    description: 'Powered by iTranswarp.js',
    keywords: '',
    custom_header: '<!-- custom header -->',
    custom_footer: '<!-- custom footer -->',
    xmlns: ''
};

var RE_KEY = /^(\w{1,50})\:(\w{1,50})$/;

function* $getNavigationMenus() {
    return [{
        name: 'Custom',
        url: 'http://'
    }];
}

function* $getSettings(group) {
    // get settings by group, return object with key - value,
    // prefix of key has been removed:
    // 'group1:key1' ==> 'key1'
    var
        settings = yield Setting.$findAll({
            where: '`group`=?',
            params: [group]
        }),
        obj = {},
        n = group.length + 1;
    _.each(settings, function (s) {
        obj[s.key.substring(n)] = s.value;
    });
    return obj;
}

function* $getSetting(key, defaultValue) {
    var setting = yield Setting.$find({
        where: '`key`=?',
        params: [key]
    });
    if (setting === null) {
        return defaultValue === undefined ? null : defaultValue;
    }
    return setting.value;
}

function* $setSetting(key, value) {
    var
        m = key.match(RE_KEY),
        group;
    if (m === null) {
        throw api.invalidParam('key');
    }
    group = m[1];
    yield warp.$update('delete from settings where `key`=?', [key]);
    yield Setting.$create({
        group: group,
        key: key,
        value: value
    });
}

function* $setSettings(group, settings, callback) {
    yield warp.$update('delete from settings where `group`=?', [group]);
    var key;
    for (key in settings) {
        if (settings.hasOwnProperty(key)) {
            yield Setting.$create({
                group: group,
                key: group + ':' + key,
                value: settings[key]
            });
        }
    }
}

function* $getSettingsByDefaults(name, defaults) {
    var
        settings = yield $getSettings(name),
        key,
        s = {};
    for (key in defaults) {
        if (defaults.hasOwnProperty(key)) {
            s[key] = settings[key] || defaults[key];
        }
    }
    return s;
}

module.exports = {

    defaultSettings: {
        website: website
    },

    $getNavigationMenus: $getNavigationMenus,

    $getSettings: $getSettings,

    $getSetting: $getSetting,

    $setSetting: $setSetting,

    $setSettings: $setSettings,

    $getSettingsByDefaults: $getSettingsByDefaults

};
