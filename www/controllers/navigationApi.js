/**
 * navigation api.
 */

const
    _ = require('lodash'),
    db = require('../db'),
    api = require('../api'),
    cache = require('../cache'),
    helper = require('../helper'),
    config = require('../config'),
    constants = require('../constants');

var
    Navigation = db.navigation,
    warp = db.warp,
    nextId = db.nextId;

async function getNavigation(id) {
    var navigation = await Navigation.findById(id);
    if (navigation === null) {
        throw api.notFound('Navigation');
    }
    return navigation;
}

async function getNavigations() {
    return await Navigation.findAll({
        order: 'display_order'
    });
}

async function getNavigationMenus() {
    var
        apiNames = ['categoryApi', 'articleApi', 'wikiApi', 'webpageApi', 'discussApi', 'attachmentApi', 'userApi', 'settingApi'],
        apis = _.filter(
            _.map(apiNames, function (name) {
                return require('./' + name);
            }), function (api) {
                return api.hasOwnProperty('getNavigationMenus');
            }),
        menus = [],
        i;
    for (i = 0; i < apis.length; i ++) {
        menus = menus.concat(await apis[i].getNavigationMenus());
    }
    return menus;
}

module.exports = {

    getNavigation: getNavigation,

    getNavigations: getNavigations,

    'GET /api/navigations/all/menus': async (ctx, next) => {
        /**
         * Get all navigation menus.
         * 
         * @name Get NavigationMenus
         * @return {object} Result like {"navigationMenus": [navigation array]}
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.rest({
            navigationMenus: await getNavigationMenus()
        });
    },

    'GET /api/navigations': async (ctx, next) => {
        /**
         * Get all navigations.
         * 
         * @name Get Navigations
         * @return {object} Result like {"navigations": [navigation array]}
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.rest({
            navigations: await getNavigations()
        });
    },

    'POST /api/navigations': async (ctx, next) => {
        /**
         * Create a navigation.
         * 
         * @name Create Navigation
         * @param {string} name: The name of the navigation.
         * @param {string} url: The URL of the navigation.
         * @return {object} The navigation object.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('createNavigation');
        let
            name,
            url,
            num,
            data = ctx.request.body;
        name = data.name.trim();
        url = data.url.trim();

        num = await Navigation.findNumber('max(display_order)');
        ctx.rest(await Navigation.create({
            name: name,
            url: url,
            display_order: (num === null) ? 0 : num + 1
        }));
        await cache.remove(constants.cache.NAVIGATIONS);
    },

    'POST /api/navigations/all/sort': async (ctx, next) => {
        /**
         * Sort navigations.
         *
         * @name Sort Navigations
         * @param {array} id: The ids of the navigation.
         * @return {object} The sort result like {"sort":true}.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('sortNavigations');
        let data = this.request.body;
        ctx.rest({
            navigations: await helper.$sort(data.ids, await getNavigations())
        });
        await cache.remove(constants.cache.NAVIGATIONS);
    },

    'POST /api/navigations/:id/delete': async (ctx, next) => {
        /**
         * Delete a navigation.
         *
         * @name Delete Navigation
         * @param {string} id: The id of the navigation.
         * @return {object} The deleted navigation id like {"id":"123"}.
         */
        ctx.checkPermission(constants.role.ADMIN);
        let
            id = ctx.request.params.id,
            navigation = await getNavigation(id);
        await navigation.destroy();
        ctx.rest({
            id: id
        });
        await cache.remove(constants.cache.NAVIGATIONS);
    }
};
