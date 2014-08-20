// category api

var
    _ = require('lodash'),
    async = require('async'),
    api = require('../api'),
    db = require('../db'),

    utils = require('./_utils'),
    constants = require('../constants');

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    warp = db.warp,
    next_id = db.next_id;

function getCategories(callback) {
    Category.findAll({
        order: 'display_order'
    }, callback);
}

function getCategory(id, tx, callback) {
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    Category.find(id, tx, function (err, category) {
        if (err) {
            return callback(err);
        }
        if (category === null) {
            return callback(api.notFound('Category'));
        }
        callback(null, category);
    });
}

function getNavigationMenus(callback) {
    getCategories(function (err, cats) {
        if (err) {
            return callback(err);
        }
        callback(null, _.map(cats, function (cat) {
            return {
                name: cat.name,
                url: '/category/' + cat.id
            };
        }));
    });
}

module.exports = {

    getCategories: getCategories,

    getCategory: getCategory,

    getNavigationMenus: getNavigationMenus,

    'GET /api/categories': function (req, res, next) {
        /**
         * Get all categories.
         * 
         * @name Get Categories
         * @return {object} Result as {"categories": [{category1}, {category2}...]}
         */
        getCategories(function (err, array) {
            if (err) {
                return next(err);
            }
            return res.send({ categories: array });
        });
    },

    'GET /api/categories/:id': function (req, res, next) {
        /**
         * Get categories by id.
         * 
         * @name Get Category
         * @param {string} id: The id of the category.
         * @return {object} Category object.
         */
        getCategory(req.params.id, function (err, obj) {
            if (err) {
                return next(err);
            }
            return res.send(obj);
        });
    },

    'POST /api/categories': function (req, res, next) {
        /**
         * Create a new category.
         * 
         * @name Create Category
         * @param {string} name - The name of the category.
         * @param {string,optional} description - The description of the category.
         * @return {object} Category object that was created.
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var name, description;
        try {
            name = utils.getRequiredParam('name', req);
        } catch (e) {
            return next(e);
        }
        description = utils.getParam('description', '', req);

        Category.findNumber('max(display_order)', function (err, num) {
            if (err) {
                return next(err);
            }
            Category.create({
                name: name,
                description: description,
                display_order: (num === null) ? 0 : num + 1
            }, function (err, entity) {
                if (err) {
                    return next(err);
                }
                return res.send(entity);
            });
        });
    },

    'POST /api/categories/all/sort': function (req, res, next) {
        /**
         * Sort categories.
         *
         * @name Sort Categories
         * @param {array} id: The ids of categories.
         * @return {object} The sort result like { "sort": true }.
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var i, entity, pos;
        Category.findAll(function (err, entities) {
            if (err) {
                return next(err);
            }
            var ids = req.body.id;
            if (!Array.isArray(ids)) {
                ids = [ids];
            }
            if (entities.length !== ids.length) {
                return next(api.invalidParam('id', 'Invalid id list.'));
            }
            for (i = 0; i < entities.length; i++) {
                entity = entities[i];
                pos = ids.indexOf(entity.id);
                if (pos === (-1)) {
                    return next(api.invalidParam('id', 'Invalid id parameters.'));
                }
                entity.display_order = pos;
            }
            warp.transaction(function (err, tx) {
                if (err) {
                    return next(err);
                }
                async.series(_.map(entities, function (entity) {
                    return function (callback) {
                        entity.update(['display_order', 'updated_at', 'version'], tx, callback);
                    };
                }), function (err, result) {
                    tx.done(err, function (err) {
                        console.log(err === null ? 'tx committed' : 'tx rollbacked');
                        if (err) {
                            return next(err);
                        }
                        return res.send({ sort: true });
                    });
                });
            });
        });
    },

    'POST /api/categories/:id': function (req, res, next) {
        /**
         * Update a category.
         * 
         * @name Update Category
         * @param {string} id - The id of the category.
         * @param {string} [name] - The new name of the category.
         * @param {string} [description] - The new description of the category.
         * @return {object} Category object that was updated.
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var name = utils.getParam('name', req),
            description = utils.getParam('description', req);
        if (name !== null) {
            if (name === '') {
                return next(api.invalidParam('name'));
            }
        }
        getCategory(req.params.id, function (err, entity) {
            if (err) {
                return next(err);
            }
            if (name !== null) {
                entity.name = name;
            }
            if (description !== null) {
                entity.description = description;
            }
            entity.update(function (err, entity) {
                if (err) {
                    return next(err);
                }
                return res.send(entity);
            });
        });
    },

    'POST /api/categories/:id/delete': function (req, res, next) {
        /**
         * Delete a category by its id.
         * 
         * @name Delete Category
         * @param {string} id - The id of the category.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         */
        if (utils.isForbidden(req, constants.ROLE_ADMIN)) {
            return next(api.notAllowed('Permission denied.'));
        }
        async.waterfall([
            function (callback) {
                getCategory(req.params.id, callback);
            },
            function (category, callback) {
                Article.findNumber({
                    select: 'count(*)',
                    where: 'category_id=?',
                    params: [category.id]
                }, function (err, num) {
                    if (err) {
                        return callback(err);
                    }
                    if (num > 0) {
                        return callback(api.resourceConflictError('Category', 'Category is in use and cannot be deleted.'));
                    }
                    callback(null, category);
                });
            },
            function (category, callback) {
                category.destroy(callback);
            }
        ], function (err, result) {
            if (err) {
                return next(err);
            }
            return res.send({ id: req.params.id });
        });
    }
};
