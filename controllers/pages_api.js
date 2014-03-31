// pages.js

var
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    utils = require('./_utils'),
    constants = require('../constants');

var
    User = db.user,
    Page = db.page,
    Text = db.text,
    warp = db.warp,
    next_id = db.next_id;

function checkAliasAvailable(alias, tx, callback) {
    Page.find({
        where: 'alias=?',
        params: [alias]
    }, tx, function(err, entity) {
        if (err) {
            return callback(err);
        };
        if (entity!==null) {
            return callback(api.invalid_param('alias', 'duplicate alias'));
        }
        callback(null, true);
    });
}

exports = module.exports = {

    'GET /api/pages/:id': function(req, res, next) {
        /**
         * Get page by id.
         * 
         * @param {string} :id - The id of the page.
         * @return {object} Page object.
         */
        Page.find(req.params.id, function(err, page) {
            if (err) {
                return next(err);
            }
            if (page===null) {
                return next(api.not_found('Page'));
            }
            Text.find(page.content_id, function(err, text) {
                if (err) {
                    return next(err);
                }
                if (text===null) {
                    return next(api.not_found('Text'));
                }
                page.content = text.value;
                return res.send(page);
            });
        });
    },

    'GET /api/pages': function(req, res, next) {
        /**
         * Get all pages object (but no content value).
         * 
         * @return {object} Result as {"pages": [{page}, {page}...]}
         */
        Page.findAll({
            order: 'alias'
        }, function(err, entities) {
            if (err) {
                return next(err);
            }
            res.send({ pages: entities });
        });
    },

    'POST /api/pages': function(req, res, next) {
        /**
         * Create a new page.
         * 
         * @return {object} The created page object.
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.not_allowed('Permission denied.'));
        }
        try {
            var name = utils.get_required_param('name', req),
                alias = utils.get_required_param('alias', req).toLowerCase(),
                content = utils.get_required_param('content', req);
        }
        catch (e) {
            return next(e);
        }

        var draft = 'true' === utils.get_param('draft', '', req),
            tags = utils.format_tags(utils.get_param('tags', '', req));

        var content_id = next_id();
        var page_id = next_id();

        warp.transaction(function(err, tx) {
            if (err) {
                return next(err);
            }
            async.waterfall([
                function(callback) {
                    // check alias exist:
                    checkAliasAvailable(alias, tx, callback);
                },
                function(aliasIsAvailable, callback) {
                    // create text:
                    Text.create({
                        id: content_id,
                        ref_id: page_id,
                        value: content
                    }, tx, callback);
                },
                function(text, callback) {
                    // create page:
                    Page.create({
                        id: page_id,
                        content_id: content_id,
                        alias: alias,
                        name: name,
                        tags: tags,
                        draft: draft
                    }, tx, callback);
                }
            ], function(err, result) {
                tx.done(err, function(err) {
                    if (err) {
                        return next(err);
                    }
                    result.content = content;
                    res.send(result);
                });
            });
        });
    },

    'POST /api/pages/:id': function(req, res, next) {
        /**
         * Update page by id.
         * 
         * @param {string} :id - The id of the page.
         * @return {object} Updated page object.
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.not_allowed('Permission denied.'));
        }
        var name = utils.get_param('name', req),
            alias = utils.get_param('alias', req),
            tags = utils.get_param('tags', req),
            content = utils.get_param('content', req);
        if (name!==null && name==='') {
            return next(api.invalid_param('name'));
        }
        if (alias!==null) {
            if (alias==='') {
                return next(api.invalid_param('alias'));
            }
            alias = alias.toLowerCase();
        }
        if (tags!==null) {
            tags = utils.format_tags(tags);
        }
        if (content!==null && content==='') {
            return next(api.invalid_param('content'));
        }
        warp.transaction(function(err, tx) {
            if (err) {
                return next(err);
            }
            async.waterfall([
                function(callback) {
                    // get page by id:
                    Page.find(req.params.id, tx, callback);
                },
                function(page, callback) {
                    if (page===null) {
                        return callback(api.not_found('Page'));
                    }
                    // check alias:
                    if (alias!==null && page.alias!==alias) {
                        // check alias exist:
                        return checkAliasAvailable(alias, tx, function(err, result) {
                            if (err) {
                                return callback(err);
                            }
                            return callback(null, page);
                        });
                    }
                    // no need to update alias!
                    callback(null, page);
                },
                function(page, callback) {
                    // create Text if needed:
                    if (content!==null) {
                        console.log('Need update text...');
                        Text.create({
                            id: next_id(),
                            ref_id: page.id,
                            value: content
                        }, tx, function(err, text) {
                            page.content_id = text.id;
                            callback(err, page);
                        });
                        return;
                    }
                    callback(null, page);
                },
                function(page, callback) {
                    // update page:
                    if (name!==null) {
                        page.name = name;
                    }
                    if (alias!==null) {
                        page.alias = alias;
                    }
                    if (tags!==null) {
                        page.tags = tags;
                    }
                    page.update(tx, callback);
                }
            ], function(err, result) {
                tx.done(err, function(err) {
                    if (err) {
                        return next(err);
                    }
                    if (content!==null) {
                        result.content = content;
                        return res.send(result);
                    }
                    Text.find(result.content_id, function(err, text) {
                        if (err) {
                            return next(err);
                        }
                        if (text===null) {
                            return next(api.not_found('Text'));
                        }
                        result.content = text.value;
                        res.send(result);
                    });
                });
            });
        });
    },

    'POST /api/pages/:id/delete': function(req, res, next) {
        /**
         * Delete a page by its id.
         * 
         * @param {string} :id - The id of the page.
         * @return {object} Results contains id of the page, e.g. {"id": "12345"}
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.not_allowed('Permission denied.'));
        }
        warp.transaction(function(err, tx) {
            if (err) {
                return next(err);
            }
            async.waterfall([
                function(callback) {
                    Page.find(req.params.id, tx, callback);
                },
                function(page, callback) {
                    if (page===null) {
                        return callback(api.not_found('Page'));
                    }
                    page.destroy(callback);
                },
                function(r, callback) {
                    // delete all texts:
                    warp.update('delete from texts where ref_id=?', [req.params.id], callback);
                }
            ], function(err, result) {
                tx.done(err, function(err) {
                    if (err) {
                        return next(err);
                    }
                    res.send({ id: req.params.id });
                });
            });
        });
    }
}
