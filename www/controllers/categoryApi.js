'use strict';

// category api

var
    _ = require('lodash'),
    api = require('../api'),
    db = require('../db'),
    helper = require('../helper'),
    constants = require('../constants'),
    json_schema = require('../json_schema');

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    warp = db.warp,
    next_id = db.next_id;

function* $getCategories() {
    return yield Category.$findAll({
        order: 'display_order'
    });
}

function* $getCategory(id) {
    var category = yield Category.$find(id);
    if (category === null) {
        throw api.notFound('Category');
    }
    return category;
}

function* $getNavigationMenus() {
    var categories = yield $getCategories();
    return _.map(categories, function (cat) {
        return {
            name: cat.name,
            url: '/category/' + cat.id
        };
    });
}

module.exports = {

    $getCategories: $getCategories,

    $getCategory: $getCategory,

    $getNavigationMenus: $getNavigationMenus,

    'GET /api/categories': function* () {
        /**
         * Get all categories.
         * 
         * @name Get Categories
         * @return {object} Result as {"categories": [{category1}, {category2}...]}
         */
        this.body = {
            categories: yield $getCategories()
        };
    },

    'GET /api/categories/:id': function* (id) {
        /**
         * Get categories by id.
         * 
         * @name Get Category
         * @param {string} id: The id of the category.
         * @return {object} Category object.
         */
        this.body = yield $getCategory(id);
    },

    'POST /api/categories': function* () {
        /**
         * Create a new category.
         * 
         * @name Create Category
         * @param {string} name - The name of the category.
         * @param {string,optional} description - The description of the category.
         * @return {object} Category object that was created.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var
            num,
            data = this.request.body;
        json_schema.validate('createCategory', data);
        num = yield Category.$findNumber('max(display_order)');
        this.body = yield Category.$create({
            name: data.name.trim(),
            description: data.description.trim(),
            display_order: (num === null) ? 0 : num + 1
        });
    },

    'POST /api/categories/all/sort': function* () {
        /**
         * Sort categories.
         *
         * @name Sort Categories
         * @param {array} id: The ids of categories.
         * @return {object} The sort result like { "sort": true }.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var data = this.request.body;
        json_schema.validate('sortCategory', data);
        this.body = {
            categories: yield helper.$sort(data.ids, yield $getCategories())
        };
    },

    'POST /api/categories/:id': function* (id) {
        /**
         * Update a category.
         * 
         * @name Update Category
         * @param {string} id - The id of the category.
         * @param {string} [name] - The new name of the category.
         * @param {string} [description] - The new description of the category.
         * @return {object} Category object that was updated.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var
            props = [],
            category,
            data = this.request.body;
        json_schema.validate('updateCategory', data);
        category = yield $getCategory(id);
        if (data.name) {
            category.name = data.name.trim();
            props.push('name');
        }
        if (data.description) {
            category.description = data.description.trim();
            props.push('description');
        }
        if (props.length > 0) {
            props.push('updated_at');
            props.push('version');
            yield category.$update(props);
        }
        this.body = category;
    },

    'POST /api/categories/:id/delete': function* (id) {
        /**
         * Delete a category by its id.
         * 
         * @name Delete Category
         * @param {string} id - The id of the category.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var category = yield $getCategory(id);
        yield category.$destroy();
        this.body = {
            id: id
        };
    }
};
