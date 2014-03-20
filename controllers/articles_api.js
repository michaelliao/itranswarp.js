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
        utils.find(Article, req.params.id, function(err, entity) {
            return err ? next(err) : res.send(entity);
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

        var cover = req.files.file;

        var publish_time = Date.now(); //req.body.publish_time;

        var content_id = next_id();
        var article_id = next_id();

        sequelize.transaction(function(tx) {
            async.series({
                category: function(callback) {
                    utils.find(Category, category_id, callback);
                },
                cover: function(callback) {
                    if (cover) {
                        // check if cover exist:
                    }
                    callback(null, 'ok');
                },
                text: function(callback) {
                    utils.save(Text, {
                        id: content_id,
                        ref_id: article_id,
                        value: content
                    }, tx, callback);
                },
                article: function(callback) {
                    utils.save(Article, {
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
    }
}
