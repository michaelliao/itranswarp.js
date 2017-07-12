'use strict';

/**
 * UI controller.
 * 
 * author: Michael Liao
 */
const
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
    searchEngine = require('../search/search').engine,
    userApi = require('./userApi'),
    wikiApi = require('./wikiApi'),
    settingApi = require('./settingApi'),
    discussApi = require('./discussApi'),
    webpageApi = require('./webpageApi'),
    articleApi = require('./articleApi'),
    categoryApi = require('./categoryApi'),
    navigationApi = require('./navigationApi'),
    User = db.User,
    Article = db.Article,
    Category = db.Category,
    Text = db.Text;

let
    signins = _.reduce(config.oauth2, function (results, conf, oauthId) {
        results.push({
            id: oauthId,
            icon: conf.icon,
            name: conf.name
        });
        return results;
    }, []);

let
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

let
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
    logger.info('Update views to: ' + entity.views);
    await cache.set(entity.id, 0);
    await entity.update(['views']);
}

async function getIndexModel() {
    let
        hotArticles,
        categories = await categoryApi.getCategories(),
        recentArticles = await articleApi.getRecentArticles(10),
        recentTopics = await discussApi.getRecentTopics(20),
        nums = await cache.counts(_.map(recentArticles, function (a) {
            return a.id;
        })),
        getCategoryName = function (cid) {
            let c, i;
            for (i = 0; i < categories.length; i++) {
                c = categories[i];
                if (c.id === cid) {
                    return c.name;
                }
            }
            return '';
        };
    for (let i = 0; i < recentArticles.length; i++) {
        let a = recentArticles[i];
        a.views = a.views + nums[i];
    }
    hotArticles = _.take(_.sortBy(recentArticles, function (a) {
        return 0 - a.views;
    }), 3);
    return {
        recentArticles: recentArticles,
        recentTopics: recentTopics,
        hotArticles: hotArticles
    };
}

module.exports = {

    'GET /404': async (ctx, next) => {
        ctx.render('404.html', await getModel({}));
    },

    'GET /': async (ctx, next) => {
        let model = await cache.get('INDEX-MODEL', getIndexModel);
        ctx.render('index.html', await getModel(model));
    },

    'GET /category/:id': async (ctx, next) => {
        let
            id = ctx.params.id,
            page = helper.getPage(ctx.request),
            model = {
                page: page,
                category: await categoryApi.getCategory(id),
                articles: await articleApi.getArticlesByCategory(id, page)
            },
            nums = await cache.counts(_.map(model.articles, function (a) {
                return a.id;
            }));
        for (let i = 0; i < nums.length; i++) {
            let a = model.articles[i];
            a.views = a.views + nums[i];
        }
        ctx.render('article/category.html', await getModel(model));
    },

    'GET /article/:id': async (ctx, next) => {
        let
            id = ctx.params.id,
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
        ctx.render('article/article.html', await getModel(model));
    },

    'GET /webpage/:alias': async (ctx, next) => {
        let
            alias = ctx.params.alias,
            webpage = await webpageApi.getWebpageByAliasWithContent(alias);
        if (webpage.draft) {
            ctx.response.status = 404;
            return;
        }
        webpage.content = md.systemMarkdownToHtml(webpage.content);
        ctx.render('webpage/webpage.html', await getModel({
            webpage: webpage
        }));
    },

    'GET /wikipage/:id': async (ctx, next) => {
        let
            id = ctx.params.id,
            wp = await wikiApi.getWikiPage(id);
        ctx.response.redirect('/wiki/' + wp.wiki_id + '/' + wp.id);
    },

    'GET /wiki/:id': async (ctx, next) => {
        let
            id = ctx.params.id,
            wiki = await wikiApi.getWiki(id, true),
            num = await cache.incr(wiki.id),
            tree = await wikiApi.getWikiTree(wiki.id, true);
        wiki.type = 'wiki';
        wiki.content = md.systemMarkdownToHtml(wiki.content, true);
        wiki.views = wiki.views + num;
        if (num > WRITE_VIEWS_BACK) {
            await updateEntityViews(wiki);
        }
        ctx.render('wiki/wiki.html', await getModel({
            wiki: wiki,
            current: wiki,
            tree: tree.children
        }));
    },

    'GET /wiki/:wid/:pid': async (ctx, next) => {
        let
            wid = ctx.params.wid,
            pid = ctx.params.pid,
            wiki, tree, num,
            wikipage = await wikiApi.getWikiPage(pid, true);
        if (wikipage.wiki_id !== wid) {
            ctx.status = 404;
            return;
        }
        num = await cache.incr(wikipage.id);
        wiki = await wikiApi.getWiki(wid);
        tree = await wikiApi.getWikiTree(wid, true);
        wikipage.type = 'wikipage';
        wikipage.views = wikipage.views + num;
        if (num > WRITE_VIEWS_BACK) {
            await updateEntityViews(wikipage);
        }
        wikipage.content = md.systemMarkdownToHtml(wikipage.content, true);
        ctx.render('wiki/wiki.html', await getModel({
            wiki: wiki,
            current: wikipage,
            tree: tree.children
        }));
    },

    'POST /api/comments/:ref_type/:ref_id': async (ctx, next) => {
        ctx.checkPermission(constants.role.SUBSCRIBER);
        ctx.validate('createComment');
        let
            board,
            ref_type = ctx.params.ref_type,
            ref_id = ctx.params.ref_id,
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
        let boards = await discussApi.getBoards();
        ctx.render('discuss/boards.html', await getModel({
            boards: boards
        }));
    },

    'GET /discuss/:id': async (ctx, next) => {
        let
            id = ctx.params.id,
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
        let
            bid = ctx.params.bid,
            tid = ctx.params.tid,
            topic = await discussApi.getTopic(tid),
            board,
            replies,
            model;
        if (topic.board_id !== bid) {
            ctx.response.status = 404;
            return;
        }
        let page = helper.getPage(ctx.request);
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
        ctx.render('discuss/topic.html', await getModel(model));
    },

    'GET /discuss/:bid/topics/create': async (ctx, next) => {
        if (ctx.state.__user__ === null) {
            ctx.response.redirect('/auth/signin');
            return;
        }
        let
            bid = ctx.params.bid,
            board = await discussApi.getBoard(bid),
            model = {
                board: board
            };
        ctx.render('discuss/topic_form.html', await getModel(model));
    },

    'GET /discuss/topic/:tid/find/:rid': async (ctx, next) => {
        let
            tid = ctx.params.tid,
            rid = ctx.params.rid,
            topic = await discussApi.getTopic(tid),
            p = await discussApi.getReplyPageIndex(tid, rid);
        ctx.response.redirect(`/discuss/${topic.board_id}/${tid}?page=${p}#${rid}`);
    },

    'GET /user/:id': async (ctx, next) => {
        let
            id = ctx.params.id,
            user = await userApi.getUser(id),
            model = {
                user: user
            };
        ctx.render('user/profile.html', await getModel(model));
    },

    'GET /me/profile': async (ctx, next) => {
        let
            user = ctx.state.__user__,
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
        let
            referer = ctx.request.get('referer') || '/',
            user = ctx.state.__user__;
        logger.info('Referer: ' + referer);
        if (user !== null) {
            
        }
        ctx.render('signin.html', await getModel({}));
    },

    'GET /search': async (ctx, next) => {
        ctx.response.body = 'blank';
        // let
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
        //     let model = {
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
