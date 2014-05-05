// home.js

var
    _ = require('lodash'),
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    config = require('../config'),
    cache = require('../cache'),
    constants = require('../constants'),
    utils = require('./_utils');

var signins = _.map(config.oauth2, function(value, key) {
    return key;
});

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    warp = db.warp;

var
    articleApi = require('./articleApi'),
    categoryApi = require('./categoryApi'),
    wikiApi = require('./wikiApi'),
    commentApi = require('./commentApi'),
    pageApi = require('./pageApi'),
    userApi = require('./userApi'),
    navigationApi = require('./navigationApi'),
    settingApi = require('./settingApi');

var fnGetSettings = function(callback) {
    settingApi.getSettingsByDefaults('website', settingApi.defaultSettings.website, callback);
};

var fnGetNavigations = function(callback) {
    navigationApi.getNavigations(callback);
};

function appendRead(article, callback) {
    //
}

function appendReads(articles, callback) {
    //
}

function appendSettings(callback) {
    cache.get(constants.CACHE_KEY_WEBSITE_SETTINGS, fnGetSettings, function(err, r) {
        if (err) {
            return callback(err);
        }
        callback(null, r);
    });
}

function appendNavigations(callback) {
    cache.get(constants.CACHE_KEY_WEBSITE_NAVIGATIONS, fnGetNavigations, function(err, r) {
        if (err) {
            return callback(err);
        }
        callback(null, r);
    });
}

function processTheme(view, model, req, res, next) {
    async.parallel({
        website: appendSettings,
        navigations: appendNavigations,
    }, function(err, results) {
        model.__website__ = results.website;
        model.__navigations__ = results.navigations;
        model.__signins__ = signins;
        model.__user__ = req.user;
        model.__time__ = Date.now();
        model.__request__ = {
            host: req.host
        };
        return res.render(res.themePath + view, model);
    });
}

function formatComment(s) {
    return s.replace(/\n+/g, '\n').replace(/\<\/?script\>/ig, '');
}

function createCommentByType(ref_type, checkFunction, req, res, next) {
    if (utils.isForbidden(req, constants.ROLE_GUEST)) {
        return next(api.notAllowed('Permission denied.'));
    }
    try {
        var content = formatComment(utils.getRequiredParam('content', req)).trim();
        if ( ! content) {
            return next(api.invalidParam('content', 'Content cannot be empty.'));
        }
    }
    catch (e) {
        return next(e);
    }
    var ref_id = req.params.id;
    checkFunction(ref_id, function(err, entity) {
        if (err) {
            return next(err);
        }
        commentApi.createComment(ref_type, ref_id, req.user, content, function(err, comment) {
            return res.send(comment);
        });
    });
}

exports = module.exports = {

    'GET /': function(req, res, next) {
        var model = {};
        async.waterfall([
            function(callback) {
                categoryApi.getCategories(callback);
            },
            function(categories, callback) {
                model.getCategoryName = function(cid) {
                    var c;
                    for (var i=0; i<categories.length; i++) {
                        c = categories[i];
                        if (c.id===cid) {
                            return c.name;
                        }
                    }
                    return '';
                };
                articleApi.getRecentArticles(20, callback);
            },
            function(articles, callback) {
                cache.counts(_.map(articles, function(a) {
                    return a.id;
                }), function(err, nums) {
                    if (err) {
                        return callback(err);
                    }
                    for (var i=0; i<articles.length; i++) {
                        articles[i].reads = nums[i];
                    }
                    callback(null, articles);
                });
            }
        ], function(err, articles) {
            if (err) {
                return next(err);
            }
            model.articles = articles;
            return processTheme('index.html', model, req, res, next);
        });
    },

    'GET /category/:id': function(req, res, next) {
        var page = utils.getPage(req);
        var model = {};
        async.waterfall([
            function(callback) {
                categoryApi.getCategory(req.params.id, callback);
            },
            function(category, callback) {
                model.category = category;
                articleApi.getArticlesByCategory(page, category.id, callback);
            },
            function(r, callback) {
                cache.counts(_.map(r.articles, function(a) {
                    return a.id;
                }), function(err, nums) {
                    if (err) {
                        return callback(err);
                    }
                    for (var i=0; i<nums.length; i++) {
                        r.articles[i].reads = nums[i];
                    }
                    callback(null, r);
                });
            }
        ], function(err, r) {
            if (err) {
                return next(err);
            }
            model.articles = r.articles;
            model.page = r.page;
            return processTheme('article/category.html', model, req, res, next);
        });
    },

    'GET /article/:id': function(req, res, next) {
        var model = {};
        async.waterfall([
            function(callback) {
                articleApi.getArticle(req.params.id, callback);
            },
            function(article, callback) {
                cache.incr(article.id, function(err, num) {
                    if (err) {
                        return callback(err);
                    }
                    article.reads = num;
                    callback(null, article);
                });
            },
            function(article, callback) {
                model.article = article;
                categoryApi.getCategory(article.category_id, callback);
            },
            function(category, callback) {
                model.category = category;
                commentApi.getCommentsByRef(model.article.id, callback);
            }
        ], function(err, r) {
            if (err) {
                return next(err);
            }
            model.article.html_content = utils.md2html(model.article.content);
            model.comments = r.comments;
            model.nextCommentId = r.nextCommentId;
            return processTheme('article/article.html', model, req, res, next);
        });
    },

    'GET /page/:alias': function(req, res, next) {
        pageApi.getPageByAlias(req.params.alias, function(err, page) {
            if (err) {
                return next(err);
            }
            if (page.draft) {
                return res.send(404);
            }
            page.html_content = utils.md2html(page.content);
            var model = {
                page: page
            };
            return processTheme('page/page.html', model, req, res, next);
        });
    },

    'GET /wiki/:id': function(req, res, next) {
        var model = {};
        async.waterfall([
            function(callback) {
                wikiApi.getWikiWithContent(req.params.id, callback);
            },
            function(wiki, callback) {
                cache.incr(wiki.id, function(err, num) {
                    if (err) {
                        return callback(err);
                    }
                    wiki.reads = num;
                    callback(null, wiki);
                });
            },
            function(wiki, callback) {
                model.wiki = wiki;
                wikiApi.getWikiTree(wiki.id, true, callback);
            },
            function(tree, callback) {
                model.tree = tree.children;
                commentApi.getCommentsByRef(model.wiki.id, callback);
            }
        ], function(err, r) {
            if (err) {
                return next(err);
            }
            model.html_content = utils.md2html(model.wiki.content);
            model.comments = r.comments;
            return processTheme('wiki/wiki.html', model, req, res, next);
        });
    },

    'GET /wiki/:wid/:pid': function(req, res, next) {
        var model = {};
        async.waterfall([
            function(callback) {
                wikiApi.getWikiPageWithContent(req.params.pid, callback);
            },
            function(page, callback) {
                cache.incr(page.id, function(err, num) {
                    if (err) {
                        return callback(err);
                    }
                    page.reads = num;
                    callback(null, page);
                });
            },
            function(page, callback) {
                if (page.wiki_id!==req.params.wid) {
                    return callback(api.notFound('Wiki'));
                }
                model.page = page;
                wikiApi.getWikiTree(page.wiki_id, true, callback);
            },
            function(wiki, callback) {
                model.wiki = wiki;
                model.tree = wiki.children;
                commentApi.getCommentsByRef(model.page.id, callback);
            }
        ], function(err, r) {
            if (err) {
                return next(err);
            }
            model.html_content = utils.md2html(model.page.content);
            model.comments = r.comments;
            return processTheme('wiki/wiki.html', model, req, res, next);
        });
    },

    'POST /article/:id/comment': function(req, res, next) {
        createCommentByType('article', function(id, callback) {
            articleApi.getArticle(id, callback);
        }, req, res, next);
    },

    'POST /wiki/:id/comment': function(req, res, next) {
        createCommentByType('wiki', function(id, callback) {
            wikiApi.getWiki(id, callback);
        }, req, res, next);
    },

    'POST /wikipage/:id/comment': function(req, res, next) {
        createCommentByType('wikipage', function(id, callback) {
            wikiApi.getWikiPage(id, callback);
        }, req, res, next);
    }
};
