'use strict';

/**
 * Webpage API.
 * 
 * author: Michael Liao
 */

const
    _ = require('lodash'),
    api = require('../api'),
    db = require('../db'),
    helper = require('../helper'),
    logger = require('../logger'),
    constants = require('../constants'),
    textApi = require('./textApi'),
    User = db.User,
    Webpage = db.Webpage,
    Text = db.Text,
    nextId = db.nextId;

async function _checkAliasAvailable(alias) {
    let p = await Webpage.findOne({
        where: {
            'alias': alias
        }
    });
    if (p !== null) {
        throw api.invalidParam('alias', 'duplicate alias');
    }
}

async function _getWebpages() {
    return await Webpage.findAll({
        order: 'alias'
    });
}

async function _getWebpage(id) {
    let p = await Webpage.findById(id);
    if (p === null) {
        throw api.notFound('Webpage');
    }
    return p;
}

async function _getWebpageByAlias(alias) {
    let p = await Webpage.findOne({
        where: {
            'alias': alias
        }
    });
    if (p === null) {
        throw api.notFound('Webpage');
    }
    return p;
}

module.exports = {

    getNavigationMenus: async () => {
        let ps = await _getWebpages();
        return ps.filter((p) => {
            return ! p.draft;
        }).map((p) => {
            return {
                name: p.name,
                url: `/webpage/${p.alias}`
            };
        });
    },

    getWebpageByAliasWithContent: async (alias) => {
        let p = await _getWebpageByAlias(alias);
        return await textApi.attachContent(p);
    },

    'GET /api/webpages/:id': async (ctx, next) => {
        /**
         * Get webpage by id.
         * 
         * @name Get Page
         * @param {string} id - The id of the Webpage.
         * @return {object} Webpage object.
         */
        let
            id = ctx.params.id,
            p = await _getWebpage(id);
        ctx.rest(await textApi.attachContent(p));
    },

    'GET /api/webpages': async (ctx, next) => {
        /**
         * Get all Webpages object (but no content value).
         * 
         * @name Get all webpages.
         * @return {object} Result as {"webpages": [{webpage}, {webpage}...]}
         */
        let
            webpages = await _getWebpages(),
            user = ctx.state.__user__;
        // remove draft webpages for non-editor:
        if (user !== null && user.role > constants.role.EDITOR) {
            webpages = webpages.filter((wp) => {
                return ! wp.draft;
            });
        }
        ctx.rest({
            webpages: webpages
        });
    },

    'POST /api/webpages': async (ctx, next) => {
        /**
         * Create a new webpage. Body:
         * 
         * @name Create Webage
         * @param {string} name: The name of the webpage.
         * @param {string} alias: The alias of the webpage.
         * @param {string} content: The content of the webpage.
         * @param {boolean} [draft=false]: The draft status of the webpage, default to false.
         * @param {string} [tags]: The tags of the webpage, seperated by ','.
         * @return {object} The created webpage object.
         */
        ctx.checkPermission(constants.role.EDITOR);
        ctx.validate('createWebpage');
        let
            content_id = nextId(),
            webpage_id = nextId(),
            webpage,
            data = ctx.request.body;
        data.name = data.name.trim();
        data.tags = helper.formatTags(data.tags);
        await _checkAliasAvailable(data.alias);
        await textApi.createText(webpage_id, content_id, data.content);
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
        ctx.checkPermission(constants.role.EDITOR);
        ctx.validate('updateWebpage');
        let
            id = ctx.params.id,
            data = ctx.request.body,
            webpage = await _getWebpage(id);
        if (data.alias && data.alias !== webpage.alias) {
            await _checkAliasAvailable(data.alias);
            webpage.alias = data.alias;
        }
        if (data.name) {
            webpage.name = data.name.trim();
        }
        if (data.tags) {
            webpage.tags = helper.formatTags(data.tags);
        }
        if (data.draft!==undefined) {
            webpage.draft = data.draft;
        }
        if (data.content) {
            let content_id = nextId();
            webpage.content_id = content_id;
            // update content
            await textApi.createText(id, content_id, data.content);
        }
        await webpage.save();
        // attach content:
        if (data.content) {
            webpage.content = data.content;
        }
        else {
            let text = await Text.findById(webpage.content_id);
            webpage.content = text.value;
        }
        ctx.rest(webpage);
    },

    'POST /api/webpages/:id/delete': async (ctx, next) => {
        /**
         * Delete a webpage by its id.
         * 
         * @name Delete Page
         * @param {string} id - The id of the webpage.
         * @return {object} Results contains id of the webpage, e.g. {"id": "12345"}
         */
        ctx.checkPermission(constants.role.EDITOR);
        let
            id = ctx.params.id,
            webpage = await _getWebpage(id);
        await webpage.destroy();
        // delete all texts:
        await Text.destroy({
            where: {
                'ref_id': id
            }
        });
        ctx.rest({ 'id': id });
    }
};
