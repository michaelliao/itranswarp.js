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
    ],
    snippets: [
        {
            key: 'body_top',
            label: 'Top of the body',
            description: 'Snippet on top of the body',
            value: '',
            type: 'textarea'
        },
        {
            key: 'body_bottom',
            label: 'Bottom of the body',
            description: 'Snippet on bottom of the body',
            value: '',
            type: 'textarea'
        },
        {
            key: 'sidebar_left_top',
            label: 'Top of the left sidebar',
            description: 'Snippet on top of the left sidebar',
            value: '',
            type: 'textarea'
        },
        {
            key: 'sidebar_left_bottom',
            label: 'Bottom of the left sidebar',
            description: 'Snippet on bottom of the left sidebar',
            value: '',
            type: 'textarea'
        },
        {
            key: 'sidebar_right_top',
            label: 'Top of the right sidebar',
            description: 'Snippet on top of the right sidebar',
            value: '',
            type: 'textarea'
        },
        {
            key: 'sidebar_right_bottom',
            label: 'Bottom of the right sidebar',
            description: 'Snippet on bottom of the right sidebar',
            value: '',
            type: 'textarea'
        },
        {
            key: 'content_top',
            label: 'Top of the content',
            description: 'Snippet on top of the content',
            value: '',
            type: 'textarea'
        },
        {
            key: 'content_bottom',
            label: 'Bottom of the content',
            description: 'Snippet on bottom of the content',
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

var
    KEY_WEBSITE = constants.cache.WEBSITE,
    KEY_SNIPPETS = constants.cache.SNIPPETS;

function* $getWebsiteSettings() {
    return yield cache.$get(KEY_WEBSITE, function* () {
        return yield $getSettingsByDefaults('website', defaultSettingValues.website);
    });
}

function* $setWebsiteSettings(settings) {
    yield $setSettings('website', settings);
    yield cache.$remove(KEY_WEBSITE);
}

function* $getSnippets() {
    return yield cache.$get(KEY_SNIPPETS, function* () {
        return yield $getSettingsByDefaults('snippets', defaultSettingValues.snippets);
    });
}

function* $setSnippets(settings) {
    yield $setSettings('snippets', settings);
    yield cache.$remove(KEY_SNIPPETS);
}

module.exports = {

    $getNavigationMenus: $getNavigationMenus,

    $getSettings: $getSettings,

    $getSetting: $getSetting,

    $setSetting: $setSetting,

    $setSettings: $setSettings,

    $getSettingsByDefaults: $getSettingsByDefaults,

    $getWebsiteSettings: $getWebsiteSettings,

    $getSnippets: $getSnippets,

    'GET /api/settings/definitions': function* () {
        helper.checkPermission(this.request, constants.role.ADMIN);
        this.body = defaultSettingDefinitions;
    },

    'GET /api/settings/website': function* () {
        helper.checkPermission(this.request, constants.role.ADMIN);
        this.body = yield $getWebsiteSettings();
    },

    'POST /api/settings/website': function* () {
        helper.checkPermission(this.request, constants.role.ADMIN);
        var data = this.request.body;
        json_schema.validate('updateWebsiteSettings', data);
        yield $setWebsiteSettings(data);
        this.body = yield $getWebsiteSettings();
    },

    'GET /api/settings/snippets': function* () {
        helper.checkPermission(this.request, constants.role.ADMIN);
        this.body = yield $getSnippets();
    },

    'POST /api/settings/snippets': function* () {
        helper.checkPermission(this.request, constants.role.ADMIN);
        var data = this.request.body;
        json_schema.validate('updateSnippets', data);
        yield $setSnippets(data);
        this.body = yield $getSnippets();
    }
};
