// articles.js

var
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    utils = require('./_utils'),
    constants = require('../constants');

var
    User = db.user,
    Article = db.article,
    Page = db.page,
    Text = db.text,
    sequelize = db.sequelize,
    next_id = db.next_id;

exports = module.exports = {

    'GET /api/pages/:id': function(req, res, next) {
        utils.find(Page, req.params.id, function(err, entity) {
            return err ? next(err) : res.send(entity);
        });
    },

    'POST /api/pages': function(req, res, next) {
        /**
         * Create a new page.
         * 
         * @return {object} The created page object.
         */
        if ( ! req.user || req.user.role > constants.ROLE_ADMIN) {
            return res.send(api.not_allowed('Permission denied.'));
        }
        try {
            var name = utils.get_required_param('name', req);
            var alias = utils.get_required_param('alias', req).toLowerCase();
            var content = utils.get_required_param('content', req).trim();
        }
        catch (e) {
            return next(e);
        }

        var draft = 'true' === utils.get_param('draft', '', req);
        var tags = utils.format_tags(utils.get_param('tags', '', req));

        var content_id = next_id();
        var page_id = next_id();

        utils.transaction([
            function(tx, callback) {
                // check page exist:
                Page.find({
                    where: {
                        alias: alias
                    },
                    transaction: tx
                }).error(function(err) {
                    callback(err);
                }).success(function(entity) {
                    if (entity) {
                        return callback(api.invalid_param('alias', 'duplicate alias.'));
                    }
                    callback(null, 'check ok');
                });
            },
            function(tx, callback) {
                // create text:
                utils.save(Text, {
                    id: content_id,
                    ref_id: page_id,
                    value: content
                }, tx, callback);
            },
            function(tx, callback) {
                // create page:
                utils.save(Page, {
                    id: page_id,
                    content_id: content_id,
                    alias: alias,
                    name: name,
                    tags: tags,
                    draft: draft
                }, tx, callback);
            }
        ], function(err, results) {
            if (err) {
                return next(err);
            }
            var page = results[2];
            page.dataValues.content = content;
            res.send(page);
        });
    },

    'GET /api/pages': function(req, res, next) {
        /**
         * Get all pages.
         * 
         * @return {object} Result as {"pages": [{page}, {page}...]}
         */
        utils.findAll(Page, {
            order: 'alias'
        }, function(err, entities) {
            return err ? next(err) : res.send({ pages: entities });
        });
    },

    'GET /api/pages/:id': function(req, res, next) {
        /**
         * Get page by id.
         * 
         * @param {string} :id - The id of the page.
         * @return {object} Page object.
         */
        utils.find(Page, req.params.id, function(err, entity) {
            return err ? next(err) : res.send({ pages: entities });
        });
    },

    'POST /api/pages/:id': function(req, res, next) {
        /**
         * Update page by id.
         * 
         * @param {string} :id - The id of the page.
         * @return {object} Updated page object.
         */
        var attrs = {};
        var name = utils.get_param('name', req);
        if (name!==null) {
            if (name) {
                attrs.name = name;
            }
            else {
                return res.send(api.invalid_param('name'));
            }
        }
        var alias = utils.get_param('alias', req);
        if (alias!==null) {
            if (alias) {
                attrs.alias = alias.toLowerCase();
            }
            else {
                return res.send(api.invalid_param('alias'));
            }
        }
        var tags = utils.get_param('tags', req);
        if (tags!==null) {
            attrs.tags = utils.format_tags(tags);
        }
        var content = utils.get_param('content', req);
        if (content!==null) {
            if (content) {
                attrs.content = content;
            }
            else {
                return res.send(api.invalid_param('content'));
            }
        }
        var page = null;
        utils.transaction([
            // get page by id:
            function(tx, callback) {
                utils.find(Page, {
                    where: {
                        id: req.params.id
                    },
                    transaction: tx
                }, function(err, entity) {
                    if (! err) {
                        page = entity;
                    }
                    callback(err, entity);
                });
            },
            // check alias:
            function(tx, callback) {
                if (attrs.alias) {
                    if (page.alias===attrs.alias) {
                        delete attrs.alias;
                        return callback(null, 'no need to update alias.');
                    }
                    Page.find({
                        where: {
                            alias: attrs.alias
                        },
                        transaction: tx
                    }).error(function(err) {
                        return callback(err);
                    }).success(function(entity) {
                        if (entity) {
                            return callback(api.invalid_param('alias', 'Duplicate alias.'));
                        }
                        return callback(null, 'check alias ok.');
                    });
                }
                else {
                    return callback(null, 'no need to update alias.');
                }
            },
            // update text if needed:
            function(tx, callback) {
                if (attrs.content) {
                    var content_id = next_id();
                    var content = attrs.content;
                    attrs.content_id = content_id;
                    delete attrs.content;
                    utils.save(Text, {
                        id: content_id,
                        ref_id: req.params.id,
                        value: content
                    }, tx, callback);
                }
                else {
                    callback(null, null);
                }
            },
            // update attributes of page:
            function(tx, callback) {
                if (Object.getOwnPropertyNames(attrs).length > 0) {
                    page.updateAttributes(attrs, {
                        transaction: tx
                    }).error(function(err) {
                        callback(err);
                    }).success(function() {
                        callback(null, page);
                    });
                }
                else {
                    callback(null, page);
                }
            }
        ], function(err, results) {
            if (err) {
                return next(err);
            }
            if (content!==null) {
                page.dataValues.content = content;
                return res.send(page);
            }
            // query content:
            utils.find(Text, page.content_id, function(err, text) {
                if (err) {
                    return next(err);
                }
                page.dataValues.content = text.value;
                res.send(page);
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
        if ( ! req.user || req.user.role > constants.ROLE_ADMIN) {
            return next(api.not_allowed('Permission denied.'));
        }
        // TODO: delete text
        utils.destroy(Page, req.params.id, function(err) {
            return err ? next(err) : res.send({ id: req.params.id });
        });
    }
}
