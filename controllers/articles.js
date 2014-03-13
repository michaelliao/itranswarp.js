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
    Category = db.category,
    Text = db.text,
    sequelize = db.sequelize,
    next_id = db.next_id;

exports = module.exports = {



    'GET /api/articles/:id': function(req, res, next) {
        utils.get_entity(Article, req.params.id, function(err, article) {
            if (err) {
                return next(err);
            }
            return res.send(article);
        });
    },

    'POST /api/articles': function(req, res, next) {
        /**
         * Create a new article.
         * 
         * @return {object} The created article object.
         */
        if ( ! req.user || req.user.role > constants.ROLE_EDITOR) {
            return res.send(api.not_allowed('Permission denied.'));
        }
        var name = utils.get_required_param('name', req);
        if ( ! name) {
            return next(api.invalid_param('name'));
        }
        var category_id = utils.get_required_param('category_id', req);
        if ( ! category_id) {
            return next(api.invalid_param('category_id'));
        }
        var content = utils.get_required_param('content', req);
        if ( ! content) {
            return next(api.invalid_param('content'));
        }
        var description = utils.get_param('description', '', req);
        var tags = utils.format_tags(utils.get_param('tags', '', req));

        var publish_time = Date.now(); //req.body.publish_time;

        var cover_id = 'xxx';
        var content_id = next_id();
        var article_id = next_id();

        sequelize.transaction(function(tx) {
            async.series({
                category: function(callback) {
                    utils.get_entity(Category, category_id, callback);
                },
                text: function(callback) {
                    utils.create_object(Text, {
                        id: content_id,
                        ref_id: article_id,
                        value: content
                    }, tx, callback);
                },
                article: function(callback) {
                    utils.create_object(Article, {
                        id: article_id,
                        user_id: req.user.id,
                        user_name: req.user.name,
                        category_id: category_id,
                        cover_id: cover_id,
                        content_id: content_id,
                        name: name,
                        tags: tags,
                        description: description,
                        publish_time: publish_time
                    }, tx, callback);
                }
            }, function(err, results) {
                if (err) {
                    return tx.rollback().success(function() {
                        return next(err);
                    });
                }
                tx.commit().error(function(err) {
                    return next(err);
                }).success(function() {
                    return res.send(results.article);
                });
            });
        });
    },

    'GET /api/categories': function(req, res, next) {
        /**
         * Get all categories.
         * 
         * @return {object} Result as {"categories": [{category1}, {category2}...]}
         */
        utils.get_categories(function(err, array) {
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
        utils.get_entity(Category, req.params.id, function(err, obj) {
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
            return res.send(api.server_error(err));
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
        utils.get_entity(Category, req.params.id, function(err, cat) {
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
         * @return {object} Results like {"result": true}
         */
        if ( ! req.user || req.user.role > constants.ROLE_ADMIN) {
            return next(api.not_allowed('Permission denied.'));
        }
        utils.get_entity(Category, req.params.id, function(err, cat) {
            if (err) {
                return next(err);
            }
            console.log('to be deleted category: ' + cat);
            cat.destroy().error(function(err) {
                return next(err);
            }).success(function() {
                return res.send({ id: req.params.id });
            });
        });
    }
}
