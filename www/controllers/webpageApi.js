'use strict';

// static webpage api

const
    _ = require('lodash'),
    api = require('../api'),
    db = require('../db'),
    helper = require('../helper'),
    logger = require('../logger'),
    constants = require('../constants');

var
    User = db.user,
    Webpage = db.webpage,
    Text = db.text,
    warp = db.warp,
    nextId = db.nextId;

async function checkAliasAvailable(alias) {
    var p = await Webpage.findById({
        where: 'alias=?',
        params: [alias]
    });
    if (p !== null) {
        throw api.invalidParam('alias', 'duplicate alias');
    }
}

async function getWebpages() {
    return await Webpage.findAll({
        order: 'alias'
    });
}

async function getWebpage(id, includeContent) {
    var
        text,
        p = await Webpage.findById(id);
    if (p === null) {
        throw api.notFound('Webpage');
    }
    if (includeContent) {
        text = await Text.findById(p.content_id);
        p.content = text.value;
    }
    return p;
}

async function getWebpageByAlias(alias, includeContent) {
    var
        text,
        p = await Webpage.findById({
            where: 'alias=?',
            params: [alias]
        });
    if (p === null) {
        throw api.notFound('Webpage');
    }
    if (includeContent) {
        text = await Text.findById(p.content_id);
        p.content = text.value;
    }
    return p;
}

async function getNavigationMenus() {
    var ps = await getWebpages();
    return _.map(ps, function (p) {
        return {
            name: p.name,
            url: '/webpage/' + p.alias
        };
    });
}

module.exports = {

    getNavigationMenus: getNavigationMenus,

    getWebpage: getWebpage,

    getWebpages: getWebpages,

    getWebpageByAlias: getWebpageByAlias,

    'GET /api/webpages/:id': async (ctx, next) => {
        /**
         * Get webpage by id.
         * 
         * @name Get Page
         * @param {string} id - The id of the Webpage.
         * @return {object} Webpage object.
         */
        ctx.rest(await getWebpage(id, true));
    },

    'GET /api/webpages': async (ctx, next) => {
        /**
         * Get all Webpages object (but no content value).
         * 
         * @name Get Webpages
         * @return {object} Result as {"webpages": [{webpage}, {webpage}...]}
         */
        ctx.rest({
            webpages: await getWebpages()
        });
    },

    'POST /api/webpages': async (ctx, next) => {
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
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('createWebpage');
        var
            content_id = nextId(),
            webpage_id = nextId(),
            text,
            webpage,
            data = ctx.request.body;
        data.name = data.name.trim();
        data.tags = helper.formatTags(data.tags);
        await checkAliasAvailable(data.alias);
        text = await Text.create({
            id: content_id,
            ref_id: webpage_id,
            value: data.content
        });
        webpage = await Webpage.create({
            id: webpage_id,
            alias: data.alias,
            content_id: content_id,
            name: data.name,
            tags: data.tags,
            draft: data.draft
        });
        // attach content:
        webpage.content = data.content;
        ctx.rest(webpage);
    },

    'POST /api/webpages/:id': async (ctx, next) => {
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
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('updateWebpage');
        var
            content_id = null,
            text,
            props = [],
            data = ctx.request.body,
            webpage = await getWebpage(id);
        if (data.alias && data.alias!==webpage.alias) {
            await checkAliasAvailable(data.alias);
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
            content_id = nextId();
            webpage.content_id = content_id;
            props.push('content_id');
            // update content
            await Text.create({
                id: content_id,
                ref_id: id,
                value: data.content
            });
        }
        if (props.length > 0) {
            props.push('updated_at');
            props.push('version');
            await webpage.update(props);
        }
        // attach content:
        if (content_id) {
            webpage.content = data.content;
        }
        else {
            text = await Text.findById(webpage.content_id);
            webpage.content = text.value;
        }
        this.body = webpage;
    },

    'POST /api/webpages/:id/delete': async (ctx, next) => {
        /**
         * Delete a webpage by its id.
         * 
         * @name Delete Page
         * @param {string} id - The id of the webpage.
         * @return {object} Results contains id of the webpage, e.g. {"id": "12345"}
         */
        ctx.checkPermission(constants.role.ADMIN);
        var webpage = await getWebpage(id);
        await webpage.destroy();
        // delete all texts:
        Text.destroy({
            where: {
                'ref_id': id
            }
        });
        ctx.rest({ 'id': id });
    }
};
