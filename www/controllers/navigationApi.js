'use strict';

// navigation api

var
    _ = require('lodash'),
    db = require('../db'),
    api = require('../api'),
    cache = require('../cache'),
    helper = require('../helper'),
    config = require('../config'),
    constants = require('../constants'),
    json_schema = require('../json_schema');

var
    Navigation = db.navigation,
    warp = db.warp,
    next_id = db.next_id;

function* $getNavigation(id) {
    var navigation = yield Navigation.$find(id);
    if (navigation === null) {
        throw api.notFound('Navigation');
    }
    return navigation;
}

function* $getNavigations() {
    return yield Navigation.$findAll({
        order: 'display_order'
    });
}

function* $getNavigationMenus() {
    var
        apiNames = ['categoryApi', 'articleApi', 'wikiApi', 'webpageApi', 'discussApi', 'attachmentApi', 'userApi', 'settingApi'],
        apis = _.filter(
            _.map(apiNames, function (name) {
                return require('./' + name);
            }), function (api) {
                return api.hasOwnProperty('$getNavigationMenus');
            }),
        menus = [],
        i;
    for (i = 0; i < apis.length; i ++) {
        menus = menus.concat(yield apis[i].$getNavigationMenus());
    }
    return menus;
}

module.exports = {

    $getNavigation: $getNavigation,

    $getNavigations: $getNavigations,

    'GET /api/navigations/all/menus': function* () {
        /**
         * Get all navigation menus.
         * 
         * @name Get NavigationMenus
         * @return {object} Result like {"navigationMenus": [navigation array]}
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        this.body = {
            navigationMenus: yield $getNavigationMenus()
        };
    },

    'GET /api/navigations': function* () {
        /**
         * Get all navigations.
         * 
         * @name Get Navigations
         * @return {object} Result like {"navigations": [navigation array]}
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        this.body = {
            navigations: yield $getNavigations()
        };
    },

    'POST /api/navigations': function* () {
        /**
         * Create a navigation.
         * 
         * @name Create Navigation
         * @param {string} name: The name of the navigation.
         * @param {string} url: The URL of the navigation.
         * @return {object} The navigation object.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var
            name,
            url,
            num,
            data = this.request.body;
        json_schema.validate('createNavigation', data);
        name = data.name.trim();
        url = data.url.trim();

        num = yield Navigation.$findNumber('max(display_order)');
        this.body = yield Navigation.$create({
            name: name,
            url: url,
            display_order: (num === null) ? 0 : num + 1
        });
        yield cache.$remove(constants.cache.NAVIGATIONS);
    },

    'POST /api/navigations/all/sort': function* () {
        /**
         * Sort navigations.
         *
         * @name Sort Navigations
         * @param {array} id: The ids of the navigation.
         * @return {object} The sort result like {"sort":true}.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var data = this.request.body;
        json_schema.validate('sortNavigations', data);
        this.body = {
            navigations: yield helper.$sort(data.ids, yield $getNavigations())
        };
        yield cache.$remove(constants.cache.NAVIGATIONS);
    },

    'POST /api/navigations/:id/delete': function* (id) {
        /**
         * Delete a navigation.
         *
         * @name Delete Navigation
         * @param {string} id: The id of the navigation.
         * @return {object} The deleted navigation id like {"id":"123"}.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var navigation = yield $getNavigation(id);
        yield navigation.$destroy();
        this.body = {
            id: id
        };
        yield cache.$remove(constants.cache.NAVIGATIONS);
    }
};
