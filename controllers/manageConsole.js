// manage.js

var
    async = require('async');

var
    api = require('../api'),
    db = require('../db'),
    utils = require('./_utils');

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    warp = db.warp;

var
    categoryApi = require('./categoryApi'),
    articleApi = require('./articleApi');

// do management console

exports = module.exports = {

    'GET /manage/': function(req, res, next) {
        return res.render('manage/overview/overview.html', {});
    },

    'GET /manage/article/(index)?': function(req, res, next) {
        var page = utils.getPage(req);
        async.parallel({
            articles: function(callback) {
                articleApi.getArticles(page, true, callback);
            },
            categories: function(callback) {
                categoryApi.getCategories(callback);
            }
        }, function(err, results) {
            if (err) {
                return next(err);
            }
            return res.manage('manage/article/article_list.html', {
                page: JSON.stringify(results.articles.page),
                articles: JSON.stringify(results.articles.articles),
                categories: JSON.stringify(results.categories)
            });
        });
    },

    'GET /manage/article/create_article': function(req, res, next) {
        categoryApi.getCategories(function(err, categories) {
            if (err) {
                return next(err);
            }
            return res.manage('manage/article/article_form.html', {
                form: {
                    name: 'Create Article',
                    action: '/api/articles/',
                    redirect: '/manage/article/'
                },
                categories: JSON.stringify(categories),
                article: {}
            });
        });
    },

    'GET /manage/article/edit_article': function(req, res, next) {
        async.parallel({
            article: function(callback) {
                articleApi.getArticle(req.query.id, function(err, article) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, article);
                });
            },
            categories: function(callback) {
                categoryApi.getCategories(callback);
            }
        }, function(err, results) {
            if (err) {
                return next(err);
            }
            var article = results.article;
            return res.manage('manage/article/article_form.html', {
                form: {
                    name: 'Edit Article',
                    action: '/api/articles/' + article.id,
                    redirect: '/manage/article/'
                },
                categories: JSON.stringify(results.categories),
                article: article
            });
        });
    },

    'GET /manage/article/category_list': function(req, res, next) {
        categoryApi.getCategories(function(err, categories) {
            if (err) {
                return next(err);
            }
            return res.manage('manage/article/category_list.html', {
                categories: JSON.stringify(categories)
            });
        });
    },

    'GET /manage/article/create_category': function(req, res, next) {
        return res.manage('manage/article/category_form.html', {
            form: {
                name: 'Create Category',
                action: '/api/categories/',
                redirect: '/manage/article/category_list'
            },
            category: {}
        });
    },

    'GET /manage/article/edit_category': function(req, res, next) {
        categoryApi.getCategory(req.query.id, function(err, obj) {
            if (err) {
                return next(err);
            }
            if (obj===null) {
                return next(api.notFound('Category'));
            }
            return res.manage('manage/article/category_form.html', {
                form: {
                    name: 'Edit Category',
                    action: '/api/categories/' + obj.id + '/',
                    redirect: '/manage/article/category_list'
                },
                category: obj
            });
        });
    },

    'GET /api/users/:id': function(req, res, next) {
        /**
         * Get user by id.
         * 
         * @param {string} :id - The id of the user.
         * @return {object} User object.
         */
        User.find(req.params.id)
            .error(function(err) {
                return res.send(api.error(err));
            })
            .success(function(user) {
                if ( ! user) {
                    return res.send(api.notfound('user', 'User not found.'));
                }
                user.passwd = '******';
                return res.send(user);
            });
    },

    'POST /api/users/:id': function(req, res, next) {
        /**
         * Update user.
         * 
         * @param {string} :id - The id of the user.
         * @param {string,optional} name - The new name of the user.
         * @return {object} User object.
         */
        User.find(req.params.id)
            .error(function(err) {
                return res.send(api.error(err));
            })
            .success(function(user) {
                if ( ! user) {
                    return res.send(api.notfound('user', 'User not found.'));
                }
                // update user's properties:
                user.passwd = '******';
                var attrs = ['updated_at', 'version'];
                if ('name' in req.body) {
                    user.name = req.body.name.trim();
                    attrs.push('name');
                }
                if (attrs.length > 0) {
                    user.save(attrs).success(function() {
                        res.send(user);
                    })
                    .error(function(err) {
                        res.send(api.error(err));
                    });
                }
                else {
                    res.send(user);
                }
            });
    }

}
