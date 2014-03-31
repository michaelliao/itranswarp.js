// articles.js

var
    _ = require('lodash'),
    async = require('async'),
    api = require('../api'),
    db = require('../db'),

    utils = require('./_utils'),
    constants = require('../constants');

var
    User = db.user,
    Category = db.category,
    Text = db.text,
    warp = db.warp,
    next_id = db.next_id;

exports = module.exports = {

    'GET /api/categories': function(req, res, next) {
        /**
         * Get all categories.
         * 
         * @return {object} Result as {"categories": [{category1}, {category2}...]}
         */
        Category.findAll({
            order: 'display_order'
        }, function(err, array) {
            if (err) {
                return next(err);
            }
            return res.send({ categories: array });
        });
    },

    'GET /api/categories/:id': function(req, res, next) {
        /**
         * Get categories by id.
         * 
         * @param {string} :id - The id of the category.
         * @return {object} Category object.
         */
        Category.find(req.params.id, function(err, obj) {
            if (err) {
                return next(err);
            }
            if (obj===null) {
                return next(api.not_found('Category'));
            }
            return res.send(obj);
        });
    },

    'POST /api/categories': function(req, res, next) {
        /**
         * Create a new category.
         * 
         * @param {string} name - The name of the category.
         * @param {string,optional} description - The description of the category.
         * @return {object} Category object that was created.
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.not_allowed('Permission denied.'));
        }
        try {
            var name = utils.get_required_param('name', req);
        }
        catch (e) {
            return next(e);
        }
        var description = utils.get_param('description', '', req);

        Category.findNumber('max(display_order)', function(err, num) {
            if (err) {
                return next(err);
            }
            Category.create({
                name: name,
                description: description,
                display_order: (num===null) ? 0 : num + 1
            }, function(err, entity) {
                if (err) {
                    return next(err);
                }
                return res.send(entity);
            });
        });
    },

    'POST /api/categories/sort': function(req, res, next) {
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.not_allowed('Permission denied.'));
        }
        Category.findAll(function(err, entities) {
            if (err) {
                return next(err);
            }
            var ids = req.body.id;
            if (! Array.isArray(ids)) {
                ids = [ids];
            }
            if (entities.length!==ids.length) {
                return next(api.invalid_param('id', 'Invalid id list.'));
            }
            for (var i=0; i<entities.length; i++) {
                var entity = entities[i];
                var pos = ids.indexOf(entity.id);
                if (pos===(-1)) {
                    return next(api.invalid_param('id', 'Invalid id parameters.'));
                }
                entity.display_order = pos;
            }
            warp.transaction(function(err, tx) {
                if (err) {
                    return next(err);
                }
                async.series(_.map(entities, function(entity) {
                    return function(callback) {
                        entity.update(['display_order'], tx, callback);
                    };
                }), function(err, result) {
                    tx.done(err, function(err) {
                        console.log(err===null ? 'tx committed' : 'tx rollbacked');
                        if (err) {
                            return next(err);
                        }
                        return res.send({ sort: true });
                    });
                });
            });
        });
    },

    'POST /api/categories/:id': function(req, res, next) {
        /**
         * Update a category.
         * 
         * @param {string} :id - The id of the category.
         * @param {string,optional} name - The new name of the category.
         * @param {string,optional} description - The new description of the category.
         * @return {object} Category object that was updated.
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.not_allowed('Permission denied.'));
        }
        var name = utils.get_param('name', req),
            description = utils.get_param('description', req);
        var attrs = {};
        if (name!==null) {
            if (name==='') {
                return next(api.invalid_param('name'));
            }
            attrs.name = name;
        }
        if (description!==null) {
            attrs.description = description;
        }
        Category.find(req.params.id, function(err, entity) {
            if (err) {
                return next(err);
            }
            if (entity===null) {
                return next(api.not_found('Category'));
            }
            if (_.isEmpty(attrs)) {
                return res.send(entity);
            }
            entity.update(attrs, function(err, entity) {
                if (err) {
                    return next(err);
                }
                return res.send(entity);
            });
        });
    },

    'POST /api/categories/:id/delete': function(req, res, next) {
        /**
         * Delete a category by its id.
         * 
         * @param {string} :id - The id of the category.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.not_allowed('Permission denied.'));
        }
        Category.find(req.params.id, function(err, entity) {
            if (err) {
                return next(err);
            }
            if (entity===null) {
                return next(api.not_found('Category'));
            }
            entity.destroy(function(err, result) {
                if (err) {
                    return next(err);
                }
                return res.send({ id: req.params.id });
            });
        });
    }
}
