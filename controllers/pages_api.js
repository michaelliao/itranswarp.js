// pages.js

var
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    dao = require('./_dao'),
    utils = require('./_utils'),
    constants = require('../constants');

var
    User = db.user,
    Article = db.article,
    Page = db.page,
    Text = db.text,
    sequelize = db.sequelize,
    next_id = db.next_id;

function checkAliasAvailable(alias, tx, callback) {
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
        callback(null, true);
    });
}

exports = module.exports = {

    'GET /api/pages/:id': function(req, res, next) {
        dao.find(Page, req.params.id, function(err, entity) {
            return err ? next(err) : res.send(entity);
        });
    },

    'GET /api/pages': function(req, res, next) {
        /**
         * Get all pages.
         * 
         * @return {object} Result as {"pages": [{page}, {page}...]}
         */
        dao.findAll(Page, {
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
        dao.find(Page, req.params.id, function(err, entity) {
            return err ? next(err) : res.send({ pages: entities });
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

        dao.transaction([
            function(prev, tx, callback) {
                // check if alias exist:
                checkAliasAvailable(alias, tx, callback);
            },
            function(prev, tx, callback) {
                console.log('prev check alias available: ' + prev);
                // create text:
                dao.save(Text, {
                    id: content_id,
                    ref_id: page_id,
                    value: content
                }, tx, callback);
            },
            function(textObject, tx, callback) {
                // create page:
                dao.save(Page, {
                    id: page_id,
                    content_id: content_id,
                    alias: alias,
                    name: name,
                    tags: tags,
                    draft: draft
                }, tx, callback);
            }
        ], function(err, pageObject) {
            if (err) {
                return next(err);
            }
            pageObject.dataValues.content = content;
            res.send(pageObject);
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
        var attrs = {};
        var name = utils.get_param('name', req),
            alias = utils.get_param('alias', req),
            tags = utils.get_param('tags', req),
            content = utils.get_param('content', req);

        if (name!==null) {
            if (name) {
                attrs.name = name;
            }
            else {
                return res.send(api.invalid_param('name'));
            }
        }
        if (alias!==null) {
            if (alias) {
                attrs.alias = alias.toLowerCase();
            }
            else {
                return res.send(api.invalid_param('alias'));
            }
        }
        if (tags!==null) {
            attrs.tags = utils.format_tags(tags);
        }
        if (content!==null) {
            if (content) {
                attrs.content = content;
            }
            else {
                return res.send(api.invalid_param('content'));
            }
        }
        dao.transaction([
            // get page by id:
            function(prev, tx, callback) {
                dao.find(Page, req.params.id, tx, function(err, entity) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, entity);
                });
            },
            // check alias:
            function(pageObject, tx, callback) {
                if ( ! attrs.alias || pageObject.alias===attrs.alias) {
                    // no need to update alias:
                    delete attrs.alias;
                    return callback(null, pageObject);
                }
                // check if alias exist:
                checkAliasAvailable(alias, tx, function(err, ok) {
                    callback(err, pageObject);
                });
            },
            // update text if needed:
            function(pageObject, tx, callback) {
                if ( ! attrs.content) {
                    return callback(null, pageObject);
                }
                console.log('Need update text...');
                var content_id = next_id();
                var content = attrs.content;
                attrs.content_id = content_id;
                delete attrs.content;
                dao.save(Text, {
                    id: content_id,
                    ref_id: req.params.id,
                    value: content
                }, tx, function(err, text) {
                    callback(err, pageObject);
                });
            },
            // update attributes of page:
            function(pageObject, tx, callback) {
                if (Object.getOwnPropertyNames(attrs).length===0) {
                    return callback(null, pageObject);
                }
                console.log('update page attrs: ' + JSON.stringify(attrs));
                dao.updateAttributes(pageObject, attrs, tx, function(err, pageObject) {
                    callback(null, pageObject);
                });
            }
        ], function(err, pageObject) {
            if (err) {
                return next(err);
            }
            if (content!==null) {
                pageObject.dataValues.content = content;
                return res.send(pageObject);
            }
            // query content:
            dao.find(Text, pageObject.content_id, function(err, text) {
                if (err) {
                    return next(err);
                }
                pageObject.dataValues.content = text.value;
                res.send(pageObject);
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
        dao.transaction([
            function(prev, tx, callback) {
                // get by id:
                dao.find(Page, req.params.id, tx, callback);
            },
            function(prev, tx, callback) {
                // delete all texts belong to page:
                // TODO:
                callback(null, null);
            },
            function(prev, tx, callback) {
                // delete page object:
                dao.destroyById(Page, req.params.id, callback);
            }
        ], function(err, result) {
            return err ? next(err) : res.send({ id: req.params.id });
        });
    }
}
