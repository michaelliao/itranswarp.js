'use strict';

/**
 * Category API.
 * 
 * author: Michael Liao
 */
const
    _ = require('lodash'),
    api = require('../api'),
    db = require('../db'),
    cache = require('../cache'),
    logger = require('../logger'),
    constants = require('../constants'),
    CACHE_KEY = constants.cache.CATEGORIES,
    User = db.User,
    Article = db.Article,
    Category = db.Category,
    Text = db.Text,
    nextId = db.nextId;

async function _clearCache() {
    await cache.remove(CACHE_KEY);
}

async function _loadCategories() {
    return await Category.findAll({
        order: 'display_order'
    });
}

async function getCategories(fromCache=true) {
    if (fromCache) {
        return await cache.get(CACHE_KEY, _loadCategories);
    }
    return await _loadCategories();
}

async function getCategory(id, fromCache=true) {
    let
        categories = await getCategories(fromCache),
        filtered = categories.filter((cat) => {
            return cat.id === id;
        });
    if (filtered.length === 0) {
        throw api.notFound('Category');
    }
    return filtered[0];
}

module.exports = {

    getNavigationMenus: async () => {
        let categories = await getCategories();
        return categories.map((cat) => {
            return {
                name: cat.name,
                url: '/category/' + cat.id
            };
        });
    },

    getCategories: getCategories,

    getCategory: getCategory,

    'GET /api/categories': async (ctx, next) => {
        /**
         * Get all categories.
         * 
         * @name Get Categories
         * @return {object} Result as {"categories": [{category1}, {category2}...]}
         */
        ctx.rest({
            categories: await getCategories()
        });
    },

    'GET /api/categories/:id': async (ctx, next) => {
        /**
         * Get categories by id.
         * 
         * @name Get Category
         * @param {string} id: The id of the category.
         * @return {object} Category object.
         */
        let id = ctx.params.id;
        ctx.rest(await getCategory(id));
    },

    'POST /api/categories': async (ctx, next) => {
        /**
         * Create a new category.
         * 
         * @name Create Category
         * @param {string} name - The name of the category.
         * @param {string,optional} description - The description of the category.
         * @return {object} Category object that was created.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('createCategory');
        let
            data = ctx.request.body,
            num = await Category.max('display_order'),
            cat = await Category.create({
                name: data.name.trim(),
                tag: data.tag.trim(),
                description: data.description.trim(),
                display_order: isNaN(num) ? 0 : num + 1
            });
        await _clearCache();
        ctx.rest(cat);
    },

    'POST /api/categories/all/sort': async (ctx, next) => {
        /**
         * Sort categories.
         * 
         * @name Sort Categories
         * @param {array} id: The ids of categories.
         * @return {object} The sort result like { "sort": true }.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('sortCategories');
        let
            cat,
            data = ctx.request.body,
            ids = data.ids,
            categories = await getCategories(false);
        if (ids.length !== categories.length) {
            throw api.invalidParam('ids', 'invalid id list');
        }
        categories.forEach((cat) => {
            let newIndex = ids.indexOf(cat.id);
            if (newIndex === (-1)) {
                throw api.invalidParam('ids', 'invalid id list');
            }
            cat.display_order = newIndex;
        });
        for (cat of categories) {
            await cat.save();
        }
        await _clearCache();
        ctx.rest({
            ids: ids
        });
    },

    'POST /api/categories/:id': async (ctx, next) => {
        /**
         * Update a category.
         * 
         * @name Update Category
         * @param {string} id - The id of the category.
         * @param {string} [name] - The new name of the category.
         * @param {string} [description] - The new description of the category.
         * @return {object} Category object that was updated.
         */
        ctx.checkPermission(constants.role.ADMIN);
        ctx.validate('updateCategory');
        let
            id = ctx.params.id,
            cat = await getCategory(id, false),
            data = ctx.request.body;
        if (data.name) {
            cat.name = data.name.trim();
        }
        if (data.tag) {
            cat.tag = data.tag.trim();
        }
        if (data.description) {
            cat.description = data.description.trim();
        }
        await cat.save();
        await _clearCache();
        ctx.rest(cat);
    },

    'POST /api/categories/:id/delete': async (ctx, next) => {
        /**
         * Delete a category by its id.
         * 
         * @name Delete Category
         * @param {string} id - The id of the category.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         */
        ctx.checkPermission(constants.role.ADMIN);
        let
            id = ctx.params.id,
            cat = await getCategory(id),
            num = await Article.count({
                where: {
                    category_id: id
                }
            });
        if (num > 0) {
            throw api.conflictError('Category', 'Cannot delete category for there are some articles reference it.');
        }
        await Category.destroy({
            where: {
                id: id
            }
        });
        await _clearCache();
        ctx.rest({ 'id': id });
    }
};
