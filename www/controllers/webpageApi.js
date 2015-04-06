'use strict';

// static webpage api

var
    _ = require('lodash'),
    api = require('../api'),
    db = require('../db'),
    helper = require('../helper'),
    constants = require('../constants'),
    json_schema = require('../json_schema');

var
    User = db.user,
    Webpage = db.webpage,
    Text = db.text,
    warp = db.warp,
    next_id = db.next_id;

function* $checkAliasAvailable(alias) {
    var p = yield Webpage.$find({
        where: 'alias=?',
        params: [alias]
    });
    if (p !== null) {
        throw api.invalidParam('alias', 'duplicate alias');
    }
}

function* $getWebpages() {
    return yield Webpage.$findAll({
        order: 'alias'
    });
}

function* $getWebpage(id) {
    var p = yield Webpage.$find(id);
    if (p === null) {
        throw api.notFound('Webpage');
    }
    return p;
}

function* $getWebpageByAlias(alias) {
    var p = yield Webpage.$find({
        where: 'alias=?',
        params: [alias]
    });    
    if (p === null) {
        throw api.notFound('Webpage');
    }
    return p;
}

function* $getNavigationMenus() {
    var ps = yield getWebpages();
    return _.map(ps, function (p) {
        return {
            name: p.name,
            url: '/webpage/' + p.alias
        };
    });
}

module.exports = {

    $getNavigationMenus: $getNavigationMenus,

    $getWebpage: $getWebpage,

    $getWebpages: $getWebpages,

    $getWebpageByAlias: $getWebpageByAlias,

    'GET /api/webpages/:id': function* (id) {
        /**
         * Get webpage by id.
         * 
         * @name Get Page
         * @param {string} id - The id of the Webpage.
         * @return {object} Webpage object.
         */
        var
            webpage = yield $getWebpage(id),
            text = yield Text.$find(webpage.content_id);
        webpage.content = text.value;
        this.body = webpage;
    },

    'GET /api/webpages': function* () {
        /**
         * Get all Webpages object (but no content value).
         * 
         * @name Get Webpages
         * @return {object} Result as {"webpages": [{webpage}, {webpage}...]}
         */
        this.body = {
            webpages: yield $getWebpages()
        };
    },

    'POST /api/webpages': function* () {
        /**
         * Create a new webpage.
         * 
         * @name Create Webage
         * @param {string} name: The name of the webpage.
         * @param {string} alias: The alias of the webpage.
         * @param {string} content: The content of the webpage.
         * @param {boolean} [draft=false]: The draft status of the webpage, default to false.
         * @param {string} [tags]: The tags of the webpage, seperated by ','.
         * @return {object} The created webpage object.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var
            content_id,
            webpage_id,
            text,
            webpage,
            data = this.request.body;
        json_schema.validate('createWebpage', data);
        data.name = data.name.trim();
        data.tags = helper.formatTags(data.tags);
        yield $checkAliasAvailable(data.alias);
        content_id = next_id();
        webpage_id = next_id();
        text = yield Text.$create({
            id: content_id,
            ref_id: webpage_id,
            value: data.content
        });
        webpage = yield Webpage.$create({
            id: webpage_id,
            alias: data.alias,
            content_id: content_id,
            name: data.name,
            tags: data.tags,
            draft: data.draft
        });
        // attach content:
        webpage.content = data.content;
        this.body = webpage;
    },

    'POST /api/webpages/:id': function* (id) {
        /**
         * Update webpage by id.
         * 
         * @name Update Page
         * @param {string} id: The id of the webpage.
         * @param {string} [name]: The name of the webpage.
         * @param {string} [alias]: The alias of the webpage.
         * @param {string} [content]: The content of the webpage.
         * @param {boolean} [draft]: The draft status of the webpage.
         * @param {string} [tags]: The tags of the webpage, seperated by ','.
         * @return {object} Updated webpage object.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var
            content_id = null,
            webpage,
            text,
            props = [],
            data = this.request.body;
        json_schema.validate('updateWebpage', data);
        webpage = yield $getWebpage(id);
        if (data.alias && data.alias!==webpage.alias) {
            yield $checkAliasAvailable(data.alias);
            webpage.alias = data.alias;
            props.push('alias');
        }
        if (data.name) {
            webpage.name = data.name.trim();
            props.push('name');
        }
        if (data.tags) {
            webpage.tags = helper.formatTags(data.tags);
            props.push('tags');
        }
        if (data.draft!==undefined) {
            webpage.draft = data.draft;
            props.push('draft');
        }
        if (data.content) {
            content_id = next_id();
            webpage.content_id = content_id;
            props.push('content_id');
            // update content
            yield Text.$create({
                id: content_id,
                ref_id: id,
                value: data.content
            });
        }
        if (props.length > 0) {
            props.push('updated_at');
            props.push('version');
            yield webpage.$update(props);
        }
        // attach content:
        if (content_id) {
            webpage.content = data.content;
        }
        else {
            text = yield Text.$find(webpage.content_id);
            webpage.content = text.value;
        }
        this.body = webpage;
    },

    'POST /api/webpages/:id/delete': function* (id) {
        /**
         * Delete a webpage by its id.
         * 
         * @name Delete Page
         * @param {string} id - The id of the webpage.
         * @return {object} Results contains id of the webpage, e.g. {"id": "12345"}
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var webpage = yield $getWebpage(id);
        yield webpage.$destroy();
        // delete all texts:
        warp.$update('delete from texts where ref_id=?', [id]);
        this.body = {
            id: id
        };
    }
};
