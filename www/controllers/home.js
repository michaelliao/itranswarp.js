'use strict';

/**
 * UI controller.
 * 
 * author: Michael Liao
 */
var
    _ = require('lodash'),
    api = require('../api'),
    db = require('../db'),
    md = require('../md'),
    auth = require('../auth'),
    config = require('../config'),
    cache = require('../cache'),
    helper = require('../helper'),
    logger = require('../logger'),
    constants = require('../constants'),
    searchEngine = require('../search/search').engine;

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

var
    WRITE_VIEWS_BACK = 100,
    THEME = config.theme,
    PRODUCTION = process.productionMode;

async function getNavigations() {
    return await cache.get(constants.cache.NAVIGATIONS, navigationApi.getNavigations);
};

async function getModel(model) {
    model.__production__ = PRODUCTION;
    model.__navigations__ = await getNavigations();
    model.__website__ = await settingApi.getWebsiteSettings();
    model.__snippets__ = await settingApi.getSnippets();
    model.__signins__ = signins;
    return model;
}

async function updateEntityViews(entity) {
    console.log('Update views to: ' + entity.views);
    await cache.set(entity.id, 0);
    await entity.update(['views']);
}

function getView(view) {
    return 'themes/default/' + view;
}

async function getIndexModel() {
    var
        i, a, hotArticles,
        categories = await categoryApi.getCategories(),
        recentArticles = await articleApi.getRecentArticles(20),
        nums = await cache.counts(_.map(recentArticles, function (a) {
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

    'GET /': async (ctx, next) => {
        var model = await cache.get('INDEX-MODEL', getIndexModel);
        ctx.render('index.html', await getModel(model));
    },

    'GET /category/:id': async (ctx, next) => {
        var
            a,
            page = helper.getPage(this.request, 10),
            model = {
                page: page,
                category: await categoryApi.getCategory(id),
                articles: await articleApi.getArticlesByCategory(id, page)
            },
            nums = await cache.counts(_.map(model.articles, function (a) {
                return a.id;
            })),
            i;
        for (i = 0; i < nums.length; i++) {
            a = model.articles[i];
            a.views = a.views + nums[i];
        }
        ctx.render('article/category.html', await getModel(model));
    },

    'GET /article/:id': async (ctx, next) => {
        var
            article = await articleApi.getArticle(id, true),
            num = await cache.incr(id),
            category = await categoryApi.getCategory(article.category_id),
            model = {
                article: article,
                category: category
            };
        article.views = article.views + num;
        if (num > WRITE_VIEWS_BACK) {
            await updateEntityViews(article);
        }
        article.content = md.systemMarkdownToHtml(article.content);
        this.render(getView('article/article.html'), await getModel(model));
    },

    'GET /webpage/:alias': async (ctx, next) => {
        var
            webpage = await webpageApi.getWebpageByAlias(alias, true),
            model;
        if (webpage.draft) {
            ctx.response.status = 404;
            return;
        }
        webpage.content = md.systemMarkdownToHtml(webpage.content);
        model = {
            webpage: webpage
        };
        ctx.render('webpage/webpage.html', await getModel(model));
    },

    'GET /wikipage/:id': async (ctx, next) => {
        var wp = await wikiApi.getWikiPage(id);
        ctx.response.redirect('/wiki/' + wp.wiki_id + '/' + wp.id);
    },

    'GET /wiki/:id': async (ctx, next) => {
        var
            model,
            wiki = await wikiApi.getWiki(id, true),
            num = await cache.incr(wiki.id),
            tree = await wikiApi.getWikiTree(wiki.id, true);
        wiki.type = 'wiki';
        wiki.content = md.systemMarkdownToHtml(wiki.content, true);
        wiki.views = wiki.views + num;
        if (num > WRITE_VIEWS_BACK) {
            await updateEntityViews(wiki);
        }
        model = {
            wiki: wiki,
            current: wiki,
            tree: tree.children
        };
        ctx.render('wiki/wiki.html', await getModel(model));
    },

    'GET /wiki/:wid/:pid': async (ctx, next) => {
        var
            model, wiki, tree, num,
            wikipage = await wikiApi.getWikiPage(pid, true);
        if (wikipage.wiki_id !== id) {
            this.throw(404);
        }
        num = await cache.incr(wikipage.id);
        wiki = await wikiApi.getWiki(id);
        tree = await wikiApi.getWikiTree(id, true);
        wikipage.type = 'wikipage';
        wikipage.views = wikipage.views + num;
        if (num > WRITE_VIEWS_BACK) {
            await updateEntityViews(wikipage);
        }
        wikipage.content = helper.md2html(wikipage.content, true);
        model = {
            wiki: await wikiApi.getWiki(id),
            current: wikipage,
            tree: tree.children
        };
        ctx.render('wiki/wiki.html', await getModel(model));
    },

    'POST /api/comments/:ref_type/:ref_id': async (ctx, next) => {
        ctx.checkPermission(constants.role.SUBSCRIBER);
        ctx.validate('createComment');
        let
            ref_type = ctx.request.params.ref_type,
            ref_id = ctx.request.params.ref_id,
            board,
            user = ctx.state.__user__,
            data = ctx.request.body;
        if (!data.content.trim()) {
            throw api.invalidParam('content', 'Empty input.');
        }
        if (ref_type === 'article') {
            await articleApi.getArticle(ref_id);
        }
        else if (ref_type === 'wiki') {
            await wikiApi.getWiki(ref_id);
        }
        else if (ref_type === 'wikipage') {
            await wikiApi.getWikiPage(ref_id);
        }
        else {
            throw api.invalidParam('ref_type', 'Invalid type.');
        }
        board = await discussApi.getBoardByTag(data.tag);
        ctx.rest(await discussApi.createTopic(user, board.id, ref_type, ref_id, data));
    },

    'GET /discuss': async (ctx, next) => {
        var
            model,
            boards = await discussApi.getBoards();
        model = {
            boards: boards
        };
        ctx.render('discuss/boards.html', await getModel(model));
    },

    'GET /discuss/:id': async (ctx, next) => {
        var
            page = helper.getPage(ctx.request),
            board = await discussApi.getBoard(id),
            topics = await discussApi.getTopics(id, page),
            model;
        await userApi.bindUsers(topics);
        model = {
            page: page,
            board: board,
            topics: topics
        };
        ctx.render('discuss/board.html', await getModel(model));
    },

    'GET /discuss/:bid/:tid': async (ctx, next) => {
        var
            topic = await discussApi.getTopic(tid),
            page,
            board,
            replies,
            model;
        if (topic.board_id !== bid) {
            ctx.response.status = 404;
            return;
        }
        page = helper.getPage(ctx.request);
        board = await discussApi.getBoard(bid);
        replies = await discussApi.getReplies(tid, page);
        if (page.index === 1) {
            replies.unshift(topic);
        }
        await userApi.bindUsers(replies);
        model = {
            page: page,
            board: board,
            topic: topic,
            replies: replies
        };
        this.render('discuss/topic.html', await getModel(model));
    },

    'GET /discuss/:bid/topics/create': async (ctx, next) => {
        if (ctx.state.__user__ === null) {
            ctx.response.redirect('/auth/signin');
            return;
        }
        var
            board = await discussApi.getBoard(bid),
            model = {
                board: board
            };
        ctx.render('discuss/topic_form.html', await getModel(model));
    },

    'GET /discuss/topic/:tid/find/:rid': async (ctx, next) => {
        var
            topic = await discussApi.getTopic(tid),
            p = await discussApi.getReplyPageIndex(tid, rid);
        ctx.response.redirect('/discuss/' + topic.board_id + '/' + tid + '?page=' + p + '#' + rid);
    },

    'GET /user/:id': async (ctx, next) => {
        var
            user = await userApi.getUser(id),
            model = {
                user: user
            };
        ctx.render('user/profile.html', await getModel(model));
    },

    'GET /me/profile': async (ctx, next) => {
        var
            user = this.request.user,
            model = {
                user: user
            };
        if (user === null) {
            ctx.response.redirect('/auth/signin');
            return;
        }
        ctx.render('user/profile.html', await getModel(model));
    },

    'GET /auth/signin': async (ctx, next) => {
        var
            referer = ctx.request.get('referer') || '/',
            user = ctx.state.__user__;
        logger.info('Referer: ' + referer);
        if (user !== null) {
            
        }
        ctx.render('signin.html', await getModel({}));
    },

    'GET /search': async (ctx, next) => {
        ctx.response.body = 'blank';
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
