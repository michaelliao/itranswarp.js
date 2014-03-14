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
    sequelize = db.sequelize,
    next_id = db.next_id;

exports = module.exports = {

    'GET /api/categories': function(req, res, next) {
        /**
         * Get all categories.
         * 
         * @return {object} Result as {"categories": [{category1}, {category2}...]}
         */
        utils.findAll(Category, {
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
        utils.find(Category, req.params.id, function(err, obj) {
            if (err) {
                return next(err);
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
        if ( ! req.user || req.user.role > constants.ROLE_ADMIN) {
            return next(api.not_allowed('Permission denied.'));
        }

        var name = utils.get_required_param('name', req);
        if (! name) {
            return res.send(api.invalid_param('name'));
        }
        var description = utils.get_param('description', '', req);

        Category.max('display_order').error(function(err) {
            return next(err);
        }).success(function(max_display_order) {
            var display_order = (max_display_order===null) ? 0 : max_display_order + 1;
            Category.create({
                name: name,
                description: description,
                display_order: display_order
            }).error(function(err) {
                return next(err);
            }).success(function(cat) {
                return res.send(cat);
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
        if ( ! req.user || req.user.role > constants.ROLE_ADMIN) {
            return next(api.not_allowed('Permission denied.'));
        }
        var name = req.body.name.trim();
        var description = req.body.description.trim();
        utils.find(Category, req.params.id, function(err, cat) {
            if (err) {
                return next(err);
            }
            cat.name = name;
            cat.description = description;
            cat.updateAttributes({
                name: name,
                description: description
            }).error(function(err) {
                return next(err);
            }).success(function(cat) {
                return res.send(cat);
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
        if ( ! req.user || req.user.role > constants.ROLE_ADMIN) {
            return next(api.not_allowed('Permission denied.'));
        }
        utils.destroy(Category, req.params.id, function(err) {
            if (err) {
                return next(err);
            }
            return res.send({ id: req.params.id });
        });
    }
}
