'use strict';

/**
 * Setting API.
 */
const
    _ = require('lodash'),
    db = require('../db'),
    api = require('../api'),
    cache = require('../cache'),
    helper = require('../helper'),
    logger = require('../logger'),
    constants = require('../constants'),
    Setting = db.Setting,
    RE_KEY = /^(\w{1,50})\:(\w{1,50})$/;

// default setting definitions:
const defaultSettingDefinitions = {
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
            value: 'itranswarp',
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
            value: '<!-- custom footer -->',
            type: 'textarea'
        }
    ],
    snippets: [
        {
            key: 'body_top',
            label: 'Top of the body',
            description: 'Snippet on top of the body',
            value: '<!-- body_top -->',
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

/**
 *  default setting key-value like:
 *  {
 *    "website": {
 *      "name": "My Website",
 *      "description": "powered by ..."
 *    },
 *    "snippets": {
 *      "body_top": "",
 *      "body_bottom": ""
 *    }
 *  }
 */
const defaultSettingValues = _.reduce(defaultSettingDefinitions, function (r, v, k) {
    r[k] = _.reduce(v, function (result, item) {
        result[item.key] = item.value;
        return result;
    }, {});
    return r;
}, {});

logger.info('default settings:\n' + JSON.stringify(defaultSettingValues, null, '  '));

async function getSettings(group) {
    // get settings by group, return object with key - value,
    // prefix of key has been removed:
    // 'group1:key1' ==> 'key1'
    var
        settings = await Setting.findAll({
            where: {
                'group': group
            }
        }),
        n = group.length + 1;
    return settings.reduce((acc, setting) => {
        acc[setting.key.substring(n)] = setting.value;
        return acc;
    }, {});
}

async function getSetting(key, defaultValue=null) {
    var setting = await Setting.findOne({
        where: {
            'key': key
        }
    });
    return (setting === null) ? defaultValue :  setting.value;
}

async function setSetting(key, value) {
    var m = key.match(RE_KEY);
    if (m === null) {
        throw api.invalidParam('key', 'key must be like "prefix:xyz"');
    }
    await Setting.destroy({
        where: {
            'key': key
        }
    });
    await Setting.create({
        group: m[1],
        key: key,
        value: value
    });
}

async function setSettings(group, settings) {
    await Setting.destroy({
        where: {
            'group': group
        }
    });
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

async function _getSettingsFillWithDefaultsIfMissing(name, defaults) {
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

const
    KEY_WEBSITE = constants.cache.WEBSITE,
    KEY_SNIPPETS = constants.cache.SNIPPETS;

async function getWebsiteSettings() {
    return await cache.get(KEY_WEBSITE, async () => {
        return await _getSettingsFillWithDefaultsIfMissing('website', defaultSettingValues.website);
    });
}

async function setWebsiteSettings(settings) {
    await setSettings('website', settings);
    await cache.remove(KEY_WEBSITE);
}

async function getSnippets() {
    return await cache.get(KEY_SNIPPETS, async () => {
        return await _getSettingsFillWithDefaultsIfMissing('snippets', defaultSettingValues.snippets);
    });
}

async function setSnippets(settings) {
    await setSettings('snippets', settings);
    await cache.remove(KEY_SNIPPETS);
}

module.exports = {

    getNavigationMenus: () => {
        return [{
            name: 'Custom',
            url: 'http://'
        }];
    },

    getSettings: getSettings,

    getSetting: getSetting,

    getWebsiteSettings: getWebsiteSettings,

    getSnippets: getSnippets,

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
        ctx.validate('updateWebsiteSettings');
        await setWebsiteSettings(ctx.request.body);
        ctx.rest(await getWebsiteSettings());
    },

    'GET /api/settings/snippets': async (ctx, next) => {
        ctx.checkPermission(constants.role.ADMIN);
        ctx.rest(await getSnippets());
    },

    'POST /api/settings/snippets': async (ctx, next) => {
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('updateSnippets');
        await setSnippets(ctx.request.body);
        ctx.rest(await getSnippets());
    }
};
