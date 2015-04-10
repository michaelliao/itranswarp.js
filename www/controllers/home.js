'use strict';

// home.js

var
    _ = require('lodash'),
    api = require('../api'),
    db = require('../db'),
    auth = require('../auth'),
    config = require('../config'),
    cache = require('../cache'),
    helper = require('../helper'),
    constants = require('../constants'),
    searchEngine = require('../search/search').engine,
    json_schema = require('../json_schema');

var signins = _.map(config.oauth2, function (value, key) {
    return key;
});

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    warp = db.warp;

var
    userApi = require('./userApi'),
    wikiApi = require('./wikiApi'),
    settingApi = require('./settingApi'),
    discussApi = require('./discussApi'),
    webpageApi = require('./webpageApi'),
    articleApi = require('./articleApi'),
    categoryApi = require('./categoryApi'),
    navigationApi = require('./navigationApi');

var
    searchTypes = [
        {
            label: 'All',
            value: ''
        },
        {
            label: 'Article',
            value: 'article'
        },
        {
            label: 'Wiki',
            value: 'wiki'
        },
        {
            label: 'Discuss',
            value: 'discuss'
        }
    ],
    searchTypeValues = _.reduce(searchTypes, function (r, t) {
        r[t.value] = t.label;
        return r;
    }, {});

var isSyncComments = config.session.syncComments;

var fnGetSettings = function (callback) {
    settingApi.getSettingsByDefaults('website', settingApi.defaultSettings.website, callback);
};

var $getNavigations = function* () {
    return yield cache.$get(constants.cache.NAVIGATIONS, navigationApi.$getNavigations);
};

function createCommentByType(ref_type, checkFunction, req, res, next) {
    if (utils.isForbidden(req, constants.ROLE_GUEST)) {
        return next(api.notAllowed('Permission denied.'));
    }
    var content, ref_id;
    try {
        content = formatComment(utils.getRequiredParam('content', req)).trim();
        if (!content) {
            return next(api.invalidParam('content', 'Content cannot be empty.'));
        }
    } catch (e) {
        return next(e);
    }
    ref_id = req.params.id;
    checkFunction(ref_id, function (err, entity, path) {
        if (err) {
            return next(err);
        }
        commentApi.createComment(ref_type, ref_id, req.user, content, function (err, comment) {
            if (isSyncComments) {
                utils.sendToSNS(req.user, content, 'http://' + req.host + path);
            }
            return res.send(comment);
        });
    });
}

function getHotArticles(articles) {
    var arr = articles.slice(0).sort(function (a1, a2) {
        return a1.reads > a2.reads ? -1 : 1;
    });
    return arr.length > 3 ? arr.slice(0, 3) : arr;
}

var THEME = config.theme;
var KEY_WEBSITE = constants.cache.WEBSITE;

function* $getModel(model) {
    model.__navigations__ = yield $getNavigations();
    model.__website__ = yield settingApi.$getSettingsByDefaults(KEY_WEBSITE, settingApi.defaultSettings.website);
    return model;
}

function getView(view) {
    return 'themes/default/' + view;
}

module.exports = {

    'GET /': function* () {
        var
            i, model,
            categories = yield categoryApi.$getCategories(),
            articles = yield articleApi.$getRecentArticles(20),
            nums = yield cache.$counts(_.map(articles, function (a) {
                return a.id;
            })),
            getCategoryName = function (cid) {
                var c, i;
                for (i = 0; i < categories.length; i++) {
                    c = categories[i];
                    if (c.id === cid) {
                        return c.name;
                    }
                }
                return '';
            };
        for (i = 0; i < articles.length; i++) {
            articles[i].reads = nums[i];
        }
        model = {
            //
        };
        //    model.articles = articles;
        //    model.hotArticles = getHotArticles(articles);
        //    return processTheme('index.html', model, req, res, next);
        this.render(getView('index.html'), yield $getModel.apply(this, [model]));
    },

    'GET /category/:id': function* (id) {
        var
            page = helper.getPage(this.request, 10),
            model = {
                page: page,
                category: yield categoryApi.$getCategory(id),
                articles: yield articleApi.$getArticlesByCategory(id, page)
            },
            nums = yield cache.$counts(_.map(model.articles, function (a) {
                return a.id;
            })),
            i;
        for (i = 0; i < nums.length; i++) {
            model.articles[i].reads = nums[i];
        }
        this.render(getView('article/category.html'), yield $getModel.apply(this, [model]));
    },

    'GET /article/:id': function* (id) {
        var
            page = helper.getPage(this.request, 10),
            article = yield articleApi.$getArticle(id, true),
            num = yield cache.$incr(id),
            category = yield categoryApi.$getCategory(article.category_id),
            model = {
                page: page,
                article: article,
                category: category
            };
        article.reads = num;
        article.content = helper.md2html(article.content, true);
        this.render(getView('article/article.html'), yield $getModel.apply(this, [model]));
    },

    'GET /webpage/:alias': function* (alias) {
        var webpage = yield webpageApi.$getWebpageByAlias(alias);
        if (webpage.draft) {
            this.throw(404);
            return;
        }
        webpage.content = helper.md2html(webpage.content, true);
        this.render(getView('webpage/webpage.html'), yield $getModel.apply(this, [model]));
    },

    'GET /wikipage/:id': function (req, res, next) {
        wikiApi.getWikiPage(req.params.id, function (err, wp) {
            if (err) {
                return next(err);
            }
            res.redirect('/wiki/' + wp.wiki_id + '/' + wp.id);
        });
    },

    'GET /wiki/:id': function (req, res, next) {
        var model = {};
        async.waterfall([
            function (callback) {
                wikiApi.getWikiWithContent(req.params.id, callback);
            },
            function (wiki, callback) {
                cache.incr(wiki.id, function (err, num) {
                    if (err) {
                        return callback(err);
                    }
                    wiki.reads = num;
                    callback(null, wiki);
                });
            },
            function (wiki, callback) {
                model.wiki = wiki;
                wikiApi.getWikiTree(wiki.id, true, callback);
            },
            function (tree, callback) {
                model.tree = tree.children;
                commentApi.getCommentsByRef(model.wiki.id, callback);
            }
        ], function (err, r) {
            if (err) {
                return next(err);
            }
            model.html_content = utils.md2html(model.wiki.content);
            model.comments = r.comments;
            return processTheme('wiki/wiki.html', model, req, res, next);
        });
    },

    'GET /wiki/:wid/:pid': function (req, res, next) {
        var model = {};
        async.waterfall([
            function (callback) {
                wikiApi.getWikiPageWithContent(req.params.pid, callback);
            },
            function (page, callback) {
                cache.incr(page.id, function (err, num) {
                    if (err) {
                        return callback(err);
                    }
                    page.reads = num;
                    callback(null, page);
                });
            },
            function (page, callback) {
                if (page.wiki_id !== req.params.wid) {
                    return callback(api.notFound('Wiki'));
                }
                model.page = page;
                wikiApi.getWikiTree(page.wiki_id, true, callback);
            },
            function (wiki, callback) {
                model.wiki = wiki;
                model.tree = wiki.children;
                commentApi.getCommentsByRef(model.page.id, callback);
            }
        ], function (err, r) {
            if (err) {
                return next(err);
            }
            model.html_content = utils.md2html(model.page.content);
            model.comments = r.comments;
            return processTheme('wiki/wiki.html', model, req, res, next);
        });
    },

    'POST /article/:id/comment': function (req, res, next) {
        createCommentByType('article', function (id, callback) {
            articleApi.getArticle(id, function (err, article) {
                return callback(err, article, '/article/' + article.id);
            });
        }, req, res, next);
    },

    'POST /wiki/:id/comment': function (req, res, next) {
        createCommentByType('wiki', function (id, callback) {
            wikiApi.getWiki(id, function (err, wiki) {
                return callback(err, wiki, '/wiki/' + wiki.id);
            });
        }, req, res, next);
    },

    'POST /wikipage/:id/comment': function (req, res, next) {
        createCommentByType('wikipage', function (id, callback) {
            wikiApi.getWikiPage(id, function (err, wp) {
                return callback(err, wp, '/wiki/' + wp.wiki_id + '/' + wp.id);
            });
        }, req, res, next);
    },

    'GET /discuss': function (req, res, next) {
        discussApi.getBoards(function (err, boards) {
            if (err) {
                return next(err);
            }
            var model = {
                boards: boards
            };
            return processTheme('discuss/boards.html', model, req, res, next);
        });
    },

    'GET /discuss/:id': function (req, res, next) {
        var
            page = utils.getPage(req),
            model = {};
        async.waterfall([
            function (callback) {
                discussApi.getBoard(req.params.id, callback);
            },
            function (board, callback) {
                model.board = board;
                discussApi.getTopics(board.id, page, callback);
            },
            function (r, callback) {
                model.page = r.page;
                model.topics = r.topics;
                userApi.bindUsers(model.topics, callback);
            }
        ], function (err, r) {
            if (err) {
                return next(err);
            }
            return processTheme('discuss/board.html', model, req, res, next);
        });
    },

    'GET /discuss/:id/topics/create': function (req, res, next) {
        discussApi.getBoard(req.params.id, function (err, board) {
            if (err) {
                return next(err);
            }
            return processTheme('discuss/topic_form.html', { board: board }, req, res, next);
        });
    },

    'GET /discuss/:bid/:tid': function (req, res, next) {
        var
            board_id = req.params.bid,
            topic_id = req.params.tid,
            page = utils.getPage(req),
            model = {};
        async.waterfall([
            function (callback) {
                discussApi.getBoard(board_id, callback);
            },
            function (board, callback) {
                model.board = board;
                discussApi.getTopic(topic_id, callback);
            },
            function (topic, callback) {
                if (topic.board_id !== board_id) {
                    return callback(api.notFound('Topic'));
                }
                model.topic = topic;
                discussApi.getReplies(topic_id, page, callback);
            },
            function (r, callback) {
                model.replies = r.replies;
                model.page = r.page;
                var arr = model.replies.concat([model.topic]);
                userApi.bindUsers(arr, callback);
            }
        ], function (err, r) {
            if (err) {
                return next(err);
            }
            return processTheme('discuss/topic.html', model, req, res, next);
        });
    },

    'GET /discuss/topics/:topic_id/find/:reply_id': function (req, res, next) {
        discussApi.getReplyUrl(req.params.topic_id, req.params.reply_id, function (err, url) {
            if (err) {
                return next(err);
            }
            res.redirect(301, url);
        });
    },

    'GET /user/:id': function (req, res, next) {
        userApi.getUser(req.params.id, function (err, user) {
            if (err) {
                return next(err);
            }
            var model = {
                user: user
            };
            return processTheme('user/profile.html', model, req, res, next);
        });
    },

    'GET /search': function (req, res, next) {
        var
            page,
            q = req.query.q || '',
            type = req.query.type,
            opt = {};
        if (searchEngine.external) {
            return res.redirect(searchEngine.search(q));
        }
        console.log(JSON.stringify(searchTypeValues));
        if (!searchTypeValues[type]) {
            type = searchTypes[0].value;
        }
        if (type) {
            opt.filter = {
                field: 'type',
                value: type
            };
        }
        page = utils.getPage(req);
        opt.start = page.offset;
        opt.hit = page.itemsPerPage;

        searchEngine.search(q.replace(/\'/g, '').replace(/\"/g, ''), opt, function (err, r) {
            if (err) {
                return next(err);
            }
            if (r.status !== 'OK') {
                return res.send(500);
            }
            page.totalItems = r.result.total;
            var model = {
                searchTypes: searchTypes,
                type: type,
                page: page,
                q: q,
                results: r.result.items
            };
            return processTheme('search.html', model, req, res, next);
        });
    }
};
