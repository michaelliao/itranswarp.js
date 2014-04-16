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
    articleApi = require('./articleApi'),
    pageApi = require('./pageApi'),
    wikiApi = require('./wikiApi'),
    attachmentApi = require('./attachmentApi');

// do management console

exports = module.exports = {

    'GET /manage/': function(req, res, next) {
        return res.render('manage/overview/overview.html', {});
    },

    // article ////////////////////////////////////////////////////////////////

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
            article.safe_content = JSON.stringify(article.content).replace(/script/g, 'scr\" + \"ipt');
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

    // page ///////////////////////////////////////////////////////////////////

    'GET /manage/page/(index)?': function(req, res, next) {
        pageApi.getPages(function(err, pages) {
            if (err) {
                return next(err);
            }
            return res.manage('manage/page/page_list.html', {
                pages: JSON.stringify(pages)
            });
        });
    },

    'GET /manage/page/create_page': function(req, res, next) {
        return res.manage('manage/page/page_form.html', {
            form: {
                name: 'Create Page',
                action: '/api/pages/',
                redirect: '/manage/page/'
            },
            page: {
                tags: '',
                name: '',
                alias: '',
                draft: false,
                content: '',
            }
        });
    },

    'GET /manage/page/edit_page': function(req, res, next) {
        var id = req.query.id;
        pageApi.getPage(id, function(err, page) {
            if (err) {
                return next(err);
            }
            page.safe_content = JSON.stringify(page.content).replace(/script/g, 'scr\" + \"ipt');
            return res.manage('manage/page/page_form.html', {
                form: {
                    name: 'Edit Page',
                    action: '/api/pages/' + id,
                    redirect: '/manage/page/'
                },
                page: page
            });
        });
    },

    // wiki ///////////////////////////////////////////////////////////////////

    'GET /manage/wiki/(index)?': function(req, res, next) {
        wikiApi.getWikis(function(err, wikis) {
            if (err) {
                return next(err);
            }
            return res.manage('manage/wiki/wiki_list.html', {
                wikis: JSON.stringify(wikis)
            });
        });
    },

    'GET /manage/wiki/create_wiki': function(req, res, next) {
        return res.manage('manage/wiki/wiki_form.html', {
            form: {
                name: 'Create Wiki',
                action: '/api/wikis/',
                redirect: '/manage/wiki/'
            },
            wiki: {}
        });
    },

    'GET /manage/wiki/list_wiki': function(req, res, next) {
        var id = req.query.id;
        wikiApi.getWiki(id, function(err, wiki) {
            return res.manage('manage/wiki/wiki_tree.html', {
                wiki: wiki
            });
        });
    },

    'GET /manage/wiki/edit_wiki': function(req, res, next) {
        var id = req.query.id;
        wikiApi.getWikiWithContent(id, function(err, wiki) {
            if (err) {
                return next(err);
            }
            wiki.safe_content = JSON.stringify(wiki.content).replace(/script/g, 'scr\" + \"ipt');
            return res.manage('manage/wiki/wiki_form.html', {
                form: {
                    name: 'Edit Wiki',
                    action: '/api/wikis/' + id + '/',
                    redirect: '/manage/wiki/list_wiki?id=' + id
                },
                wiki: wiki
            });
        });
    },

    'GET /manage/wiki/edit_wikipage': function(req, res, next) {
        var id = req.query.id;
        var wikipage = null;
        async.waterfall([
            function(callback) {
                wikiApi.getWikiPageWithContent(id, callback);
            },
            function(wp, callback) {
                wikipage = wp;
                wikiApi.getWiki(wp.wiki_id, callback);
            }
        ], function(err, wiki) {
            if (err) {
                return next(err);
            }
            wikipage.safe_content = JSON.stringify(wikipage.content).replace(/script/g, 'scr\" + \"ipt');
            return res.manage('manage/wiki/wikipage_form.html', {
                form: {
                    name: 'Edit Wiki Page',
                    action: '/api/wikis/wikipages/' + id + '/',
                    redirect: '/manage/wiki/list_wiki?id=' + wiki.id
                },
                wikipage: wikipage,
                wiki: wiki
            });
        });
    },

    // attachment /////////////////////////////////////////////////////////////

    'GET /manage/attachment/(index)?': function(req, res, next) {
        var page = utils.getPage(req);
        attachmentApi.getAttachments(page, function(err, results) {
            if (err) {
                return next(err);
            }
            return res.manage('manage/attachment/attachment_list.html', {
                page: JSON.stringify(results.page),
                attachments: JSON.stringify(results.attachments)
            });
        });
    },


    // FIXME //////////////////////////////////////////////////////////////////

    'GET /api/users/:id': function(req, res, next) {
        /**
         * Get user by id.
         * 
         * @param {string} :id - The id of the user.
         * @return {object} User object.
         */
        return res.send('');
    },

    'POST /api/users/:id': function(req, res, next) {
        /**
         * Update user.
         * 
         * @param {string} :id - The id of the user.
         * @param {string,optional} name - The new name of the user.
         * @return {object} User object.
         */
        return res.send('');
    }

}
