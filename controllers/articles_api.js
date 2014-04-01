// articles.js

var
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    utils = require('./_utils'),
    images = require('./_images'),
    constants = require('../constants');

var
    attachmentsApi = require('./attachments_api'),
    checkAttachment = attachmentsApi.checkAttachment,
    createAttachmentTaskInTx = attachmentsApi.createAttachmentTaskInTx;

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    warp = db.warp,
    next_id = db.next_id;

function getArticles(page, allArticles, callback) {
    var now = Date.now();
    var countOptions = allArticles ? 'count(*)' : {
        select: 'count(*)',
        where: 'publish_time<?',
        params: [now]
    };
    Article.findNumber(countOptions, function(err, num) {
        if (err) {
            return callback(err);
        }
        page.totalItems = num;
        if (page.isEmpty) {
            return callback(null, { page: page, articles: [] });
        }
        var findOptions = {
            offset: page.offset,
            limit: page.limit,
            order: 'publish_time desc'
        };
        if (! allArticles) {
            findOptions.where = 'publish_time<?';
            findOptions.params = [now];
        }
        Article.findAll(findOptions, function(err, entities) {
            if (err) {
                return callback(err);
            }
            return callback(null, {
                page: page,
                articles: entities
            });
        });
    });
}

exports = module.exports = {

    getArticles: getArticles,

    'GET /api/articles/:id': function(req, res, next) {
        Article.find(req.params.id, function(err, article) {
            if (err) {
                return next(err);
            }
            if (article===null) {
                return next(api.not_found('Article'));
            }
            Text.find(article.content_id, function(err, text) {
                if (err) {
                    return next(err);
                }
                if (text===null) {
                    return next(api.not_found('Text'));
                }
                article.content = text.value;
                return res.send(article);
            });
        });
    },

    'GET /api/articles': function(req, res, next) {
        var page = utils.getPage(req);
        getArticles(page, false, function(err, articles) {
            if (err) {
                return next(err);
            }
            return res.send(articles);
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

        var file = req.files && req.files.file;

        //var spt = utils.get_param('publish_time', '', req);
        //parse datetime
        var publish_time = Date.now();

        var content_id = next_id();
        var article_id = next_id();

        var fnCreate = function(fileObject) {
            warp.transaction(function(err, tx) {
                if (err) {
                    return next(err);
                }
                async.waterfall([
                    // check category:
                    function(callback) {
                        Category.find(category_id, tx, callback);
                    },
                    // create text:
                    function(category, callback) {
                        if (category===null) {
                            return callback(api.invalid_param('category_id'));
                        }
                        Text.create({
                            id: content_id,
                            ref_id: article_id,
                            value: content
                        }, tx, callback);
                    },
                    // create attachment:
                    function(text, callback) {
                        if (fileObject) {
                            var fn = createAttachmentTaskInTx(fileObject, tx, req.user.id);
                            return fn(callback);
                        }
                        callback(null, null);
                    },
                    // create article:
                    function(atta, callback) {
                        Article.create({
                            id: article_id,
                            user_id: req.user.id,
                            user_name: req.user.name,
                            category_id: category_id,
                            cover_id: atta===null ? '' : atta.id,
                            content_id: content_id,
                            name: name,
                            tags: tags,
                            description: description,
                            publish_time: publish_time
                        }, tx, callback);
                    }
                ], function(err, result) {
                    tx.done(err, function(err) {
                        if (err) {
                            return next(err);
                        }
                        result.content = content;
                        return res.send(result);
                    });
                });
            });
        };

        if (file) {
            return checkAttachment(file, function(err, attachFileObject) {
                if (err) {
                    return next(err);
                }
                if (! attachFileObject.isImage) {
                    return next(api.invalid_param('file', 'Invalid image file.'));
                }
                // override name:
                attachFileObject.name = name;
                fnCreate(attachFileObject);
            });
        }
        return fnCreate(null);
    }
}
