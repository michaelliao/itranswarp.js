'use strict';

// wiki api

var
    _ = require('lodash'),
    api = require('../api'),
    db = require('../db'),
    helper = require('../helper'),
    images = require('./_images'),
    search = require('../search/search'),
    constants = require('../constants');

var
    attachmentApi = require('./attachmentApi');

var
    User = db.user,
    Wiki = db.wiki,
    WikiPage = db.wikipage,
    Text = db.text,
    warp = db.warp,
    next_id = db.next_id;

function indexWiki(r) {
    process.nextTick(function () {
        search.engine.index({
            type: 'wiki',
            id: r.id,
            name: r.name,
            description: r.description || '',
            content: helper.html2text(helper.md2html(r.content, true)),
            created_at: r.created_at,
            updated_at: r.updated_at,
            url: '/wiki/' + (r.wiki_id ? r.wiki_id + '/' : '') + r.id,
            upvotes: 0
        });
    });
}

function unindexWiki(r) {
    process.nextTick(function () {
        search.engine.unindex({
            id: r.id
        });
    });
}

function* $getWikis() {
    return yield Wiki.$findAll({
        order: 'name asc'
    });
}

function* $getWiki(id, includeContent) {
    var
        text,
        wiki = yield Wiki.$find(id);
    if (wiki === null) {
        throw api.notFound('Wiki');
    }
    if (includeContent) {
        text = yield Text.$find(wiki.content_id);
        if (text === null) {
            throw api.notFound('Text');
        }
        wiki.content = text.value;
    }
    return wiki;
}

function* $getWikiPage(id, includeContent) {
    var
        text,
        wp = yield WikiPage.$find(id);
    if (wp === null) {
        throw api.notFound('Wiki');
    }
    if (includeContent) {
        text = yield Text.$find(wp.content_id);
        if (text === null) {
            throw api.notFound('Text');
        }
        wp.content = text.value;
    }
    return wp;
}

function treeIterate(nodes, root) {
    var rid, removes;

    rid = root.id;
    root.children = [];
    removes = [];
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

function* $getWikiPages(wiki_id, returnAsDict) {
    var
        proot,
        pdict = {},
        pages = yield WikiPage.$findAll({
            where: 'wiki_id=?',
            params: [wiki_id]
        });
    _.each(pages, function (p) {
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

function* $getWikiTree(id, isFlatten) {
    var
        arr,
        wiki = await getWiki(id),
        children = await getWikiPages(id);
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

function* $getNavigationMenus() {
    var ws = await getWikis();
    return _.map(ws, function (w) {
        return {
            name: w.name,
            url: '/wiki/' + w.id
        };
    });
}

module.exports = {

    $getNavigationMenus: $getNavigationMenus,

    $getWikiTree: $getWikiTree,

    $getWiki: $getWiki,

    $getWikis: $getWikis,

    $getWikiPage: $getWikiPage,

    'GET /api/wikis/:id': async (ctx, next) =>
        /**
         * Get wiki by id.
         * 
         * @name Get Wiki
         * @param {string} id: Id of the wiki.
         * @param {string} [format='']: Return html if format is 'html', default to raw.
         * @return {object} Wiki object.
         * @error {entity:notfound} Wiki was not found by id.
         */
        var wiki = await getWiki(id, true);
        if (this.request.query.format === 'html') {
            wiki.content = helper.md2html(wiki.content, true);
        }
        this.body = wiki;
    },

    'GET /api/wikis': async (ctx, next) => {
        /**
         * Get all wikis.
         * 
         * @name Get Wikis
         * @return {object} Wikis object.
         */
        this.body = {
            wikis: await getWikis()
        };
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
        var
            wiki,
            text,
            wiki_id,
            content_id,
            attachment,
            data = this.request.body;
        ctx.validate('createWiki', data);

        wiki_id = next_id();
        content_id = next_id();

        // create image:
        attachment = yield attachmentApi.$createAttachment(
            this.request.user.id,
            data.name.trim(),
            data.description.trim(),
            new Buffer(data.image, 'base64'),
            null,
            true);

        // create text:
        text = yield Text.$create({
            id: content_id,
            ref_id: wiki_id,
            value: data.content
        });

        // create wiki:
        wiki = yield Wiki.$create({
            id: wiki_id,
            content_id: content_id,
            cover_id: attachment.id,
            name: data.name.trim(),
            description: data.description.trim(),
            tag: data.tag.trim()
        });
        wiki.content = data.content;
        this.body = wiki;
    },

    'POST /api/wikis/:id': async (ctx, next) =>
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
        var
            wiki,
            text,
            wiki_id,
            content_id,
            attachment,
            props = [],
            data = this.request.body;
        ctx.validate('updateWiki', data);

        wiki = await getWiki(id);
        if (data.name) {
            wiki.name = data.name.trim();
            props.push('name');
        }
        if (data.description) {
            wiki.description = data.description.trim();
            props.push('description');
        }
        if (data.tag) {
            wiki.tag = data.tag.trim();
            props.push('tag');
        }
        if (data.image) {
            // create image:
            attachment = yield attachmentApi.$createAttachment(
                this.request.user.id,
                wiki.name,
                wiki.description,
                new Buffer(data.image, 'base64'),
                null,
                true);
            wiki.cover_id = attachment.id;
            props.push('cover_id');
        }
        if (data.content) {
            text = yield Text.$create({
                ref_id: wiki.id,
                value: data.content
            });
            wiki.content_id = text.id;
            wiki.content = data.content;
            props.push('content_id');
        }
        if (props.length > 0) {
            props.push('updated_at');
            props.push('version');
            yield wiki.$update(props);
        }
        if (!wiki.content) {
            text = yield Text.$find(wiki.content_id);
            wiki.content = text.value;
        }
        this.body = wiki;
    },

    'POST /api/wikis/:id/wikipages': async (ctx, next) =>
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
        var
            wiki,
            wikipage,
            text,
            num, wp_id, content_id,
            data = this.request.body;
        ctx.validate('createWikiPage', data);

        // check wiki id:
        await getWiki(wiki_id);
        // check parent id:
        if (data.parent_id) {
            await getWikiPage(data.parent_id);
        }

        wp_id = next_id(),
        content_id = next_id();

        // count:
        num = yield warp.$queryNumber(
            'select max(display_order) from wikipages where wiki_id=? and parent_id=?',
            [wiki_id, data.parent_id]
        );
        text = yield Text.$create({
            id: content_id,
            ref_id: wp_id,
            value: data.content
        });
        // create wiki page:
        wikipage = yield WikiPage.$create({
            id: wp_id,
            wiki_id: wiki_id,
            content_id: content_id,
            parent_id: data.parent_id,
            name: data.name.trim(),
            display_order: ((num === null) ? 0 : num + 1)
        });

        wikipage.content = data.content;
        indexWiki(wikipage);
        this.body = wikipage;
    },

    'POST /api/wikis/wikipages/:id': async (ctx, next) =>
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
        var
            wikipage,
            text,
            props = [],
            data = this.request.body;
        ctx.validate('updateWikiPage', data);

        wikipage = await getWikiPage(id);
        if (data.name) {
            wikipage.name = data.name.trim();
            props.push('name');
        }
        if (data.content) {
            text = yield Text.$create({
                ref_id: wikipage.id,
                value: data.content
            });
            wikipage.content_id = text.id;
            wikipage.content = data.content;
            props.push('content_id');
        }
        if (props.length > 0) {
            props.push('updated_at');
            props.push('version');
            yield wikipage.$update(props);
        }
        if (!wikipage.content) {
            text = yield Text.$find(wikipage.content_id);
            wikipage.content = text.value;
        }

        indexWiki(wikipage);
        this.body = wikipage;
    },

    'GET /api/wikis/wikipages/:id': async (ctx, next) =>
        /**
         * Get wiki page by id.
         * 
         * @name Get Wiki Page
         * @param {string} id: Id of the wiki page.
         * @param {string} [format='']: Return html if format is 'html', default to raw.
         * @return {object} WikiPage object.
         * @error {resource:notfound} WikiPage was not found by id.
         */
        var wp = await getWikiPage(id, true);
        if (this.request.query.format === 'html') {
            wp.content = helper.md2html(wp.content, true);
        }
        this.body = wp;
    },

    'GET /api/wikis/:id/wikipages': async (ctx, next) =>
        /**
         * Get wiki pages as a tree list.
         * 
         * @name Get WikiPages
         * @param {string} id - The id of the wiki.
         * @return {object} The full tree object.
         */
        this.body = await getWikiTree(id);
    },

    'POST /api/wikis/wikipages/:id/move': async (ctx, next) =>
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

        var
            index, p, parent_id, i, L,
            wiki,
            movingPage,
            parentPage,
            allPages,
            data = this.request.body;
        ctx.validate('moveWikiPage', data);

        index = data.index;
        parent_id = data.parent_id;

        movingPage = await getWikiPage(id);

        if (movingPage.parent_id === parent_id && movingPage.display_order === index) {
            console.log('>> No need to update.');
            this.body = movingPage;
            return;
        }

        wiki = await getWiki(movingPage.wiki_id);

        parentPage = parent_id === '' ? null : await getWikiPage(parent_id);
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
            yield warp.$update('update wikipages set display_order=? where id=?', [i, L[i].id]);
        }
        movingPage.display_order = index; // <-- already updated, but need to pass to result
        movingPage.parent_id = parent_id;
        yield movingPage.$update(['parent_id', 'updated_at', 'version']);
        this.body = movingPage;
    },

    'POST /api/wikis/wikipages/:id/delete': async (ctx, next) =>
        /**
         * Delete a wikipage if it has no child wikipage.
         *
         * @name Delete WikiPage
         * @param {string} id - The id of the wikipage.
         * @return {object} Returns object contains id of deleted wiki. { "id": "1234" }
         */
        ctx.checkPermission(constants.role.EDITOR);
        var
            wikipage = await getWikiPage(id),
            num = yield WikiPage.$findNumber({
                select: 'count(id)',
                where: 'parent_id=?',
                params: [id]
            });
        if (num > 0) {
            throw api.conflictError('WikiPage', 'Cannot delete a non-empty wiki pages.');
        }
        yield wikipage.$destroy();
        // delete all texts:
        yield warp.$update('delete from texts where ref_id=?', [id]);

        unindexWiki(wikipage);

        this.body = {
            id: id
        };
    },

    'POST /api/wikis/:id/delete': async (ctx, next) =>
        /**
         * Delete a wiki by its id.
         * 
         * @name Delete Wiki
         * @param {string} id: The id of the wikipage.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         * @error {resource:notfound} If resource not found by id.
         */
        ctx.checkPermission(constants.role.EDITOR);
        var
            wiki = await getWiki(id),
            num = yield WikiPage.$findNumber({
                select: 'count(id)',
                where: 'wiki_id=?',
                params: [id]
            });
        if (num > 0) {
            throw api.conflictError('Wiki', 'Wiki is not empty.');
        }

        yield wiki.$destroy();

        // delete all texts:
        yield warp.$update('delete from texts where ref_id=?', [id]);

        unindexWiki(wiki);

        this.body = {
            id: id
        };
    }
};
