'use strict';

// navigation api

var
    _ = require('lodash'),
    api = require('../api'),
    db = require('../db'),
    helper = require('../helper'),
    config = require('../config'),
    cache = require('../cache'),
    constants = require('../constants');

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

module.exports = {

    $getNavigation: $getNavigation,

    $getNavigations: $getNavigations,

    'GET /api/navigations': function* () {
        /**
         * Get all navigations.
         * 
         * @name Get Navigations
         * @return {object} Result like {"navigations": [navigation array]}
         */
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
            max,
            data = this.request.body;
        json_schema.validate('createNavigation', data);
        name = data.name.trim();
        url = data.url.trim();

        num = yield Navigation.$findNumber('max(display_order)');
        this.body = yield Navigation.create({
            name: name,
            url: url,
            display_order: (num === null) ? 0 : num + 1
        });
        yield cache.$remove(constants.cache.NAVIGATIONS);
    },

    'POST /api/navigations/sort': function* () {
        /**
         * Sort navigations.
         *
         * @name Sort Navigations
         * @param {array} id: The ids of the navigation.
         * @return {object} The sort result like {"sort":true}.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var data = this.request.body;
        json_schema.validate('sortNavigation', data);
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
    },

    'POST /api/navigations/:id': function* (id) {
        /**
         * Update a navigation.
         *
         * @name Update Navigation
         * @param {string} id: The id of the navigation.
         * @param {string} [name]: The name of the navigation.
         * @param {string} [url]: The URL of the navigation.
         * @return {object} The navigation object.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var
            navigation,
            props = [],
            data = this.request.body;
        json_schema.validate('updateNavigation', data);
        navigation = yield $getNavigation(id);
        if (data.name) {
            navigation.name = data.name.trim();
            props.push('name');
        }
        if (data.url) {
            navigation.url = data.url.trim();
            props.push('url');
        }
        if (props.length > 0) {
            props.push('updated_at');
            props.push('version');
            yield navigation.$update(props);
        }
        this.body = {
            navigation: navigation
        };
        yield cache.$remove(constants.cache.NAVIGATIONS);
    }
};
