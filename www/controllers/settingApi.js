'use strict';

// setting api

var
    _ = require('lodash'),
    db = require('../db'),
    api = require('../api'),
    cache = require('../cache'),
    helper = require('../helper'),
    constants = require('../constants'),
    json_schema = require('../json_schema');

var
    Setting = db.setting,
    warp = db.warp,
    next_id = db.next_id;

// default settings:
var defaultSettingDefinitions = {
    website: [
        {
            key: 'name',
            label: 'Name',
            description: 'Name of the website',
            value: 'My Website',
            type: 'text'
        },
        {
            key: 'description',
            label: 'Description',
            description: 'Description of the website',
            value: 'Powered by iTranswarp.js',
            type: 'text',
        },
        {
            key: 'keywords',
            label: 'Keywords',
            description: 'Keywords of the website',
            value: '',
            type: 'text',
        },
        {
            key: 'xmlns',
            label: 'XML Namespace',
            description: 'xmlns value',
            value: '',
            type: 'text'
        },
        {
            key: 'custom_header',
            label: 'Custom Header',
            description: 'Any HTML embeded in <head>...</head>',
            value: '<!-- custom header -->',
            type: 'textarea'
        },
        {
            key: 'custom_footer',
            label: 'Custom Footer',
            description: 'Any HTML embaeded in <footer>...</footer>',
            value: '',
            type: 'textarea'
        }
    ]
};

var defaultSettingValues = _.reduce(defaultSettingDefinitions, function (r, v, k) {
    r[k] = _.reduce(v, function (result, item) {
        result[item.key] = item.value;
        return result;
    }, {});
    return r;
}, {});

console.log('default settings:');
console.log(JSON.stringify(defaultSettingValues, null, '    '));

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

var RE_KEY = /^(\w{1,50})\:(\w{1,50})$/;

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

function* $setSettings(group, settings) {
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

var KEY_WEBSITE = constants.cache.WEBSITE;

function* $getWebsiteSettings() {
    return yield cache.$get(KEY_WEBSITE, function* () {
        return yield $getSettingsByDefaults('website', defaultSettingValues.website);
    });
}

function* $setWebsiteSettings(settings) {
    yield $setSettings('website', settings);
    yield cache.$remove(KEY_WEBSITE);
}

module.exports = {

    $getNavigationMenus: $getNavigationMenus,

    $getSettings: $getSettings,

    $getSetting: $getSetting,

    $setSetting: $setSetting,

    $setSettings: $setSettings,

    $getSettingsByDefaults: $getSettingsByDefaults,

    $getWebsiteSettings: $getWebsiteSettings,

    'GET /api/settings/definitions': function* () {
        this.body = defaultSettingDefinitions;
    },

    'GET /api/settings/website': function* () {
        this.body = yield $getWebsiteSettings();
    },

    'POST /api/settings/website': function* () {
        helper.checkPermission(this.request, constants.role.ADMIN);
        var data = this.request.body;
        json_schema.validate('updateWebsiteSettings', data);
        yield $setWebsiteSettings(data);
        this.body = yield $getWebsiteSettings();
    }
};
