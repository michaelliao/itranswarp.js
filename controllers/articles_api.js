// articles.js

var
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    dao = require('./_dao'),
    utils = require('./_utils'),
    images = require('./_images'),
    constants = require('../constants');

var
    attachmentsApi = require('./attachments_api'),
    checkAttachment = attachmentsApi.checkAttachment,
    createAttachmentTaskInTransaction = attachmentsApi.createAttachmentTaskInTransaction;

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    sequelize = db.sequelize,
    next_id = db.next_id;

exports = module.exports = {

    'GET /api/articles/:id': function(req, res, next) {
        dao.find(Article, req.params.id, function(err, entity) {
            return err ? next(err) : res.send(entity);
        });
    },

    'GET /api/articles': function(req, res, next) {
        dao.findAll(Article, {
            where: ['publish_time < ?', Date.now()],
            order: 'publish_time desc'
        }, function(err, entities) {
            return err ? next(err) : res.send({ articles: entities });
        });
    },

    'POST /api/articles': function(req, res, next) {
        /**
         * Create a new article.
         * 
         * @return {object} The created article object.
         */
        if (utils.isForbidden(req, constants.ROLE_EDITOR)) {
            return next(api.not_allowed('Permission denied.'));
        }
        try {
            var name = utils.get_required_param('name', req),
                category_id = utils.get_required_param('category_id', req),
                content = utils.get_required_param('content', req);
        }
        catch (e) {
            return next(e);
        }
        var description = utils.get_param('description', '', req),
            tags = utils.format_tags(utils.get_param('tags', '', req));

        var file = req.files.file;

        var publish_time = Date.now(); //req.body.publish_time;

        var content_id = next_id();
        var article_id = next_id();
        var cover_id = '';

        var tx_tasks = [];

        var checkCategoryTask = function(prev, tx, callback) {
            dao.find(Category, category_id, tx, callback);
        };
        var createTextTask = function(prev, tx, callback) {
            dao.save(Text, {
                id: content_id,
                ref_id: article_id,
                value: content
            }, tx, callback);
        };
        var createArticleTask = function(prev, tx, callback) {
            dao.save(Article, {
                id: article_id,
                user_id: req.user.id,
                user_name: req.user.name,
                category_id: category_id,
                cover_id: (prev && prev.id) || '',
                content_id: content_id,
                name: name,
                tags: tags,
                description: description,
                publish_time: publish_time
            }, tx, callback);
        };

        if (file) {
            return checkAttachment(file, function(err, attachFileObject) {
                if (err) {
                    return next(err);
                }
                // override name:
                attachFileObject.name = name;
                dao.transaction([
                    checkCategoryTask,
                    createTextTask,
                    createAttachmentTaskInTransaction(attachFileObject, req.user.id),
                    createArticleTask
                ], function(err, article) {
                    if (err) {
                        return next(err);
                    }
                    article.dataValues.content = content;
                    return res.send(article);
                });
            });
        }
        else {
            dao.transaction([
                checkCategoryTask,
                createTextTask,
                function(prev, tx, callback) {
                    callback(null, null);
                },
                createArticleTask
            ], function(err, article) {
                if (err) {
                    return next(err);
                }
                article.dataValues.content = content;
                return res.send(article);
            });
        }
    }
}
