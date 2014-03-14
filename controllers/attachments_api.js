// attachments.js

var
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    constants = require('../constants'),
    utils = require('./_utils');

var
    User = db.user,
    Attachment = db.attachment,
    sequelize = db.sequelize,
    next_id = db.next_id;

exports = module.exports = {

    'POST /api/attachments': function(req, res, next) {
        /**
         * Create a new attachment.
         * 
         * @return {object} The created attachment object.
         */
        if ( ! req.user || req.user.role > ROLE_CONTRIBUTOR) {
            return res.send(api.notallowed('Permission denied.'));
        }

        var name = req.body.name.trim();
        var description = req.body.description.trim();

        var category_id = req.body.category_id;

        var content = req.body.content;
        var tags = req.body.tags;
        var publish_time = Date.now(); //req.body.publish_time;

        var cover_id = '';
        var article_id = next_id();

        var tasks = {
            category: function(callback) {
                utils.get_category(category_id, function(obj) {
                    callback(null, obj);
                });
            },
            text: function(callback) {
                utils.create_object(Text, { ref_id: article_id, value: content }, tx, function(err, obj) {
                    callback(err, obj);
                });
            },
            article: function(callback) {
                utils.create_object(Article, {
                    id: article_id,
                    user_id: req.user.id,
                    category_id: category_id,
                    cover_id: cover_id,
                    name: name,
                    description: description,
                    publish_time: publish_time
                }, tx, function(err, obj) {
                    callback(err, obj);
                });
            }
        };
        if (cover_id) {
            // TODO: add create cover task:
        }
        sequelize.transaction(function(tx) {
            async.series([
                function(callback) {
                    //
                }
            ], function(err, results) {
                if (err) {
                    return tx.rollback().success(function() {
                        return next(err);
                    });
                }
                tx.commit().error(function(err) {
                    return res.send(api.server_error(err));
                }).success(function() {
                    return res.send(results.article);
                });
            });
        });
    },

}
