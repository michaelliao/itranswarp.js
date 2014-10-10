// wiki api

var
    _ = require('lodash'),
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    utils = require('./_utils'),
    images = require('./_images'),
    search = require('../search/search'),
    constants = require('../constants');

var
    commentApi = require('./commentApi'),
    attachmentApi = require('./attachmentApi'),
    checkAttachment = attachmentApi.checkAttachment,
    createAttachmentTaskInTx = attachmentApi.createAttachmentTaskInTx;

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
            tags: r.tags || '',
            name: r.name,
            description: r.description || '',
            content: utils.html2text(utils.md2html(r.content)),
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

function getWikis(callback) {
    Wiki.findAll({
        order: 'name asc'
    }, callback);
}

function getWiki(id, tx, callback) {
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    Wiki.find(id, function (err, entity) {
        if (err) {
            return callback(err);
        }
        if (entity === null) {
            return callback(api.notFound('Wiki'));
        }
        callback(null, entity);
    });
}

function getWikiWithContent(id, tx, callback) {
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    getWiki(id, tx, function (err, entity) {
        if (err) {
            return callback(err);
        }
        Text.find(entity.content_id, function (err, text) {
            if (err) {
                return callback(err);
            }
            if (text === null) {
                return callback(api.notFound('Text'));
            }
            entity.content = text.value;
            callback(null, entity);
        });
    });
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

function getWikiPages(wiki_id, returnAsDict, callback) {
    if (arguments.length === 2) {
        callback = returnAsDict;
        returnAsDict = false;
    }
    WikiPage.findAll({
        where: 'wiki_id=?',
        params: [wiki_id]
    }, function (err, pages) {
        if (err) {
            return callback(err);
        }
        var proot, pdict = {};
        pages.forEach(function (p) {
            pdict[p.id] = p;
        });
        if (returnAsDict) {
            return callback(null, pdict);
        }
        proot = { id: '' };
        treeIterate(pdict, proot);
        return callback(null, proot.children);
    });
}

function getWikiTree(id, isFlatten, callback) {
    if (arguments.length === 2) {
        callback = isFlatten;
        isFlatten = false;
    }
    getWiki(id, function (err, wiki) {
        if (err) {
            return callback(err);
        }
        getWikiPages(id, function (err, children) {
            if (err) {
                return callback(err);
            }
            if (isFlatten) {
                var arr = [];
                flatten(arr, 0, children);
                wiki.children = arr;
            } else {
                wiki.children = children;
            }
            return callback(null, wiki);
        });
    });
}

// get wiki page by id:
function getWikiPage(id, tx, callback) {
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    WikiPage.find(id, function (err, entity) {
        if (err) {
            return callback(err);
        }
        if (entity === null) {
            return callback(api.notFound('WikiPage'));
        }
        callback(null, entity);
    });
}

// get wiki page by id, with content attached:
function getWikiPageWithContent(id, tx, callback) {
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    getWikiPage(id, tx, function (err, entity) {
        if (err) {
            return callback(err);
        }
        Text.find(entity.content_id, function (err, text) {
            if (err) {
                return callback(err);
            }
            if (text === null) {
                return callback(api.notFound('WikiPage'));
            }
            entity.content = text.value;
            callback(null, entity);
        });
    });
}

function createWikiPage(wp, callback) {
    var content, doCreateWikiPage;

    content = wp.content;
    doCreateWikiPage = function () {
        warp.transaction(function (err, tx) {
            if (err) {
                return callback(err);
            }
            var
                wp_id = next_id(),
                content_id = next_id();
            async.waterfall([
                // create text:
                function (callback) {
                    Text.create({
                        id: content_id,
                        ref_id: wp_id,
                        value: content
                    }, tx, callback);
                },
                // count:
                function (text, callback) {
                    warp.queryNumber('select count(id) from wikipages where wiki_id=? and parent_id=?', [wp.wiki_id, wp.parent_id], tx, callback);
                },
                // create wiki:
                function (num, callback) {
                    wp.id = wp_id;
                    wp.content_id = content_id;
                    wp.display_order = num;
                    WikiPage.create(wp, tx, callback);
                }
            ], function (err, result) {
                tx.done(err, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    result.content = content;
                    callback(null, result);
                });
            });
        });
    };
    if (wp.parent_id) {
        getWikiPage(wp.parent_id, function (err, entity) {
            if (err) {
                return callback(err);
            }
            if (wp.wiki_id !== entity.wiki_id) {
                return callback(api.invalidParam('parent_id'));
            }
            return doCreateWikiPage();
        });
        return;
    }
    return doCreateWikiPage();
}

function getNavigationMenus(callback) {
    getWikis(function (err, ws) {
        if (err) {
            return callback(err);
        }
        callback(null, _.map(ws, function (w) {
            return {
                name: w.name,
                url: '/wiki/' + w.id
            };
        }));
    });
}

module.exports = {

    getNavigationMenus: getNavigationMenus,

    getWikiTree: getWikiTree,

    getWiki: getWiki,

    getWikis: getWikis,

    getWikiWithContent: getWikiWithContent,

    getWikiPage: getWikiPage,

    getWikiPageWithContent: getWikiPageWithContent,

    'GET /api/wikis/:id': function (req, res, next) {
        /**
         * Get wiki by id.
         * 
         * @name Get Wiki
         * @param {string} id: Id of the wiki.
         * @param {string} [format='']: Return html if format is 'html', default to raw.
         * @return {object} Wiki object.
         * @error {resource:notfound} Wiki was not found by id.
         */
        getWikiWithContent(req.params.id, function (err, wiki) {
            if (err) {
                return next(err);
            }

            if (req.query.format === 'html') {
                wiki.content = utils.md2html(wiki.content);
            }
            return res.send(wiki);
        });
    },

    'GET /api/wikis': function (req, res, next) {
        /**
         * Get all wikis.
         * 
         * @name Get Wikis
         * @return {object} Wikis object.
         */
        getWikis(function (err, entities) {
            if (err) {
                return next(err);
            }
            return res.send({ wikis: entities});
        });
    },

    'POST /api/wikis': function (req, res, next) {
        /**
         * Create a new wiki.
         * 
         * @name Create Wiki
         * @param {string} name: Name of the wiki.
         * @param {string} description: Description of the wiki.
         * @param {string} content: Content of the wiki.
         * @param {string} [tags]: Tags of the wiki, seperated by ','.
         * @param {file} [file]: File to upload as cover image.
         * @return {object} The created wiki object.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        if (utils.isForbidden(req, constants.ROLE_EDITOR)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var name, description, content, tags, file, content_id, wiki_id, fnCreate;
        try {
            name = utils.getRequiredParam('name', req);
            description = utils.getRequiredParam('description', req);
            content = utils.getRequiredParam('content', req);
        } catch (e) {
            return next(e);
        }
        tags = utils.formatTags(utils.getParam('tags', '', req));
        file = req.files && req.files.file;

        content_id = next_id();
        wiki_id = next_id();

        fnCreate = function (fileObject) {
            warp.transaction(function (err, tx) {
                if (err) {
                    return next(err);
                }
                async.waterfall([
                    // create text:
                    function (callback) {
                        Text.create({
                            id: content_id,
                            ref_id: wiki_id,
                            value: content
                        }, tx, callback);
                    },
                    // create attachment:
                    function (text, callback) {
                        if (fileObject) {
                            var fn = createAttachmentTaskInTx(fileObject, tx, req.user.id);
                            return fn(callback);
                        }
                        callback(null, null);
                    },
                    // create wiki:
                    function (atta, callback) {
                        Wiki.create({
                            id: wiki_id,
                            cover_id: atta === null ? '' : atta.id,
                            content_id: content_id,
                            name: name,
                            tags: tags,
                            description: description
                        }, tx, callback);
                    }
                ], function (err, result) {
                    tx.done(err, function (err) {
                        if (err) {
                            return next(err);
                        }
                        result.content = content;
                        indexWiki(result);
                        return res.send(result);
                    });
                });
            });
        };

        if (file) {
            return checkAttachment(file, true, function (err, attachFileObject) {
                if (err) {
                    return next(err);
                }
                // override name:
                attachFileObject.name = name;
                fnCreate(attachFileObject);
            });
        }
        return fnCreate(null);
    },

    'POST /api/wikis/:id/comments': function (req, res, next) {
        /**
         * Create a comment on a wiki.
         * 
         * @name Comment Wiki
         * @param {string} id: Id of the wiki.
         * @param {string} [content]: Content of the comment.
         * @return {object} The comment object.
         * @error {resource:notfound} Wiki was not found by id.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        if (utils.isForbidden(req, constants.ROLE_SUBSCRIBER)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var content;
        try {
            content = utils.getRequiredParam('content', req);
        } catch (e) {
            return next(e);
        }
        Wiki.find(req.params.id, function (err, wiki) {
            if (err) {
                return next(err);
            }
            commentApi.createComment('wiki', wiki.id, req.user, content, function (err, c) {
                if (err) {
                    return next(err);
                }
                return res.send(c);
            });
        });
    },

    'POST /api/wikis/:id/wikipages': function (req, res, next) {
        /**
         * Create a new wiki page.
         * 
         * @name Create WikiPage
         * @param {string} id: Id of the wiki.
         * @param {string} name: Name of the wiki page.
         * @param {string} parent_id: Parent id of the wiki page, specify 'ROOT' for top level wiki page.
         * @param {string} content: Content of the wiki.
         * @return {object} The created wiki page object.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        var name, content, parent_id;
        try {
            name = utils.getRequiredParam('name', req);
            content = utils.getRequiredParam('content', req);
            parent_id = utils.getRequiredParam('parent_id', req);
        } catch (e) {
            return next(e);
        }
        getWiki(req.params.id, function (err, wiki) {
            if (err) {
                return next(err);
            }
            createWikiPage({
                wiki_id: wiki.id,
                parent_id: parent_id === 'ROOT' ? '' : parent_id,
                name: name,
                content: content
            }, function (err, wikipage) {
                if (err) {
                    return next(err);
                }
                indexWiki(wikipage);
                return res.send(wikipage);
            });
        });
    },

    'GET /api/wikis/wikipages/:id': function (req, res, next) {
        /**
         * Get wiki page by id.
         * 
         * @name Get Wiki Page
         * @param {string} id: Id of the wiki page.
         * @param {string} [format='']: Return html if format is 'html', default to raw.
         * @return {object} WikiPage object.
         * @error {resource:notfound} WikiPage was not found by id.
         */
        getWikiPageWithContent(req.params.id, function (err, wp) {
            if (err) {
                return next(err);
            }
            if (req.query.format === 'html') {
                wp.content = utils.md2html(wp.content);
            }
            return res.send(wp);
        });
    },

    'GET /api/wikis/:id/wikipages': function (req, res, next) {
        /**
         * Get wiki pages as a tree list.
         * 
         * @name Get WikiPages
         * @param {string} id - The id of the wiki.
         * @return {object} The full tree object.
         */
        getWikiTree(req.params.id, function (err, wiki) {
            if (err) {
                return next(err);
            }
            return res.send(wiki);
        });
    },

    'POST /api/wikis/:id': function (req, res, next) {
        /**
         * Update a wiki.
         * 
         * @name Update Wiki
         * @param {string} id: The id of the wiki.
         * @param {string} [name]: The name of the wiki.
         * @param {string} [description]: The description of the wiki.
         * @param {string} [tags]: The tags of the wiki.
         * @param {string} [content]: The content of the wiki.
         * @param {file} [file]: The cover image of the wiki.
         * @return {object} The updated wiki object.
         */
        if (utils.isForbidden(req, constants.ROLE_EDITOR)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var
            name = utils.getParam('name', req),
            description = utils.getParam('description', req),
            tags = utils.getParam('tags', req),
            content = utils.getParam('content', req),
            file,
            fnUpdate;

        if (name !== null && name === '') {
            return next(api.invalidParam('name'));
        }
        if (description !== null && description === '') {
            return next(api.invalidParam('description'));
        }
        if (content !== null && content === '') {
            return next(api.invalidParam('content'));
        }
        if (tags !== null) {
            tags = utils.formatTags(tags);
        }

        file = req.files && req.files.file;

        fnUpdate = function (fileObject) {
            warp.transaction(function (err, tx) {
                if (err) {
                    return next(err);
                }
                async.waterfall([
                    // query wiki:
                    function (callback) {
                        Wiki.find(req.params.id, tx, callback);
                    },
                    // update text?
                    function (wiki, callback) {
                        if (wiki === null) {
                            return callback(api.notFound('Wiki'));
                        }
                        if (content === null) {
                            return callback(null, wiki);
                        }
                        var content_id = next_id();
                        Text.create({
                            id: content_id,
                            ref_id: wiki.id,
                            value: content
                        }, tx, function (err, text) {
                            if (err) {
                                return callback(err);
                            }
                            wiki.content_id = content_id;
                            callback(null, wiki);
                        });
                    },
                    // update cover?
                    function (wiki, callback) {
                        if (fileObject) {
                            var fn = createAttachmentTaskInTx(fileObject, tx, req.user.id);
                            return fn(function (err, atta) {
                                if (err) {
                                    return callback(err);
                                }
                                wiki.cover_id = atta.id;
                                callback(null, wiki);
                            });
                        }
                        callback(null, wiki);
                    },
                    // update wiki:
                    function (wiki, callback) {
                        if (name !== null) {
                            wiki.name = name;
                        }
                        if (description !== null) {
                            wiki.description = description;
                        }
                        if (tags !== null) {
                            wiki.tags = tags;
                        }
                        wiki.update(tx, callback);
                    }
                ], function (err, result) {
                    tx.done(err, function (err) {
                        if (err) {
                            return next(err);
                        }
                        if (content !== null) {
                            result.content = content;
                            indexWiki(result);
                            return res.send(result);
                        }
                        Text.find(result.content_id, function (err, text) {
                            if (err) {
                                return next(err);
                            }
                            result.content = text.value;
                            indexWiki(result);
                            return res.send(result);
                        });
                    });
                });
            });
        };

        if (file) {
            return checkAttachment(file, true, function (err, attachFileObject) {
                if (err) {
                    return next(err);
                }
                // override name:
                attachFileObject.name = name;
                fnUpdate(attachFileObject);
            });
        }
        return fnUpdate(null);
    },

    'POST /api/wikis/wikipages/:id/move/:target_id': function (req, res, next) {
        /**
         * Move a wikipage to another node.
         * 
         * @name Move WikiPage
         * @param {string} id: The source id of the WikiPage.
         * @param {string} target_id: The target id of the WikiPage. Specify 'ROOT' if move to top of the tree.
         * @param {int} index: The index of the moved page.
         * @return {object} The moved wiki object.
         */
        if (utils.isForbidden(req, constants.ROLE_EDITOR)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var
            wpid = req.params.id,
            target_id = req.params.target_id,
            index,
            wiki,
            movingPage,
            parentPage,
            allPages;
        try {
            index = parseInt(utils.getRequiredParam('index', req), 10);
        } catch (e) {
            return next(e);
        }
        if (isNaN(index) || index < 0) {
            return next(api.invalidParam('index'));
        }
        // get the 2 pages:
        async.waterfall([
            function (callback) {
                getWikiPage(wpid, callback);
            },
            function (wp, callback) {
                movingPage = wp;
                getWiki(movingPage.wiki_id, callback);
            },
            function (w, callback) {
                wiki = w;
                if (target_id === 'ROOT') {
                    return callback(null, null);
                }
                getWikiPage(target_id, callback);
            },
            function (wp, callback) {
                parentPage = wp;
                if (parentPage !== null && parentPage.wiki_id !== wiki.id) {
                    return callback(api.invalidParam('target_id'));
                }
                callback(null, null);
            },
            function (prev, callback) {
                getWikiPages(wiki.id, true, callback);
            },
            function (all, callback) {
                allPages = all;
                // check to prevent recursive:
                if (parentPage !== null) {
                    var p = parentPage;
                    while (p.parent_id !== '') {
                        if (p.parent_id === movingPage.id) {
                            return callback(api.resourceConflictError('Will cause recursive.'));
                        }
                        p = allPages[p.parent_id];
                    }
                }
                // check ok:
                callback(null, null);
            }
        ], function (err, r) {
            if (err) {
                return next(err);
            }
            // get current children:
            var
                parentId = parentPage === null ? '' : parentPage.id,
                L = [];
            _.each(allPages, function (p, pid) {
                if (p.parent_id === parentId && p.id !== movingPage.id) {
                    L.push(p);
                }
            });
            if (index > L.length) {
                return next(api.invalidParam('index'));
            }
            L.sort(function (p1, p2) {
                return p1.display_order < p2.display_order ? (-1) : 1;
            });
            L.splice(index, 0, movingPage);
            // update display order and movingPage:
            warp.transaction(function (err, tx) {
                if (err) {
                    return next(err);
                }
                var tasks = _.map(L, function (p, index) {
                    return function (callback) {
                        warp.update('update wikipages set display_order=? where id=?', [index, p.id], tx, callback);
                    };
                });
                tasks.push(function (callback) {
                    movingPage.display_order = index; // <-- already updated, but need to pass to result
                    movingPage.parent_id = parentId;
                    movingPage.update(['parent_id', 'updated_at', 'version'], tx, callback);
                });
                async.series(tasks, function (err, results) {
                    tx.done(err, function (err) {
                        if (err) {
                            return next(err);
                        }
                        return res.send(results.pop());
                    });
                });
            });
        });
    },

    'POST /api/wikis/wikipages/:id': function (req, res, next) {
        /**
         * Update a wiki page.
         * 
         * @name Update WikiPage
         * @param {string} id: The id of the wiki page.
         * @param {string} [name]: The name of the wiki page.
         * @param {string} [content]: The content of the wiki page.
         * @return {object} The updated wiki object.
         */
        var
            id = req.params.id,
            name = utils.getParam('name', req),
            content = utils.getParam('content', req),
            content_id;
        if (name !== null && name === '') {
            return next(api.invalidParam('name'));
        }
        if (content !== null && content === '') {
            return next(api.invalidParam('content'));
        }
        content_id = next_id();
        warp.transaction(function (err, tx) {
            if (err) {
                return next(err);
            }
            async.waterfall([
                // query wiki page:
                function (callback) {
                    getWikiPage(id, tx, callback);
                },
                function (wp, callback) {
                    if (content !== null) {
                        Text.create({
                            id: content_id,
                            ref_id: id,
                            value: content
                        }, tx, function (err, text) {
                            if (err) {
                                return callback(err);
                            }
                            wp.content_id = content_id;
                            callback(null, wp);
                        });
                        return;
                    }
                    callback(null, wp);
                },
                function (wp, callback) {
                    if (name !== null) {
                        wp.name = name;
                    }
                    wp.update(tx, callback);
                }
            ], function (err, wp) {
                tx.done(err, function (err) {
                    if (err) {
                        return next(err);
                    }
                    if (content !== null) {
                        wp.content = content;
                        indexWiki(wp);
                        return res.send(wp);
                    }
                    Text.find(wp.content_id, function (err, text) {
                        if (err) {
                            return next(err);
                        }
                        wp.content = text.value;
                        indexWiki(wp);
                        return res.send(wp);
                    });
                });
            });
        });
    },

    'POST /api/wikis/wikipages/:id/comments': function (req, res, next) {
        /**
         * Create a comment on a wiki page.
         * 
         * @name Comment WikiPage
         * @param {string} id: Id of the wiki page.
         * @param {string} [content]: Content of the comment.
         * @return {object} The comment object.
         * @error {resource:notfound} WikiPage was not found by id.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        if (utils.isForbidden(req, constants.ROLE_SUBSCRIBER)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var content;
        try {
            content = utils.getRequiredParam('content', req);
        } catch (e) {
            return next(e);
        }
        WikiPage.find(req.params.id, function (err, wikipage) {
            if (err) {
                return next(err);
            }
            commentApi.createComment('wikipage', wikipage.id, req.user, content, function (err, c) {
                if (err) {
                    return next(err);
                }
                return res.send(c);
            });
        });
    },

    'POST /api/wikis/wikipages/:id/delete': function (req, res, next) {
        /**
         * Delete a wikipage if it has no child wikipage.
         *
         * @name Delete WikiPage
         * @param {string} id - The id of the wikipage.
         * @return {object} Returns object contains id of deleted wiki. { "id": "1234" }
         */
        var id = req.params.id;
        getWikiPage(id, function (err, wp) {
            if (err) {
                return next(err);
            }
            WikiPage.findNumber({
                select: 'count(id)',
                where: 'parent_id=?',
                params: [id]
            }, function (err, num) {
                if (err) {
                    return next(err);
                }
                if (num > 0) {
                    return next(api.resourceConflictError('WikiPage', 'Cannot delete a non-empty wiki pages.'));
                }
                wp.destroy(function (err) {
                    if (err) {
                        return next(err);
                    }
                    var r = { id: req.params.id };
                    unindexWiki(r);
                    return res.send(r);
                });
            });
        });
    },

    'POST /api/wikis/:id/delete': function (req, res, next) {
        /**
         * Delete a wiki by its id.
         * 
         * @name Delete Wiki
         * @param {string} id: The id of the wikipage.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         * @error {resource:notfound} If resource not found by id.
         */
        if (utils.isForbidden(req, constants.ROLE_EDITOR)) {
            return next(api.notAllowed('Permission denied.'));
        }
        warp.transaction(function (err, tx) {
            if (err) {
                return next(err);
            }
            async.waterfall([
                function (callback) {
                    Wiki.find(req.params.id, tx, callback);
                },
                function (wiki, callback) {
                    if (wiki === null) {
                        return callback(api.notFound('Wiki'));
                    }
                    // check wiki pages:
                    WikiPage.findNumber({
                        select: 'count(id)',
                        where: 'wiki_id=?',
                        params: [wiki.id]
                    }, tx, function (err, num) {
                        if (err) {
                            return callback(err);
                        }
                        if (num > 0) {
                            return callback(api.resourceConflictError('Wiki', 'Wiki is not empty.'));
                        }
                        callback(null, wiki);
                    });
                },
                function (wiki, callback) {
                    wiki.destroy(tx, callback);
                },
                function (r, callback) {
                    // delete all texts:
                    warp.update('delete from texts where ref_id=?', [req.params.id], tx, callback);
                }
            ], function (err, result) {
                tx.done(err, function (err) {
                    if (err) {
                        return next(err);
                    }
                    var r = { id: req.params.id };
                    unindexWiki(r);
                    res.send(r);
                });
            });
        });
    }
};
