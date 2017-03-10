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
    constants = require('../constants');

var
    User = db.User,
    Webpage = db.Webpage,
    Text = db.Text,
    nextId = db.nextId;

async function checkAliasAvailable(alias) {
    var p = await Webpage.findOne({
        where: {
            'alias': alias
        }
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

async function getWebpage(id) {
    var p = await Webpage.findById(id);
    if (p === null) {
        throw api.notFound('Webpage');
    }
    return p;
}

async function getWebpageWithContent(id) {
    var
        p = await getWebpage(id),
        text = await Text.findById(p.content_id),
        r = p.toJSON();
    r.content = text.value;
    return r;
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
        let id = ctx.params.id;
        ctx.rest(await getWebpageWithContent(id));
    },

    'GET /api/webpages': async (ctx, next) => {
        /**
         * Get all Webpages object (but no content value).
         * 
         * @name Get all webpages.
         * @return {object} Result as {"webpages": [{webpage}, {webpage}...]}
         */
        let
            webpages = await getWebpages(),
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
        var
            r,
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
        r = webpage.toJSON();
        r.content = data.content;
        ctx.rest(r);
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
        var
            r,
            id = ctx.params.id,
            content_id = null,
            text,
            data = ctx.request.body,
            webpage = await getWebpage(id);
        if (data.alias && data.alias !== webpage.alias) {
            await checkAliasAvailable(data.alias);
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
            content_id = nextId();
            webpage.content_id = content_id;
            // update content
            await Text.create({
                id: content_id,
                ref_id: id,
                value: data.content
            });
        }
        await webpage.save();
        // attach content:
        r = webpage.toJSON();
        if (content_id) {
            r.content = data.content;
        }
        else {
            text = await Text.findById(webpage.content_id);
            r.content = text.value;
        }
        ctx.rest(r);
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
        var
            id = ctx.params.id,
            webpage = await getWebpage(id);
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
