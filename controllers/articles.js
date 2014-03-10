// articles.js

var
    api = require('../api'),
    db = require('../db');

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    sequelize = db.sequelize;

// do management console

exports = module.exports = {

    'GET /api/categories': function(req, res, next) {
        /**
         * Get all categories.
         * 
         * @return {object} Result as {"categories": [{category1}, {category2}...]}
         */
        Category.findAll({
            order: 'display_order'
        }).error(function(err) {
            return res.send(api.error(err));
        }).success(function(cats) {
            return res.send({categories:cats});
        });
    },

    'GET /api/categories/:id': function(req, res, next) {
        /**
         * Get categories by id.
         * 
         * @param {string} :id - The id of the category.
         * @return {object} Category object.
         */
        Category.find(req.params.id).error(function(err) {
            return res.send(api.error(err));
        }).success(function(cat) {
            if ( ! cat) {
                return res.send(api.notfound('category', 'Category not found.'));
            }
            return res.send(cat);
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
        var name = req.body.name.trim();
        var description = req.body.description.trim();

        Category.max('display_order').error(function(err) {
            return res.send(api.error(err));
        }).success(function(max_display_order) {
            var display_order = (max_display_order===null) ? 0 : max_display_order + 1;
            Category.create({
                name: name,
                description: description,
                display_order: display_order
            }).error(function(err) {
                return res.send(api.error(err));
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
        var name = req.body.name.trim();
        var description = req.body.description.trim();
        Category.find(req.params.id).error(function(err) {
            return res.send(api.error(err));
        }).success(function(cat) {
            if (! cat) {
                return res.send(api.notfound('category', 'Category not found.'));
            }
            cat.name = name;
            cat.description = description;
            cat.updateAttributes({
                name: name,
                description: description
            }).error(function(err) {
                return res.send(api.error(err));
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
        Category.find(req.params.id).error(function(err) {
            return res.send(api.error(err));
        }).success(function(cat) {
            console.log('to be deleted category: ' + cat);
            if (! cat) {
                return res.send(api.notfound('category', 'Category not found.'));
            }
            cat.destroy().error(function(err) {
                return res.send(api.error(err));
            }).success(function() {
                return res.send({result: true});
            });
        });
    }
}
