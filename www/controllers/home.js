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
    signins = _.reduce(config.oauth2, function (results, conf, oauthId) {
        results.push({
            id: oauthId,
            icon: conf.icon,
            name: conf.name
        });
        return results;
    }, []);

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

var
    WRITE_VIEWS_BACK = 10,
    THEME = config.theme,
    PRODUCTION = process.productionMode;

function* $getModel(model) {
    model.__production__ = PRODUCTION;
    model.__navigations__ = yield $getNavigations();
    model.__website__ = yield settingApi.$getWebsiteSettings();
    model.__snippets__ = yield settingApi.$getSnippets();
    model.__signins__ = signins;
    return model;
}

function* $updateEntityViews(entity) {
    console.log('Update views to: ' + entity.views);
    yield cache.$set(entity.id, 0);
    yield entity.$update(['views']);
}

function getView(view) {
    return 'themes/default/' + view;
}

function* getIndexModel() {
    var
        i, a, hotArticles,
        categories = yield categoryApi.$getCategories(),
        recentArticles = yield articleApi.$getRecentArticles(20),
        nums = yield cache.$counts(_.map(recentArticles, function (a) {
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
    for (i = 0; i < recentArticles.length; i++) {
        a = recentArticles[i];
        a.views = a.views + nums[i];
    }
    hotArticles = _.take(_.sortBy(recentArticles, function (a) {
        return 0 - a.views;
    }), 5);
    return {
        recentArticles: recentArticles,
        hotArticles: hotArticles
    };
}

module.exports = {

    'GET /': function* () {
        var model = yield cache.$get('INDEX-MODEL', getIndexModel);
        this.render(getView('index.html'), yield $getModel.apply(this, [model]));
    },

    'GET /category/:id': function* (id) {
        var
            a,
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
            a = model.articles[i];
            a.views = a.views + nums[i];
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
        article.views = article.views + num;
        if (num > WRITE_VIEWS_BACK) {
            yield $updateEntityViews(article);
        }
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
            num = yield cache.$incr(wiki.id),
            tree = yield wikiApi.$getWikiTree(wiki.id, true);
        wiki.type = 'wiki';
        wiki.content = helper.md2html(wiki.content, true);
        wiki.views = wiki.views + num;
        if (num > WRITE_VIEWS_BACK) {
            yield $updateEntityViews(wiki);
        }
        model = {
            wiki: wiki,
            current: wiki,
            tree: tree.children
        };
        this.render(getView('wiki/wiki.html'), yield $getModel.apply(this, [model]));
    },

    'GET /wiki/:wid/:pid': function* (id, pid) {
        var
            model, wiki, tree, num,
            wikipage = yield wikiApi.$getWikiPage(pid, true);
        if (wikipage.wiki_id !== id) {
            this.throw(404);
        }
        num = yield cache.$incr(wikipage.id);
        wiki = yield wikiApi.$getWiki(id);
        tree = yield wikiApi.$getWikiTree(id, true);
        wikipage.type = 'wikipage';
        wikipage.views = wikipage.views + num;
        if (num > WRITE_VIEWS_BACK) {
            yield $updateEntityViews(wikipage);
        }
        wikipage.content = helper.md2html(wikipage.content, true);
        model = {
            wiki: yield wikiApi.$getWiki(id),
            current: wikipage,
            tree: tree.children
        };
        this.render(getView('wiki/wiki.html'), yield $getModel.apply(this, [model]));
    },

    'POST /api/comments/:ref_type/:ref_id': function* (ref_type, ref_id) {
        helper.checkPermission(this.request, constants.role.SUBSCRIBER);
        var
            board,
            user = this.request.user,
            data = this.request.body;
        json_schema.validate('createComment', data);
        if (!data.content.trim()) {
            throw api.invalidParam('content', 'Empty input.');
        }
        if (ref_type === 'article') {
            yield articleApi.$getArticle(ref_id);
        }
        else if (ref_type === 'wiki') {
            yield wikiApi.$getWiki(ref_id);
        }
        else if (ref_type === 'wikipage') {
            yield wikiApi.$getWikiPage(ref_id);
        }
        else {
            this.throw(404);
        }
        board = yield discussApi.$getBoardByTag(data.tag);
        this.body = yield discussApi.$createTopic(user, board.id, ref_type, ref_id, data);
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

    'GET /discuss/:bid/topics/create': function* (bid) {
        if (this.request.user === null) {
            this.response.redirect('/auth/signin');
            return;
        }
        var
            board = yield discussApi.$getBoard(bid),
            model = {
                board: board
            };
        this.render(getView('discuss/topic_form.html'), yield $getModel.apply(this, [model]));
    },

    'GET /discuss/topic/:tid/find/:rid': function* (tid, rid) {
        var
            topic = yield discussApi.$getTopic(tid),
            p = yield discussApi.$getReplyPageIndex(tid, rid);
        this.response.redirect('/discuss/' + topic.board_id + '/' + tid + '?page=' + p + '#' + rid);
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
            referer = this.request.get('referer') || '/',
            user = this.request.user;
        console.log('Referer: ' + referer);
        if (user !== null) {
            
        }
        this.render(getView('signin.html'), yield $getModel.apply(this, [{}]));
    },

    'GET /search': function* () {
        this.body = 'blank';
        // var
        //     page,
        //     q = req.query.q || '',
        //     type = req.query.type,
        //     opt = {};
        // if (searchEngine.external) {
        //     return res.redirect(searchEngine.search(q));
        // }
        // console.log(JSON.stringify(searchTypeValues));
        // if (!searchTypeValues[type]) {
        //     type = searchTypes[0].value;
        // }
        // if (type) {
        //     opt.filter = {
        //         field: 'type',
        //         value: type
        //     };
        // }
        // page = utils.getPage(req);
        // opt.start = page.offset;
        // opt.hit = page.itemsPerPage;

        // searchEngine.search(q.replace(/\'/g, '').replace(/\"/g, ''), opt, function (err, r) {
        //     if (err) {
        //         return next(err);
        //     }
        //     if (r.status !== 'OK') {
        //         return res.send(500);
        //     }
        //     page.totalItems = r.result.total;
        //     var model = {
        //         searchTypes: searchTypes,
        //         type: type,
        //         page: page,
        //         q: q,
        //         results: r.result.items
        //     };
        //     return processTheme('search.html', model, req, res, next);
        // });
    }
};
