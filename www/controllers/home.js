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

function* $getModel(model) {
    model.__navigations__ = yield $getNavigations();
    model.__website__ = yield settingApi.$getWebsiteSettings();
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
            article = yield articleApi.$getArticle(id, true),
            num = yield cache.$incr(id),
            category = yield categoryApi.$getCategory(article.category_id),
            model = {
                article: article,
                category: category
            };
        article.reads = num;
        article.content = helper.md2html(article.content, true);
        this.render(getView('article/article.html'), yield $getModel.apply(this, [model]));
    },

    'GET /webpage/:alias': function* (alias) {
        var
            webpage = yield webpageApi.$getWebpageByAlias(alias, true),
            model;
        if (webpage.draft) {
            this.throw(404);
        }
        webpage.content = helper.md2html(webpage.content, true);
        model = {
            webpage: webpage
        };
        this.render(getView('webpage/webpage.html'), yield $getModel.apply(this, [model]));
    },

    'GET /wikipage/:id': function* (id) {
        var wp = yield wikiApi.$getWikiPage(id);
        this.response.redirect('/wiki/' + wp.wiki_id + '/' + wp.id);
    },

    'GET /wiki/:id': function* (id) {
        var
            model,
            wiki = yield wikiApi.$getWiki(id, true),
            tree = yield wikiApi.$getWikiTree(wiki.id, true);
        wiki.content = helper.md2html(wiki.content, true);
        wiki.reads = yield cache.$incr(wiki.id);
        model = {
            wiki: wiki,
            current: wiki,
            tree: tree.children
        };
        this.render(getView('wiki/wiki.html'), yield $getModel.apply(this, [model]));
    },

    'GET /wiki/:wid/:pid': function* (id, pid) {
        var
            model, wiki, tree,
            wikipage = yield wikiApi.$getWikiPage(pid, true);
        if (wikipage.wiki_id !== id) {
            this.throw(404);
        }
        wiki = yield wikiApi.$getWiki(id);
        tree = yield wikiApi.$getWikiTree(id, true);
        wikipage.reads = yield cache.$incr(wikipage.id);
        wikipage.content = helper.md2html(wikipage.content, true);
        model = {
            wiki: yield wikiApi.$getWiki(id),
            current: wikipage,
            tree: tree.children
        };
        this.render(getView('wiki/wiki.html'), yield $getModel.apply(this, [model]));
    },

    'POST /:type/:id/comment': function* (type, id) {
        if (type === 'article') {
            //
        }
        else if (type === 'wiki') {
            //
        }
        else if (type === 'wikipage') {
            //
        }
        else {
            this.throw(404);
        }
    },

    'GET /discuss': function* () {
        var
            model,
            boards = yield discussApi.$getBoards();
        model = {
            boards: boards
        };
        this.render(getView('discuss/boards.html'), yield $getModel.apply(this, [model]));
    },

    'GET /discuss/:id': function* (id) {
        var
            page = helper.getPage(this.request, 10),
            board = yield discussApi.$getBoard(id),
            topics = yield discussApi.$getTopics(id, page),
            model;
        yield userApi.$bindUsers(topics);
        model = {
            page: page,
            board: board,
            topics: topics
        };
        this.render(getView('discuss/board.html'), yield $getModel.apply(this, [model]));
    },

    'GET /discuss/:bid/:tid': function* (bid, tid) {
        var
            topic = yield discussApi.$getTopic(tid),
            page,
            board,
            replies,
            model;
        if (topic.board_id !== bid) {
            this.throw(404);
        }
        page = helper.getPage(this.request, 10);
        board = yield discussApi.$getBoard(bid);
        replies = yield discussApi.$getReplies(tid, page);
        if (page.index === 1) {
            replies.unshift(topic);
        }
        yield userApi.$bindUsers(replies);
        model = {
            page: page,
            board: board,
            topic: topic,
            replies: replies
        };
        this.render(getView('discuss/topic.html'), yield $getModel.apply(this, [model]));
    },

    'GET /discuss/:id/topics/create': function (req, res, next) {
        discussApi.getBoard(req.params.id, function (err, board) {
            if (err) {
                return next(err);
            }
            return processTheme('discuss/topic_form.html', { board: board }, req, res, next);
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

    'GET /user/:id': function* (id) {
        var
            user = yield userApi.$getUser(id),
            model = {
                user: user
            };
        this.render(getView('user/profile.html'), yield $getModel.apply(this, [model]));
    },

    'GET /me/profile': function* (id) {
        var
            user = this.request.user,
            model = {
                user: user
            };
        if (user === null) {
            this.response.redirect('/auth/signin');
            return;
        }
        this.render(getView('user/profile.html'), yield $getModel.apply(this, [model]));
    },

    'GET /auth/signin': function* (id) {
        var
            user = this.request.user;
        if (user !== null) {
            //
        }
        this.render(getView('signin.html'), yield $getModel.apply(this, [{}]));
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
