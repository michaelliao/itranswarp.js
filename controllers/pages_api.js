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
        var name = utils.get_required_param('name', req);
        if ( ! name) {
            return next(api.invalid_param('name'));
        }
        var alias = utils.get_required_param('alias', req);
        if ( ! alias) {
            return next(api.invalid_param('category_id'));
        }
        alias = alias.toLowerCase();
        var content = utils.get_required_param('content', req);
        if ( ! content) {
            return next(api.invalid_param('content'));
        }
        var draft = 'true' !== utils.get_param('draft', '', req);
        var tags = utils.format_tags(utils.get_param('tags', '', req));

        var content_id = next_id();
        var page_id = next_id();

        // check if alias exist:

        sequelize.transaction(function(tx) {
            async.series({
                text: function(callback) {
                    utils.save(Text, {
                        id: content_id,
                        ref_id: page_id,
                        value: content
                    }, tx, callback);
                },
                page: function(callback) {
                    utils.save(Page, {
                        id: page_id,
                        content_id: content_id,
                        alias: alias,
                        name: name,
                        tags: tags,
                        draft: draft
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
                    return res.send(results.page);
                });
            });
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
         * @return {object} Category object.
         */
        utils.find(Page, req.params.id, function(err, entity) {
            return err ? next(err) : res.send({ pages: entities });
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
        utils.destroy(Page, req.params.id, function(err) {
            return err ? next(err) : res.send({ id: req.params.id });
        });
    }
}
