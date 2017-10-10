'use strict';

// article api

const
    _ = require('lodash'),
    api = require('../api'),
    db = require('../db'),
    md = require('../md'),
    cache = require('../cache'),
    logger = require('../logger'),
    helper = require('../helper'),
    config = require('../config'),
    constants = require('../constants'),
    search = require('../search/search'),
    User = db.User,
    Article = db.Article,
    Category = db.Category,
    Text = db.Text,
    nextId = db.nextId,
    textApi = require('./textApi'),
    settingApi = require('./settingApi'),
    categoryApi = require('./categoryApi'),
    attachmentApi = require('./attachmentApi');

function indexArticle(r) {
    // process.nextTick(() => {
    //     search.engine.index({
    //         type: 'article',
    //         id: r.id,
    //         tags: r.tags,
    //         name: r.name,
    //         description: r.description,
    //         content: md.htmlToText(md.systemMarkdownToHtml(r.content)),
    //         created_at: r.publish_at,
    //         updated_at: r.updated_at,
    //         url: '/article/' + r.id,
    //         upvotes: 0
    //     });
    // });
}

function unindexArticle(r) {
    process.nextTick(() => {
        search.engine.unindex({
            id: r.id
        });
    });
}

// get recent published articles:
async function getRecentArticles(max) {
    // where publish_at < ? order by publish_at desc limit ?
    return await Article.findAll({
        where: {
            publish_at: {
                $lt: Date.now()
            }
        },
        order: 'publish_at DESC',
        limit: max
    });
}

async function getArticles(page, includeUnpublished=false) {
    let opt = includeUnpublished ? {} : {
        where: {
            publish_at: {
                $lt: Date.now()
            }
        }
    };
    page.total = await Article.count(opt);
    if (page.isEmpty) {
        return [];
    }
    opt.offset = page.offset;
    opt.limit = page.limit;
    opt.order = 'publish_at DESC';
    return await Article.findAll(opt);
}

async function getArticlesByCategory(categoryId, page) {
    let now = Date.now();
    page.total = await Article.count({
        where: {
            publish_at: {
                $lt: now
            },
            category_id: categoryId
        }
    });
    if (page.isEmpty) {
        return [];
    }
    return await Article.findAll({
        where: {
            publish_at: {
                $lt: now
            },
            category_id: categoryId
        },
        order: 'publish_at DESC',
        offset: page.offset,
        limit: page.limit
    });
}

async function getArticle(id, includeContent) {
    let article = await Article.findById(id);
    if (article === null) {
        throw api.notFound('Article');
    }
    if (includeContent) {
        let text = await Text.findById(article.content_id);
        if (text === null) {
            throw api.notFound('Text');
        }
        article.content = text.value;
    }
    return article;
}

function _toRssDate(dt) {
    return new Date(dt).toGMTString();
}

async function _getFeed(domain) {
    logger.info('generate rss...');
    let
        url_prefix = (config.session.https ? 'https://' : 'http://') + domain + '/article/',
        articles = await getRecentArticles(20),
        last_publish_at = articles.length === 0 ? 0 : articles[0].publish_at,
        website = await settingApi.getWebsiteSettings(),
        rss = [];
    rss.push('<?xml version="1.0"?>\n');
    rss.push('<rss version="2.0"><channel><title><![CDATA[');
    rss.push(website.name);
    rss.push(']]></title><link>http://');
    rss.push(domain);
    rss.push('/</link><description><![CDATA[');
    rss.push(website.description);
    rss.push(']]></description><lastBuildDate>');
    rss.push(_toRssDate(last_publish_at));
    rss.push('</lastBuildDate><generator>iTranswarp.js</generator><ttl>3600</ttl>');
    for (let i=0; i<articles.length; i++) {
        let
            article = articles[i],
            text = await Text.findById(article.content_id),
            url = url_prefix + article.id;
        rss.push('<item><title><![CDATA[');
        rss.push(article.name);
        rss.push(']]></title><link>');
        rss.push(url);
        rss.push('</link><guid>');
        rss.push(url);
        rss.push('</guid><author><![CDATA[');
        rss.push(article.user_name);
        rss.push(']]></author><pubDate>');
        rss.push(_toRssDate(article.publish_at));
        rss.push('</pubDate><description><![CDATA[');
        rss.push(md.systemMarkdownToHtml(text.value));
        rss.push(']]></description></item>');
    }
    rss.push('</channel></rss>');
    return rss.join('');
}

module.exports = {

    getRecentArticles: getRecentArticles,

    getArticlesByCategory: getArticlesByCategory,

    getArticles: getArticles,

    getArticle: getArticle,

    'GET /feed': async (ctx, next) => {
        ctx.response.redirect('/feed/articles');
    },

    'GET /feed/articles': async (ctx, next) => {
        let rss = await cache.get(constants.cache.ARTICLE_FEED, async () => {
            return await _getFeed(ctx.request.host);
        });
        ctx.response.set('Cache-Control', 'max-age: 3600');
        ctx.response.type = 'text/xml';
        ctx.response.body = rss;
    },

    'GET /api/articles/:id': async function (ctx, next) {
        /**
         * Get article.
         * 
         * @name Get Article
         * @param {string} id: Id of the article.
         * @param {string} [format]: Return html if format is 'html', default to '' (raw).
         * @return {object} Article object.
         * @error {resource:notfound} Article was not found by id.
         */
        let
            id = ctx.params.id,
            user = ctx.state.__user__,
            article = await getArticle(id, true);
        if (article.publish_at > Date.now() && (user === null || user.role > constants.role.CONTRIBUTOR)) {
            throw api.notFound('Article');
        }
        if (ctx.request.query.format === 'html') {
            article.content = helper.md2html(article.content, true);
        }
        ctx.rest(article);
    },

    'GET /api/articles': async function (ctx, next) {
        /**
         * Get articles by page.
         * 
         * @name Get Articles
         * @param {number} [page=1]: The page number, starts from 1.
         * @return {object} Article objects and page information.
         */
        let
            user = ctx.state.__user__,
            includeUnpublished = (user !== null) && (user.role <= constants.role.EDITOR),
            page = helper.getPage(ctx.request),
            articles = await getArticles(page, includeUnpublished);
        ctx.rest({
            page: page,
            articles: articles
        });
    },

    'POST /api/articles': async (ctx, next) => {
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
         * @param {image} [image]: Base64 encoded image to upload as cover image.
         * @return {object} The created article object.
         * @error {parameter:invalid} If some parameter is invalid.
         * @error {permission:denied} If current user has no permission.
         */
        ctx.checkPermission(constants.role.EDITOR);
        ctx.validate('createArticle');
        let
            user = ctx.state.__user__,
            article_id = nextId(),
            content_id = nextId(),
            data = ctx.request.body;
        // check category id:
        await categoryApi.getCategory(data.category_id);
        // create image:
        let attachment = await attachmentApi.createAttachment(
            user.id,
            data.name.trim(),
            data.description.trim(),
            new Buffer(data.image, 'base64'),
            null,
            true);
        // create text:
        await textApi.createText(article_id, content_id, data.content);
        // create article:
        let article = await Article.create({
            id: article_id,
            user_id: user.id,
            user_name: user.name,
            category_id: data.category_id,
            cover_id: attachment.id,
            content_id: content_id,
            name: data.name.trim(),
            description: data.description.trim(),
            tags: helper.formatTags(data.tags),
            publish_at: (data.publish_at === undefined ? Date.now() : data.publish_at)
        });
        // associate content:
        article.content = data.content;
        // index:
        indexArticle(article);
        ctx.rest(article);
    },

    'POST /api/articles/:id': async (ctx, next) => {
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
        ctx.checkPermission(constants.role.EDITOR);
        ctx.validate('updateArticle');
        let
            id = ctx.params.id,
            user = ctx.state.__user__,
            data = ctx.request.body,
            article = await getArticle(id);
        if (user.role !== constants.role.ADMIN && user.id !== article.user_id) {
            throw api.notAllowed('Permission denied.');
        }
        if (data.category_id) {
            await categoryApi.getCategory(data.category_id);
            article.category_id = data.category_id;
        }
        if (data.name) {
            article.name = data.name.trim();
        }
        if (data.description) {
            article.description = data.description.trim();
        }
        if (data.tags) {
            article.tags = helper.formatTags(data.tags);
        }
        if (data.publish_at !== undefined) {
            article.publish_at = data.publish_at;
        }
        if (data.image) {
            // check image:
            let attachment = await attachmentApi.createAttachment(
                user.id,
                article.name,
                article.description,
                new Buffer(data.image, 'base64'),
                null,
                true);
            article.cover_id = attachment.id;
        }
        if (data.content) {
            let content_id = nextId();
            await textApi.createText(article.id, content_id, data.content);
            article.content_id = content_id;
        }
        await article.save();
        // attach content:
        if (data.content) {
            article.content = data.content;
        } else {
            let text = await Text.findById(article.content_id);
            article.content = text.value;
        }
        ctx.rest(article);
    },

    'POST /api/articles/:id/delete': async (ctx, next) => {
        /**
         * Delete an article.
         * 
         * @name Delete Article
         * @param {string} id: Id of the article.
         * @return {object} Object contains deleted id.
         * @error {resource:notfound} Article not found by id.
         * @error {permission:denied} If current user has no permission.
         */
        ctx.checkPermission(constants.role.EDITOR);
        let
            id = ctx.params.id,
            user = ctx.state.__user__,
            article = await getArticle(id);
        if ((user.role > constants.role.ADMIN) && (user.id !== article.user_id)) {
            throw api.notAllowed('Permission denied.');
        }
        await article.destroy();
        await Text.destroy({
            where: {
                'ref_id': id
            }
        });
        ctx.rest({ id: id });
    }
};
