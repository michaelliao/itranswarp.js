'use strict';

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
    constants = require('../constants'),
    Navigation = db.Navigation,
    nextId = db.nextId;

async function _clearCache() {
    await cache.remove(constants.cache.NAVIGATIONS);
}

async function getNavigation(id) {
    let
        navigations = await getNavigations(),
        filtered = navigations.filter((nav) => {
            return nav.id === id;
        });
    if (filtered.length === 0) {
        throw api.notFound('Navigation');
    }
    return filtered[0];
}

async function getNavigations() {
    return await cache.get(constants.cache.NAVIGATIONS, async () => {
        return await Navigation.findAll({
            order: 'display_order'
        });
    });
}

async function getNavigationMenus() {
    let
        menus = [],
        apiNames = ['categoryApi', 'articleApi', 'wikiApi', 'webpageApi', 'discussApi', 'attachmentApi', 'userApi', 'settingApi'],
        apiModules = apiNames.map((name) => {
            return require('./' + name);
        });
    for (let i=0; i<apiModules.length; i++) {
        let apiModule = apiModules[i];
        if (apiModule.hasOwnProperty('getNavigationMenus')) {
            let getNavigationMenus = apiModule.getNavigationMenus;
            if (typeof (getNavigationMenus) === 'function') {
                let results;
                if (getNavigationMenus.constructor.name === 'AsyncFunction') {
                    results = await getNavigationMenus();
                } else {
                    results = getNavigationMenus();
                }
                menus = menus.concat(results);
            } else {
                logger.warn(`"${apiNames[i]}.getNavigationMenus" is invalid function.`);
            }
        }
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
            data = ctx.request.body,
            num = await Navigation.max('display_order'),
            nav = await Navigation.create({
                name: data.name.trim(),
                url: data.url.trim(),
                display_order: isNaN(num) ? 0 : num + 1
            });
        await _clearCache();
        ctx.rest(nav)
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
        let
            nav,
            data = ctx.request.body,
            ids = data.ids,
            navigations = await Navigation.findAll();
        if (ids.length !== navigations.length) {
            throw api.invalidParam('ids', 'invalid id list');
        }
        navigations.forEach((nav) => {
            let newIndex = ids.indexOf(nav.id);
            if (newIndex === (-1)) {
                throw api.invalidParam('ids', 'invalid id list');
            }
            nav.display_order = newIndex;
        });
        for (nav of navigations) {
            await nav.save();
        }
        await _clearCache();
        ctx.rest({
            navigations: navigations
        });
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
            id = ctx.params.id,
            navigation = await getNavigation(id);
        await Navigation.destroy({
            where: {
                id: id
            }
        });
        await _clearCache();
        ctx.rest({
            id: id
        });
    }
};
