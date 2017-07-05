'use strict';

/**
 * Wiki api.
 * 
 * author: Michael Liao
 */
const
    _ = require('lodash'),
    sequelize = require('sequelize'),
    api = require('../api'),
    db = require('../db'),
    md = require('../md'),
    helper = require('../helper'),
    search = require('../search/search'),
    constants = require('../constants'),
    attachmentApi = require('./attachmentApi'),
    User = db.User,
    Wiki = db.Wiki,
    WikiPage = db.WikiPage,
    Text = db.Text,
    nextId = db.nextId;

function indexWiki(r) {
    process.nextTick(() => {
        // search.engine.index({
        //     type: 'wiki',
        //     id: r.id,
        //     name: r.name,
        //     description: r.description || '',
        //     content: helper.html2text(helper.md2html(r.content, true)),
        //     created_at: r.created_at,
        //     updated_at: r.updated_at,
        //     url: '/wiki/' + (r.wiki_id ? r.wiki_id + '/' : '') + r.id,
        //     upvotes: 0
        // });
    });
}

function unindexWiki(r) {
    // process.nextTick(() => {
    //     search.engine.unindex({
    //         id: r.id
    //     });
    // });
}

async function _attachContent(entity) {
    let text = await Text.findById(entity.content_id);
    entity = entity.toJSON();
    entity.content = text.value;
    return entity;
}

async function _getWikis() {
    return await Wiki.findAll({
        order: 'name'
    });
}

async function getWiki(id, includeContent=false) {
    let wiki = await Wiki.findById(id);
    if (wiki === null) {
        throw api.notFound('Wiki');
    }
    return includeContent ? _attachContent(wiki) : wiki;
}

async function getWikiPage(id, includeContent=false) {
    let wp = await WikiPage.findById(id);
    if (wp === null) {
        throw api.notFound('WikiPage');
    }
    return includeContent ? _attachContent(wp) : wp;
}

function treeIterate(nodes, root) {
    let
        rid = root.id,
        removes = [];
    root.children = [];
    _.each(nodes, function (node, nid) {
        if (node.parent_id === rid) {
            root.children.push(node);
            removes.push(nid);
        }
    });
    _.each(removes, function (nid) {
        delete nodes[nid];
    });
    if (root.children.length > 0) {
        root.children.sort(function (n1, n2) {
            return n1.display_order < n2.display_order ? (-1) : 1;
        });
        _.each(root.children, function (child) {
            treeIterate(nodes, child);
        });
    }
}

function flatten(arr, depth, children) {
    _.each(children, function (wp) {
        wp.depth = depth;
        arr.push(wp);
        flatten(arr, depth + 1, wp.children);
    });
}

async function getWikiPages(wiki_id, returnAsDict=false) {
    let
        proot,
        pdict = {},
        pages = await WikiPage.findAll({
            where: {
                'wiki_id': wiki_id
            }
        });
    pages.forEach((p) => {
        pdict[p.id] = p;
    });
    if (returnAsDict) {
        return pdict;
    }
    proot = {
        id: ''
    };
    treeIterate(pdict, proot);
    return proot.children;
}

async function getWikiTree(id, isFlatten=false) {
    let
        arr,
        wiki = await getWiki(id),
        children = await getWikiPages(id);
    wiki = wiki.toJSON();
    if (isFlatten) {
        arr = [];
        flatten(arr, 0, children);
        wiki.children = arr;
    }
    else {
        wiki.children = children;
    }
    return wiki;
}

module.exports = {

    getNavigationMenus: async () => {
        let ws = await _getWikis();
        return ws.map((w) => {
            return {
                name: w.name,
                url: '/wiki/' + w.id
            };
        });
    },

    getWikiTree: getWikiTree,

    getWiki: getWiki,

    getWikiPage: getWikiPage,

    'GET /api/wikis/:id': async (ctx, next) => {
        /**
         * Get wiki by id.
         * 
         * @name Get Wiki
         * @param {string} id: Id of the wiki.
         * @param {string} [format='']: Return html if format is 'html', default to raw.
         * @return {object} Wiki object.
         * @error {entity:notfound} Wiki was not found by id.
         */
        let
            id = ctx.params.id,
            wiki = await getWiki(id, true);
        if (ctx.request.query.format === 'html') {
            wiki.content = md.systemMarkdownToHtml(wiki.content);
        }
        ctx.rest(wiki);
    },

    'GET /api/wikis': async (ctx, next) => {
        /**
         * Get all wikis (without content).
         * 
         * @name Get Wikis
         * @return {object} Wikis object.
         */
        ctx.rest({
            wikis: await _getWikis()
        });
    },

    'POST /api/wikis': async (ctx, next) => {
        /**
         * Create a new wiki.
         * 
         * @name Create Wiki
         * @param {string} name: Name of the wiki.
         * @param {string} description: Description of the wiki.
         * @param {string} content: Content of the wiki.
         * @param {string} [tag]: Tag of the wiki, seperated by ','.
         * @param {string} [image]: Base64 encoded string as cover image.
         * @return {object} The created wiki object.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        ctx.checkPermission(constants.role.EDITOR);
        ctx.validate('createWiki');
        let
            wiki,
            text,
            wiki_id = nextId(),
            content_id = nextId(),
            data = ctx.request.body,
            user = ctx.state.__user__,
            attachment = await attachmentApi.createAttachment(
                user.id,
                data.name.trim(),
                data.description.trim(),
                new Buffer(data.image, 'base64'),
                null,
                true
            );

        // create text:
        text = await Text.create({
            id: content_id,
            ref_id: wiki_id,
            value: data.content
        });

        // create wiki:
        wiki = await Wiki.create({
            id: wiki_id,
            content_id: content_id,
            cover_id: attachment.id,
            name: data.name.trim(),
            description: data.description.trim(),
            tag: (data.tag || '').trim()
        });
        // attach content:
        wiki = wiki.toJSON();
        wiki.content = data.content;
        ctx.rest(wiki);
    },

    'POST /api/wikis/:id': async (ctx, next) => {
        /**
         * Update a wiki.
         * 
         * @name Update Wiki
         * @param {string} id: The id of the wiki.
         * @param {string} [name]: The name of the wiki.
         * @param {string} [description]: The description of the wiki.
         * @param {string} [tag]: The tag of the wiki.
         * @param {string} [content]: The content of the wiki.
         * @param {string} [image]: Base64 encoded string as cover image.
         * @return {object} The updated wiki object.
         */
        ctx.checkPermission(constants.role.EDITOR);
        ctx.validate('updateWiki');
        let
            id = ctx.params.id,
            wiki = await getWiki(id),
            text,
            wiki_id,
            content_id,
            attachment,
            data = ctx.request.body;
        if (data.name) {
            wiki.name = data.name.trim();
        }
        if (data.description) {
            wiki.description = data.description.trim();
        }
        if (data.tag) {
            wiki.tag = data.tag.trim();
        }
        if (data.image) {
            // create image:
            attachment = await attachmentApi.createAttachment(
                ctx.state.__user__.id,
                wiki.name,
                wiki.description,
                new Buffer(data.image, 'base64'),
                null,
                true);
            wiki.cover_id = attachment.id;
        }
        if (data.content) {
            text = await Text.create({
                ref_id: wiki.id,
                value: data.content
            });
            wiki.content_id = text.id;
        }
        await wiki.save();
        wiki = wiki.toJSON();
        if (data.content) {
            wiki.content = data.content;
        } else {
            text = await Text.findById(wiki.content_id);
            wiki.content = text.value;
        }
        ctx.rest(wiki);
    },

    'POST /api/wikis/:id/wikipages': async (ctx, next) => {
        /**
         * Create a new wiki page.
         * 
         * @name Create WikiPage
         * @param {string} id: Id of the wiki.
         * @param {string} name: Name of the wiki page.
         * @param {string} parent_id: Parent id of the wiki page, specify '' for top level wiki page.
         * @param {string} content: Content of the wiki.
         * @return {object} The created wiki page object.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        ctx.checkPermission(constants.role.EDITOR);
        ctx.validate('createWikiPage');
        let
            wiki_id = ctx.params.id,
            wp_id = nextId(),
            content_id = nextId(),
            wiki = await getWiki(wiki_id),
            wikipage,
            text,
            num,
            data = ctx.request.body;
        // check parent id:
        if (data.parent_id) {
            await getWikiPage(data.parent_id);
        }
        // count:
        num = await WikiPage.max('display_order', {
            where: {
                'wiki_id': wiki_id,
                'parent_id': data.parent_id
            }
        });
        text = await Text.create({
            id: content_id,
            ref_id: wp_id,
            value: data.content
        });
        // create wiki page:
        wikipage = await WikiPage.create({
            id: wp_id,
            wiki_id: wiki_id,
            content_id: content_id,
            parent_id: data.parent_id,
            name: data.name.trim(),
            display_order: isNaN(num) ? 0 : num + 1
        });
        wikipage = wikipage.toJSON();
        wikipage.content = data.content;
        indexWiki(wikipage);
        ctx.rest(wikipage);
    },

    'POST /api/wikis/wikipages/:id': async (ctx, next) => {
        /**
         * Update a wiki page.
         * 
         * @name Update WikiPage
         * @param {string} id: The id of the wiki page.
         * @param {string} [name]: The name of the wiki page.
         * @param {string} [content]: The content of the wiki page.
         * @return {object} The updated wiki object.
         */
        ctx.checkPermission(constants.role.EDITOR);
        ctx.validate('updateWikiPage');
        let
            id = ctx.params.id,
            wikipage = await getWikiPage(id),
            text,
            data = ctx.request.body;
        if (data.name) {
            wikipage.name = data.name.trim();
        }
        if (data.content) {
            text = await Text.create({
                ref_id: wikipage.id,
                value: data.content
            });
            wikipage.content_id = text.id;
        }
        await wikipage.save();
        wikipage = wikipage.toJSON();
        if (data.content) {
            wikipage.content = data.content;
        } else {
            text = await Text.findById(wikipage.content_id);
            wikipage.content = text.value;
        }
        indexWiki(wikipage);
        ctx.rest(wikipage);
    },

    'GET /api/wikis/wikipages/:id': async (ctx, next) => {
        /**
         * Get wiki page by id.
         * 
         * @name Get Wiki Page
         * @param {string} id: Id of the wiki page.
         * @param {string} [format='']: Return html if format is 'html', default to raw.
         * @return {object} WikiPage object.
         * @error {resource:notfound} WikiPage was not found by id.
         */
        let
            id = ctx.params.id,
            wp = await getWikiPage(id, true);
        if (ctx.request.query.format === 'html') {
            wp.content = md.systemMarkdownToHtml(wp.content);
        }
        ctx.rest(wp);
    },

    'GET /api/wikis/:id/wikipages': async (ctx, next) => {
        /**
         * Get wiki pages as a tree list.
         * 
         * @name Get WikiPages
         * @param {string} id - The id of the wiki.
         * @return {object} The full tree object.
         */
        let id = ctx.params.id;
        ctx.rest(await getWikiTree(id));
    },

    'POST /api/wikis/wikipages/:id/move': async (ctx, next) => {
        /**
         * Move a wikipage to another node.
         * 
         * @name Move WikiPage
         * @param {string} id: The source id of the WikiPage.
         * @param {string} parent_id: The target id of the WikiPage. Specify '' if move to top of the tree.
         * @param {int} index: The index of the moved page.
         * @return {object} The moved wiki object.
         */
        ctx.checkPermission(constants.role.EDITOR);
        ctx.validate('moveWikiPage');
        let
            id = ctx.params.id,
            data = ctx.request.body,
            index = data.index,
            parent_id = data.parent_id,
            movingPage = await getWikiPage(id),
            wiki = await getWiki(movingPage.wiki_id),
            parentPage = parent_id === '' ? null : await getWikiPage(parent_id),
            p, i, L,
            allPages;
        if (parentPage !== null && parentPage.wiki_id !== wiki.id) {
            throw api.invalidParam('parent_id');
        }

        // check to prevent recursive:
        allPages = await getWikiPages(wiki.id, true);
        if (parentPage !== null) {
            p = parentPage;
            while (p.parent_id !== '') {
                if (p.parent_id === movingPage.id) {
                    throw api.conflictError('WikiPage', 'Will cause recursive.');
                }
                p = allPages[p.parent_id];
            }
        }
        // set to new parent:
        movingPage.parent_id = parent_id;
        await movingPage.save();

        // get current children:
        L = [];
        _.each(allPages, function (p, pid) {
            if (p.parent_id === parent_id && p.id !== movingPage.id) {
                L.push(p);
            }
        });
        if (index > L.length) {
            throw api.invalidParam('index');
        }
        L.sort(function (p1, p2) {
            return p1.display_order < p2.display_order ? (-1) : 1;
        });
        L.splice(index, 0, movingPage);
        // update display order and movingPage:
        for (i=0; i<L.length; i++) {
            await WikiPage.update({
                'display_order': i
             }, {
                 where: {
                    'id': L[i].id
                }
            });
        }
        movingPage.display_order = index; // <-- already updated, but need to pass to result
        ctx.rest(movingPage);
    },

    'POST /api/wikis/wikipages/:id/delete': async (ctx, next) => {
        /**
         * Delete a wikipage if it has no child wikipage.
         *
         * @name Delete WikiPage
         * @param {string} id - The id of the wikipage.
         * @return {object} Returns object contains id of deleted wiki. { "id": "1234" }
         */
        ctx.checkPermission(constants.role.EDITOR);
        let
            id = ctx.params.id,
            wikipage = await getWikiPage(id),
            num = await WikiPage.count({
                where: {
                    'parent_id': id
                }
            });
        if (num > 0) {
            throw api.conflictError('WikiPage', 'Cannot delete a non-empty wiki pages.');
        }
        await wikipage.destroy();
        // delete all texts:
        await Text.destroy({
            where: {
                'ref_id': id
            }
        });
        unindexWiki(wikipage);
        ctx.rest({
            id: id
        });
    },

    'POST /api/wikis/:id/delete': async (ctx, next) => {
        /**
         * Delete a wiki by its id.
         * 
         * @name Delete Wiki
         * @param {string} id: The id of the wikipage.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         * @error {resource:notfound} If resource not found by id.
         */
        ctx.checkPermission(constants.role.EDITOR);
        let
            id = ctx.params.id,
            wiki = await getWiki(id),
            num = await WikiPage.count({
                where: {
                    'wiki_id': id
                }
            });
        if (num > 0) {
            throw api.conflictError('Wiki', 'Wiki is not empty.');
        }
        await wiki.destroy();
        // delete all texts:
        await Text.destroy({
            where: {
                'ref_id': id
            }
        });
        unindexWiki(wiki);
        ctx.rest({ id: id });
    }
};
