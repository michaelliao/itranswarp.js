// articles.js

var
    async = require('async'),
    api = require('../api'),
    db = require('../db'),

    utils = require('./_utils'),
    constants = require('../constants');

var
    User = db.user,
    Category = db.category,
    Text = db.text,
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
            var display_order = (num===null) ? 0 : num + 1;
            Category.save({
                name: name,
                description: description,
                display_order: display_order
            }, function(err, entity) {
                if (err) {
                    return next(err);
                }
                return res.send(entity);
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
            attrs.name = name;
        }
        if (description!==null) {
            attrs.description = description;
        }
        dao.find(Category, req.params.id, function(err, cat) {
            if (err) {
                return next(err);
            }
            if (attrs) {
                return cat.updateAttributes(attrs).error(function(err) {
                    return next(err);
                }).success(function(cat) {
                    return res.send(cat);
                });
            }
            return res.send(cat);
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
        dao.destroyById(Category, req.params.id, function(err) {
            if (err) {
                return next(err);
            }
            return res.send({ id: req.params.id });
        });
    }
}
