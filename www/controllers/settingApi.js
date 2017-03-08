/**
 * Setting API.
 */
const
    _ = require('lodash'),
    db = require('../db'),
    api = require('../api'),
    cache = require('../cache'),
    helper = require('../helper'),
    constants = require('../constants');

var
    Setting = db.setting,
    warp = db.warp,
    nextId = db.nextId;

const
    RE_KEY = /^(\w{1,50})\:(\w{1,50})$/;

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

logger.info('default settings:\n' + JSON.stringify(defaultSettingValues, null, '  '));

async function getNavigationMenus() {
    return [{
        name: 'Custom',
        url: 'http://'
    }];
}

async function getSettings(group) {
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

async function getSetting(key, defaultValue) {
    var setting = await Setting.findById({
        where: '`key`=?',
        params: [key]
    });
    if (setting === null) {
        return defaultValue === undefined ? null : defaultValue;
    }
    return setting.value;
}

async function setSetting(key, value) {
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

async function setSettings(group, settings) {
    await warp.$update('delete from settings where `group`=?', [group]);
    var key;
    for (key in settings) {
        if (settings.hasOwnProperty(key)) {
            await Setting.create({
                group: group,
                key: group + ':' + key,
                value: settings[key]
            });
        }
    }
}

async function getSettingsByDefaults(name, defaults) {
    var
        settings = await getSettings(name),
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

async function getWebsiteSettings() {
    return yield cache.$get(KEY_WEBSITE, function* () {
        return await getSettingsByDefaults('website', defaultSettingValues.website);
    });
}

async function setWebsiteSettings(settings) {
    await setSettings('website', settings);
    yield cache.$remove(KEY_WEBSITE);
}

async function getSnippets() {
    return yield cache.$get(KEY_SNIPPETS, function* () {
        return await getSettingsByDefaults('snippets', defaultSettingValues.snippets);
    });
}

async function setSnippets(settings) {
    await setSettings('snippets', settings);
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

    'GET /api/settings/definitions': async (ctx, next) => {
        ctx.checkPermission(constants.role.ADMIN);
        ctx.rest(defaultSettingDefinitions);
    },

    'GET /api/settings/website': async (ctx, next) => {
        ctx.checkPermission(constants.role.ADMIN);
        ctx.rest(await getWebsiteSettings());
    },

    'POST /api/settings/website': async (ctx, next) => {
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validateSchema('updateWebsiteSettings');
        var data = this.request.body;
        await setWebsiteSettings(data);
        ctx.rest(await getWebsiteSettings());
    },

    'GET /api/settings/snippets': async (ctx, next) => {
        ctx.checkPermission(constants.role.ADMIN);
        ctx.rest(await getSnippets());
    },

    'POST /api/settings/snippets': async (ctx, next) => {
        ctx.checkPermission(constants.role.ADMIN);
        var data = this.request.body;
        ctx.validate('updateSnippets', data);
        await setSnippets(data);
        ctx.rest(await getSnippets());
    }
};
