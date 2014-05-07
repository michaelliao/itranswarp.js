// article api

var
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    utils = require('./_utils'),
    images = require('./_images'),
    constants = require('../constants');

var
    commentApi = require('./commentApi'),
    attachmentApi = require('./attachmentApi'),
    checkAttachment = attachmentApi.checkAttachment,
    createAttachmentTaskInTx = attachmentApi.createAttachmentTaskInTx;

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    warp = db.warp,
    next_id = db.next_id;

function getRecentArticles(max, callback) {
    var now = Date.now();
    Article.findAll({
        where: 'publish_at<?',
        order: 'publish_at desc',
        params: [now],
        offset: 0,
        limit: max
    }, function (err, entities) {
        if (err) {
            return callback(err);
        }
        return callback(null, entities);
    });
}

function doGetArticles(page, countOptions, findOptions, callback) {
    Article.findNumber(countOptions, function (err, num) {
        if (err) {
            return callback(err);
        }
        page.totalItems = num;
        if (page.isEmpty) {
            return callback(null, { page: page, articles: [] });
        }
        findOptions.offset = page.offset;
        findOptions.limit = page.limit;
        Article.findAll(findOptions, function (err, entities) {
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

function getAllArticles(page, callback) {
    var
        countOptions = 'count(*)',
        findOptions = {
            order: 'publish_at desc'
        };
    doGetArticles(page, countOptions, findOptions, callback);
}

function getArticlesByCategory(page, categoryId, callback) {
    var
        now = Date.now(),
        countOptions = {
            select: 'count(*)',
            where: 'publish_at<? and category_id=?',
            params: [now, categoryId]
        },
        findOptions = {
            order: 'publish_at desc',
            where: 'publish_at<? and category_id=?',
            params: [now, categoryId]
        };
    doGetArticles(page, countOptions, findOptions, callback);
}

function getArticles(page, callback) {
    var
        now = Date.now(),
        countOptions = {
            select: 'count(*)',
            where: 'publish_at<?',
            params: [now]
        },
        findOptions = {
            where: 'publish_at<?',
            params: [now]
        };
    doGetArticles(page, countOptions, findOptions, callback);
}

function getArticle(id, tx, callback) {
    if (arguments.length === 2) {
        callback = tx;
        tx = undefined;
    }
    Article.find(id, function (err, article) {
        if (err) {
            return callback(err);
        }
        if (article === null) {
            return callback(api.notFound('Article'));
        }
        Text.find(article.content_id, function (err, text) {
            if (err) {
                return callback(err);
            }
            if (text === null) {
                return callback(api.notFound('Text'));
            }
            article.content = text.value;
            callback(null, article);
        });
    });
}

var RE_TIMESTAMP = /^\-?[0-9]{1,13}$/;

module.exports = {

    getRecentArticles: getRecentArticles,

    getArticlesByCategory: getArticlesByCategory,

    getAllArticles: getAllArticles,

    getArticles: getArticles,

    getArticle: getArticle,

    'GET /api/articles/:id': function (req, res, next) {
        /**
         * Get article.
         * 
         * @name Get Article
         * @param {string} id: Id of the article.
         * @param {string} format: Return html if format is 'html', default to raw.
         * @return {object} Article object.
         * @error {resource:notfound} Article was not found by id.
         */
        getArticle(req.params.id, function (err, article) {
            if (err) {
                return next(err);
            }
            if (req.query.format === 'html') {
                article.content = utils.md2html(article.content);
            }
            return res.send(article);
        });
    },

    'GET /api/articles': function (req, res, next) {
        /**
         * Get articles by page.
         * 
         * @name Get Articles
         * @param {number} [page=1]: The page number, starts from 1.
         * @return {object} Article objects and page information.
         */
        var page = utils.getPage(req);
        getArticles(page, function (err, r) {
            if (err) {
                return next(err);
            }
            return res.send(r);
        });
    },

    'POST /api/articles': function (req, res, next) {
        /**
         * Create a new article.
         * 
         * @name Create Article
         * @param {string} category_id: Id of the category that article belongs to.
         * @param {string} name: Name of the article.
         * @param {string} description: Description of the article.
         * @param {string} content: Content of the article.
         * @param {string} [tags]: Tags of the article, seperated by ','.
         * @param {string} [publish_at]: Publish time of the article with format 'yyyy-MM-dd HH:mm:ss', default to current time.
         * @param {file} [file]: File to upload as cover image.
         * @return {object} The created article object.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        if (utils.isForbidden(req, constants.ROLE_EDITOR)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var name, description, category_id, content, tags, publish_at, file, content_id, article_id, fnCreate;
        try {
            name = utils.getRequiredParam('name', req);
            description = utils.getRequiredParam('description', req);
            category_id = utils.getRequiredParam('category_id', req);
            content = utils.getRequiredParam('content', req);
        } catch (e) {
            return next(e);
        }
        tags = utils.formatTags(utils.getParam('tags', '', req));
        publish_at = utils.getParam('publish_at', null, req);
        file = req.files && req.files.file;

        if (publish_at !== null) {
            if (!RE_TIMESTAMP.test(publish_at)) {
                return next(api.invalidParam('publish_at'));
            }
            publish_at = parseInt(publish_at, 10);
        } else {
            publish_at = Date.now();
        }

        content_id = next_id();
        article_id = next_id();

        fnCreate = function (fileObject) {
            warp.transaction(function (err, tx) {
                if (err) {
                    return next(err);
                }
                async.waterfall([
                    // check category:
                    function (callback) {
                        Category.find(category_id, tx, callback);
                    },
                    // create text:
                    function (category, callback) {
                        if (category === null) {
                            return callback(api.invalidParam('category_id'));
                        }
                        Text.create({
                            id: content_id,
                            ref_id: article_id,
                            value: content
                        }, tx, callback);
                    },
                    // create attachment:
                    function (text, callback) {
                        if (fileObject) {
                            var fn = createAttachmentTaskInTx(fileObject, tx, req.user.id);
                            return fn(callback);
                        }
                        callback(null, null);
                    },
                    // create article:
                    function (atta, callback) {
                        Article.create({
                            id: article_id,
                            user_id: req.user.id,
                            user_name: req.user.name,
                            category_id: category_id,
                            cover_id: atta === null ? '' : atta.id,
                            content_id: content_id,
                            name: name,
                            tags: tags,
                            description: description,
                            publish_at: publish_at
                        }, tx, callback);
                    }
                ], function (err, result) {
                    tx.done(err, function (err) {
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
            return checkAttachment(file, true, function (err, attachFileObject) {
                if (err) {
                    return next(err);
                }
                // override name:
                attachFileObject.name = name;
                fnCreate(attachFileObject);
            });
        }
        return fnCreate(null);
    },

    'POST /api/articles/:id': function (req, res, next) {
        /**
         * Update an exist article.
         * 
         * @name Update Article
         * @param {string} id: Id of the article.
         * @param {string} [category_id]: Id of the category that article belongs to.
         * @param {string} [name]: Name of the article.
         * @param {string} [description]: Description of the article.
         * @param {string} [content]: Content of the article.
         * @param {string} [tags]: Tags of the article, seperated by ','.
         * @param {string} [publish_at]: Publish time of the article with format 'yyyy-MM-dd HH:mm:ss'.
         * @return {object} The updated article object.
         * @error {resource:notfound} Article was not found by id.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        if (utils.isForbidden(req, constants.ROLE_EDITOR)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var name = utils.getParam('name', req),
            category_id = utils.getParam('category_id', req),
            description = utils.getParam('description', req),
            tags = utils.getParam('tags', req),
            publish_at = utils.getParam('publish_at', req),
            content = utils.getParam('content', req),
            file,
            fnUpdate;

        if (name !== null && name === '') {
            return next(api.invalidParam('name'));
        }
        if (category_id !== null && category_id === '') {
            return next(api.invalidParam('category_id'));
        }
        if (content !== null && content === '') {
            return next(api.invalidParam('content'));
        }
        if (publish_at !== null) {
            if (!RE_TIMESTAMP.test(publish_at)) {
                return next(api.invalidParam('publish_at'));
            }
            publish_at = parseInt(publish_at, 10);
        }
        if (tags !== null) {
            tags = utils.formatTags(tags);
        }

        file = req.files && req.files.file;

        fnUpdate = function (fileObject) {
            warp.transaction(function (err, tx) {
                if (err) {
                    return next(err);
                }
                async.waterfall([
                    // query article:
                    function (callback) {
                        Article.find(req.params.id, tx, callback);
                    },
                    // update category?
                    function (article, callback) {
                        if (article === null) {
                            return callback(api.notFound('Article'));
                        }
                        if (req.user.role !== constants.ROLE_ADMIN && req.user.id !== article.user_id) {
                            return next(api.notAllowed('Permission denied.'));
                        }
                        if (category_id === null || category_id === article.category_id) {
                            return callback(null, article);
                        }
                        Category.find(category_id, tx, function (err, category) {
                            if (err) {
                                return callback(err);
                            }
                            if (category === null) {
                                return callback(api.invalidParam('category_id'));
                            }
                            article.category_id = category_id;
                            callback(null, article);
                        });
                    },
                    // update text?
                    function (article, callback) {
                        if (content === null) {
                            return callback(null, article);
                        }
                        var content_id = next_id();
                        Text.create({
                            id: content_id,
                            ref_id: article.id,
                            value: content
                        }, tx, function (err, text) {
                            if (err) {
                                return callback(err);
                            }
                            article.content_id = content_id;
                            callback(null, article);
                        });
                    },
                    // update cover?
                    function (article, callback) {
                        if (fileObject) {
                            var fn = createAttachmentTaskInTx(fileObject, tx, req.user.id);
                            return fn(function (err, atta) {
                                if (err) {
                                    return callback(err);
                                }
                                article.cover_id = atta.id;
                                callback(null, article);
                            });
                        }
                        callback(null, article);
                    },
                    // update article:
                    function (article, callback) {
                        if (name !== null) {
                            article.name = name;
                        }
                        if (description !== null) {
                            article.description = description;
                        }
                        if (tags !== null) {
                            article.tags = tags;
                        }
                        if (publish_at !== null) {
                            article.publish_at = publish_at;
                        }
                        article.update(tx, callback);
                    }
                ], function (err, result) {
                    tx.done(err, function (err) {
                        if (err) {
                            return next(err);
                        }
                        if (content !== null) {
                            result.content = content;
                            return res.send(result);
                        }
                        Text.find(result.content_id, function (err, text) {
                            if (err) {
                                return next(err);
                            }
                            result.content = text.value;
                            return res.send(result);
                        });
                    });
                });
            });
        };

        if (file) {
            return checkAttachment(file, true, function (err, attachFileObject) {
                if (err) {
                    return next(err);
                }
                // override name:
                attachFileObject.name = name;
                fnUpdate(attachFileObject);
            });
        }
        return fnUpdate(null);
    },

    'POST /api/articles/:id/comments': function (req, res, next) {
        /**
         * Create a comment on an article.
         * 
         * @name Comment Article
         * @param {string} id: Id of the article.
         * @param {string} [content]: Content of the comment.
         * @return {object} The comment object.
         * @error {resource:notfound} Article was not found by id.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        if (utils.isForbidden(req, constants.ROLE_SUBSCRIBER)) {
            return next(api.notAllowed('Permission denied.'));
        }
        var content;
        try {
            content = utils.getRequiredParam('content', req);
        } catch (e) {
            return next(e);
        }
        Article.find(req.params.id, function (err, article) {
            if (err) {
                return next(err);
            }
            commentApi.createComment('article', article.id, req.user, content, function (err, c) {
                if (err) {
                    return next(err);
                }
                return res.send(c);
            });
        });
    },

    'POST /api/articles/:id/delete': function (req, res, next) {
        /**
         * Delete an article.
         * 
         * @name Delete Article
         * @param {string} id: Id of the article.
         * @return {object} Object contains deleted id.
         * @error {resource:notfound} Article not found by id.
         * @error {permission:denied} If current user has no permission.
         */
        if (utils.isForbidden(req, constants.ROLE_EDITOR)) {
            return next(api.notAllowed('Permission denied.'));
        }
        warp.transaction(function (err, tx) {
            if (err) {
                return next(err);
            }
            async.waterfall([
                function (callback) {
                    Article.find(req.params.id, tx, callback);
                },
                function (article, callback) {
                    if (article === null) {
                        return callback(api.notFound('Article'));
                    }
                    if (req.user.role !== constants.ROLE_ADMIN && req.user.id !== article.user_id) {
                        return next(api.notAllowed('Permission denied.'));
                    }
                    article.destroy(tx, callback);
                },
                function (r, callback) {
                    // delete all texts:
                    warp.update('delete from texts where ref_id=?', [req.params.id], tx, callback);
                }
            ], function (err, result) {
                tx.done(err, function (err) {
                    if (err) {
                        return next(err);
                    }
                    res.send({ id: req.params.id });
                });
            });
        });
    }
};
